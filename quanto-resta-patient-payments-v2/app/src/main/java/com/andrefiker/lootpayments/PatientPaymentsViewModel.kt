package com.andrefiker.lootpayments

import android.app.Application
import android.content.Context
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
    private val owner = MutableStateFlow<String?>(null)
    private val selected = MutableStateFlow(YearMonth.now())
    val ready = owner.map { it != null }.stateIn(viewModelScope, SharingStarted.Eagerly, false)

    val state = combine(selected, owner) { month, id -> month to id }.flatMapLatest { (month, id) ->
        if (id == null) flowOf(ScreenState.empty(month))
        else flow {
            dao.ensureMonth(id, month)
            emitAll(combine(dao.patients(id), dao.months(id, month.key()),
                dao.monthsAllFlow(id)) { patients, months, allMonths ->
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

    init {
        viewModelScope.launch {
            val prefs = application.getSharedPreferences("loot-local-owner", Context.MODE_PRIVATE)
            val id = prefs.getString("id", null) ?: dao.firstOwner() ?: UUID.randomUUID().toString()
            check(prefs.edit().putString("id", id).commit()) { "Could not save local owner" }
            owner.value = id
        }
    }
    fun shiftMonth(delta: Long) { selected.value = selected.value.plusMonths(delta) }
    fun add(name: String, amount: Long, active: Boolean) {
        val idOwner = owner.value ?: return
        val month = selected.value
        viewModelScope.launch {
            val id = UUID.randomUUID().toString()
            val now = System.currentTimeMillis()
            dao.putPatient(Patient(id, idOwner, name.trim(), amount, active,
                if (active) null else month.key(), month.key(), now, now))
            dao.ensureMonth(idOwner, month)
        }
    }
    fun rename(id: String, name: String) {
        val owner = owner.value ?: return
        viewModelScope.launch {
            val patient = dao.patient(owner, id) ?: return@launch
            dao.putPatient(patient.copy(name = name.trim(), updatedAt = System.currentTimeMillis(),
                revision = patient.revision + 1, dirty = true))
        }
    }
    fun changeAmount(row: PatientRow, cents: Long) {
        val owner = owner.value ?: return
        val month = selected.value
        viewModelScope.launch { dao.changeDefault(owner, row.patient.id, month, cents) }
    }
    fun setPaid(row: PatientRow, paid: Long) {
        val owner = owner.value ?: return
        viewModelScope.launch {
            val existing = dao.month(owner, row.patient.id, row.payment.monthKey) ?: return@launch
            dao.putMonth(existing.copy(paidCents = paid, forceIncomplete = false,
                updatedAt = System.currentTimeMillis(), revision = existing.revision + 1, dirty = true))
        }
    }
    fun setFull(row: PatientRow, full: Boolean) {
        val owner = owner.value ?: return
        viewModelScope.launch {
            val existing = dao.month(owner, row.patient.id, row.payment.monthKey) ?: return@launch
            dao.putMonth(existing.copy(paidCents = if (full) existing.expectedCents else existing.paidCents,
                forceIncomplete = !full, updatedAt = System.currentTimeMillis(), revision = existing.revision + 1,
                dirty = true))
        }
    }
    fun setArchived(row: PatientRow, archive: Boolean) {
        val owner = owner.value ?: return
        val month = selected.value
        viewModelScope.launch { dao.setArchive(owner, row.patient.id, month, archive) }
    }
    fun delete(id: String) {
        val owner = owner.value ?: return
        viewModelScope.launch { dao.erasePatient(owner, id) }
    }
}
