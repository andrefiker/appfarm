package com.andrefiker.lootpayments

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.YearMonth
import java.util.UUID

/** The month row is the authoritative frozen fee for that month. */
data class EffectiveTerms(val expectedCents: Long, val active: Boolean)
data class PatientRow(val patient: Patient, val payment: PatientMonth, val hasHistory: Boolean) {
    val terms get() = EffectiveTerms(payment.expectedCents, payment.included)
    val line get() = MonthLine(payment.expectedCents, payment.paidCents, payment.included, payment.forceIncomplete)
}
data class ScreenState(val month: YearMonth, val rows: List<PatientRow>, val totals: Totals) {
    companion object { fun empty(month: YearMonth) = ScreenState(month, emptyList(), Totals(0, 0, 0)) }
}

@OptIn(ExperimentalCoroutinesApi::class)
class PatientPaymentsViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = PaymentsDatabase.get(application).dao()
    private val store = SessionStore(application)
    private val remote = RemoteApi(store)
    private val sync = SyncEngine(application, dao, store)
    private val selected = MutableStateFlow(YearMonth.now())
    val session = store.session.asStateFlow()
    val authMessage = MutableStateFlow<String?>(null)
    val syncStatus = SyncEngine.status.asStateFlow()

    val state = combine(selected, session) { month, session -> month to session }.flatMapLatest { (month, session) ->
        if (session == null) flowOf(ScreenState.empty(month))
        else flow {
            dao.ensureMonth(session.userId, month)
            sync.request()
            emitAll(combine(dao.patients(session.userId), dao.months(session.userId, month.key()),
                dao.monthsAllFlow(session.userId)) { patients, months, allMonths ->
                val byId = patients.associateBy { it.id }
                val history = allMonths.groupBy { it.patientId }
                val rows = months.mapNotNull { payment ->
                    byId[payment.patientId]?.let { patient -> PatientRow(patient, payment,
                        history[patient.id].orEmpty().any { it.monthKey < month.key() || it.paidCents > 0 }) }
                }.sortedWith(compareByDescending<PatientRow> { it.payment.included }.thenBy { it.patient.name.lowercase() })
                ScreenState(month, rows, PaymentRules.totals(rows.map { it.line }))
            })
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ScreenState.empty(selected.value))

    init { if (session.value != null) { sync.schedulePeriodic(); sync.request() } }
    fun shiftMonth(delta: Long) { selected.value = selected.value.plusMonths(delta) }
    fun signIn(email: String, password: String, register: Boolean) = viewModelScope.launch {
        authMessage.value = "Conectando…"
        try {
            if (register && !remote.signUp(email, password)) {
                authMessage.value = "Confira seu e-mail para confirmar a conta. Depois, entre aqui."
                return@launch
            }
            if (!register) remote.signIn(email, password)
            authMessage.value = null
            sync.schedulePeriodic(); sync.request()
        } catch (_: Exception) { authMessage.value = "Não foi possível entrar. Confira conexão, e-mail e senha." }
    }
    fun add(name: String, amount: Long, active: Boolean) {
        val session = session.value ?: return
        val month = selected.value
        viewModelScope.launch {
            val id = UUID.randomUUID().toString()
            val now = System.currentTimeMillis()
            dao.putPatient(Patient(id, session.userId, name.trim(), amount, active,
                if (active) null else month.key(), month.key(), now, now))
            dao.ensureMonth(session.userId, month)
            sync.request()
        }
    }
    fun rename(id: String, name: String) {
        val owner = session.value?.userId ?: return
        viewModelScope.launch {
            val patient = dao.patient(owner, id) ?: return@launch
            dao.putPatient(patient.copy(name = name.trim(), updatedAt = System.currentTimeMillis(),
                revision = patient.revision + 1, dirty = true)); sync.request()
        }
    }
    fun changeAmount(row: PatientRow, cents: Long) {
        val owner = session.value?.userId ?: return
        val month = selected.value
        viewModelScope.launch { dao.changeDefault(owner, row.patient.id, month, cents); sync.request() }
    }
    fun setPaid(row: PatientRow, paid: Long) {
        val owner = session.value?.userId ?: return
        viewModelScope.launch {
            val existing = dao.month(owner, row.patient.id, row.payment.monthKey) ?: return@launch
            dao.putMonth(existing.copy(paidCents = paid, forceIncomplete = false,
                updatedAt = System.currentTimeMillis(), revision = existing.revision + 1, dirty = true)); sync.request()
        }
    }
    fun setFull(row: PatientRow, full: Boolean) {
        val owner = session.value?.userId ?: return
        viewModelScope.launch {
            val existing = dao.month(owner, row.patient.id, row.payment.monthKey) ?: return@launch
            dao.putMonth(existing.copy(paidCents = if (full) existing.expectedCents else existing.paidCents,
                forceIncomplete = !full, updatedAt = System.currentTimeMillis(), revision = existing.revision + 1,
                dirty = true)); sync.request()
        }
    }
    fun setArchived(row: PatientRow, archive: Boolean) {
        val owner = session.value?.userId ?: return
        val month = selected.value
        viewModelScope.launch { dao.setArchive(owner, row.patient.id, month, archive); sync.request() }
    }
    fun delete(id: String) {
        val owner = session.value?.userId ?: return
        viewModelScope.launch { dao.erasePatient(owner, id); sync.request() }
    }
}
