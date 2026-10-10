package com.ghost.screentimewidget

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

// Device-protected: boot receiver can read settings before the first unlock.
private val Context.settingsDataStore by preferencesDataStore(name = "settings")
data class AppSettings(val instant: Boolean = true, val exclusions: Set<String> = emptySet(), val use24Hour: Boolean = true, val topN: Int = 5, val sleep: SleepWindow = SleepWindow(), val theme: String = "system")
class SettingsStore(context: Context) {
    private val defaultExclusions = AppCatalog.defaults(context)
    private val store = context.applicationContext.createDeviceProtectedStorageContext().settingsDataStore
    private val instant = booleanPreferencesKey("instant")
    private val excluded = stringSetPreferencesKey("excluded")
    private val time24 = booleanPreferencesKey("time24")
    private val sleepStart = intPreferencesKey("sleep_start")
    private val sleepEnd = intPreferencesKey("sleep_end")
    private val theme = stringPreferencesKey("theme")
    private val top = intPreferencesKey("top_n")
    val flow = store.data.map { AppSettings(it[instant] ?: true, it[excluded] ?: defaultExclusions, it[time24] ?: true, (it[top] ?: 5).coerceIn(1,5), SleepWindow((it[sleepStart] ?: 1380).coerceIn(0,1439),(it[sleepEnd] ?: 420).coerceIn(0,1439)), it[theme] ?: "system") }
    suspend fun sleep(value: SleepWindow) { store.edit { it[sleepStart] = value.startMinute; it[sleepEnd] = value.endMinute } }
    suspend fun theme(value: String) { store.edit { it[theme] = value } }
    suspend fun read() = flow.first()
    suspend fun instant(value: Boolean) { store.edit { it[instant] = value } }
    suspend fun exclusions(value: Set<String>) { store.edit { it[excluded] = value } }
    suspend fun time24(value: Boolean) { store.edit { it[time24] = value } }
    suspend fun top(value: Int) { store.edit { it[top] = value.coerceIn(1,5) } }
}
