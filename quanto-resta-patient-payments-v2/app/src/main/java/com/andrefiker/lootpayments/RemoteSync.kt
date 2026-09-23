package com.andrefiker.lootpayments

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import java.time.Instant
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Android Keystore AES-GCM protects refresh credentials at rest. No plaintext fallback. */
data class UserSession(val userId: String, val access: String, val refresh: String, val expiresAt: Long)
class SessionStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("qr-secure-session", Context.MODE_PRIVATE)
    private val alias = "qr-auth-token-v2"
    val session = MutableStateFlow(read())

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(KeyGenParameterSpec.Builder(alias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256).build())
        return generator.generateKey()
    }
    private fun read(): UserSession? = try {
        val encrypted = prefs.getString("data", null) ?: return null
        val bytes = Base64.decode(encrypted, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
        val json = JSONObject(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8))
        UserSession(json.getString("userId"), json.getString("access"), json.getString("refresh"), json.getLong("expiresAt"))
    } catch (_: Exception) { null }

    fun save(value: UserSession) {
        val json = JSONObject().put("userId", value.userId).put("access", value.access)
            .put("refresh", value.refresh).put("expiresAt", value.expiresAt)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val encrypted = cipher.iv + cipher.doFinal(json.toString().toByteArray(Charsets.UTF_8))
        if (!prefs.edit().putString("data", Base64.encodeToString(encrypted, Base64.NO_WRAP)).commit())
            throw IllegalStateException("Could not save login")
        session.value = value
    }
    /** Workers may rotate refresh tokens in another SessionStore instance. */
    fun latest(): UserSession? = read().also { if (it != null && it != session.value) session.value = it }
    fun clear() { prefs.edit().remove("data").commit(); session.value = null }
}

class RemoteApi(private val store: SessionStore) {
    private val base = BuildConfig.SUPABASE_URL
    private val publicKey = BuildConfig.SUPABASE_PUBLISHABLE_KEY
    private val client = OkHttpClient.Builder().connectTimeout(12, TimeUnit.SECONDS)
        .callTimeout(25, TimeUnit.SECONDS).build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    private suspend fun call(path: String, method: String = "GET", body: String? = null,
                             token: String? = null, prefer: String? = null, range: String? = null): String = withContext(Dispatchers.IO) {
        val request = Request.Builder().url(base + path).header("apikey", publicKey)
            .header("Accept", "application/json")
        if (token != null) request.header("Authorization", "Bearer $token")
        if (prefer != null) request.header("Prefer", prefer)
        if (range != null) request.header("Range", range)
        request.method(method, body?.toRequestBody(jsonType))
        client.newCall(request.build()).execute().use { response ->
            val result = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException("Server returned ${response.code}")
            result
        }
    }

    private fun sessionFrom(json: JSONObject): UserSession {
        val user = json.optJSONObject("user") ?: throw IllegalStateException("Confirm email, then sign in")
        val access = json.optString("access_token")
        val refresh = json.optString("refresh_token")
        if (access.isEmpty() || refresh.isEmpty()) throw IllegalStateException("Confirm email, then sign in")
        return UserSession(user.getString("id"), access, refresh,
            System.currentTimeMillis() + json.optLong("expires_in", 3600L) * 1000L)
    }
    suspend fun signIn(email: String, password: String): UserSession {
        val payload = JSONObject().put("email", email.trim()).put("password", password)
        val session = sessionFrom(JSONObject(call("/auth/v1/token?grant_type=password", "POST", payload.toString())))
        store.save(session)
        return session
    }
    suspend fun signUp(email: String, password: String): Boolean {
        val payload = JSONObject().put("email", email.trim()).put("password", password)
        val result = JSONObject(call("/auth/v1/signup", "POST", payload.toString()))
        val access = result.optString("access_token")
        if (access.isNotEmpty()) { store.save(sessionFrom(result)); return true }
        return false
    }
    suspend fun validSession(): UserSession? {
        val current = store.latest() ?: return null
        if (System.currentTimeMillis() < current.expiresAt - 90_000) return current
        val payload = JSONObject().put("refresh_token", current.refresh)
        val refreshed = sessionFrom(JSONObject(call("/auth/v1/token?grant_type=refresh_token", "POST", payload.toString())))
        store.save(refreshed)
        return refreshed
    }
    suspend fun upsert(table: String, json: JSONObject, token: String) {
        call("/rest/v1/$table?on_conflict=id", "POST", json.toString(), token,
            "resolution=merge-duplicates,return=minimal")
    }
    suspend fun all(table: String, token: String): List<JSONObject> {
        val rows = mutableListOf<JSONObject>()
        var start = 0
        while (true) {
            val page = JSONArray(call("/rest/v1/$table?select=*\u0026order=id.asc", token = token,
                range = "$start-${start + 999}"))
            for (i in 0 until page.length()) rows += page.getJSONObject(i)
            if (page.length() < 1000) break
            start += 1000
        }
        return rows
    }
}

class SyncEngine(private val context: Context, private val dao: PaymentsDao, private val store: SessionStore) {
    private val api = RemoteApi(store)
    companion object {
        private val mutex = Mutex()
        val status = MutableStateFlow("Local")
    }
    fun request() {
        val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        val work = OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(constraints).build()
        WorkManager.getInstance(context).enqueueUniqueWork("qr-sync", ExistingWorkPolicy.KEEP, work)
    }
    fun schedulePeriodic() {
        val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        val work = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES).setConstraints(constraints).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("qr-sync-periodic",
            androidx.work.ExistingPeriodicWorkPolicy.KEEP, work)
    }
    suspend fun runOnce(): Boolean = mutex.withLock {
        val session = try { api.validSession() } catch (_: Exception) { status.value = "Aguardando conexão"; return@withLock false }
            ?: return@withLock false
        val owner = session.userId
        status.value = "Sincronizando"
        try {
            // Remote deletions take precedence, so an old offline device cannot re-upload their months.
            for (json in api.all("qr_patients", session.access)) {
                if (!json.isNull("deleted_at")) {
                    val local = dao.patient(owner, json.getString("id"))
                    if (local != null && local.deletedAt == null) dao.erasePatient(owner, local.id)
                }
            }
            val patients = dao.allPatients(owner).filter { it.dirty }
            for (p in patients) {
                api.upsert("qr_patients", JSONObject().put("id", p.id).put("owner_user_id", owner)
                    .put("display_name", p.name).put("default_monthly_amount_cents", p.defaultCents)
                    .put("active", p.active).put("archived_from_month", p.archivedFromMonth ?: JSONObject.NULL)
                    .put("archived_at", if (p.archivedFromMonth == null) JSONObject.NULL else Instant.ofEpochMilli(p.updatedAt).toString())
                    .put("created_month", p.createdMonth)
                    .put("deleted_at", p.deletedAt?.let { Instant.ofEpochMilli(it).toString() } ?: JSONObject.NULL), session.access)
                dao.markPatientSynced(owner, p.id, p.revision)
            }
            for (m in dao.allMonths(owner).filter { it.dirty }) {
                api.upsert("qr_patient_months", JSONObject().put("id", m.id).put("owner_user_id", owner)
                    .put("patient_id", m.patientId).put("year", m.year).put("month", m.month)
                    .put("expected_amount_cents", m.expectedCents).put("paid_amount_cents", m.paidCents)
                    .put("included", m.included).put("force_incomplete", m.forceIncomplete), session.access)
                dao.markMonthSynced(owner, m.id, m.revision)
            }
            val remotePatients = api.all("qr_patients", session.access)
            val localPatients = dao.allPatients(owner).associateBy { it.id }
            for (json in remotePatients) {
                val id = json.getString("id")
                val local = localPatients[id]
                if (local?.dirty == true) continue
                val deleted = json.optString("deleted_at").takeIf { it.isNotBlank() && it != "null" }
                if (deleted != null) dao.deleteMonths(owner, id)
                dao.putPatient(Patient(id, owner, json.getString("display_name"),
                    json.getLong("default_monthly_amount_cents"), json.getBoolean("active"),
                    json.optInt("archived_from_month").takeIf { !json.isNull("archived_from_month") },
                    json.getInt("created_month"), local?.createdAt ?: System.currentTimeMillis(),
                    System.currentTimeMillis(), false, deleted?.let { Instant.parse(it).toEpochMilli() }, 0))
            }
            val remoteMonths = api.all("qr_patient_months", session.access)
            val localMonths = dao.allMonths(owner).associateBy { it.id }
            val remoteIds = HashSet<String>()
            for (json in remoteMonths) {
                val id = json.getString("id")
                remoteIds += id
                if (localMonths[id]?.dirty == true) continue
                val year = json.getInt("year")
                val month = json.getInt("month")
                dao.putMonth(PatientMonth(id, owner, json.getString("patient_id"), year * 12 + month,
                    year, month, json.getLong("expected_amount_cents"), json.getLong("paid_amount_cents"),
                    json.getBoolean("included"), json.getBoolean("force_incomplete"),
                    System.currentTimeMillis(), false, 0))
            }
            for (local in dao.allMonths(owner)) if (!local.dirty && local.id !in remoteIds)
                dao.deleteCleanMonth(owner, local.id)
            status.value = "Sincronizado"
            true
        } catch (_: Exception) { status.value = "Pendente · offline"; false }
    }
}

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val store = SessionStore(applicationContext)
        val success = SyncEngine(applicationContext, PaymentsDatabase.get(applicationContext).dao(), store).runOnce()
        return if (success || store.session.value == null) Result.success() else Result.retry()
    }
}
