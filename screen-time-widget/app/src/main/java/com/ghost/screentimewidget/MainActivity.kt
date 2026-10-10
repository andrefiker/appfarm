package com.ghost.screentimewidget

import android.Manifest
import android.appwidget.AppWidgetManager
import android.content.*
import android.content.pm.PackageManager
import android.net.Uri
import android.os.*
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.text.SimpleDateFormat
import java.util.Locale

private val Green = Color(0xFF27745D)
private val Pale = Color(0xFFF3F6F4)
class MainActivity: ComponentActivity() {
    private var data by mutableStateOf<Snapshot?>(null)
    private var settings by mutableStateOf(AppSettings())
    private var ranked by mutableStateOf<List<RankedApp>>(emptyList())
    private var installed by mutableStateOf<List<Pair<String,String>>>(emptyList())
    private var batteryFree by mutableStateOf(false)
    private var notifications by mutableStateOf(false)
    private var busy by mutableStateOf(false)
    private val notificationRequest = registerForActivityResult(ActivityResultContracts.RequestPermission()) { refresh() }
    private val store by lazy { SettingsStore(this) }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycleScope.launch {
            store.flow.collect { settings = it }
        }
        lifecycleScope.launch(Dispatchers.IO) {
            val packages = packageManager.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER),0)
                .map { it.activityInfo.packageName to it.loadLabel(packageManager).toString() }
            val defaults = AppCatalog.defaults(this@MainActivity).map { p -> p to runCatching { packageManager.getApplicationLabel(packageManager.getApplicationInfo(p,0)).toString() }.getOrDefault(p) }
            withContext(Dispatchers.Main) { installed = (packages + defaults).distinctBy { it.first }.sortedBy { it.second.lowercase() } }
        }
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary=Green,background=Pale,surface=Color.White,onBackground=Color(0xFF18251E),onSurface=Color(0xFF18251E))) {
                Surface(Modifier.fillMaxSize(),color=Pale) { Content() }
            }
        }
    }
    override fun onResume() { super.onResume(); refresh() }
    private fun refresh() {
        if (busy) return
        busy = true
        lifecycleScope.launch {
            try {
                notifications = Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                batteryFree = getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName)
                settings = store.read()
                data = UsageRepository.read(this@MainActivity,true)
                ranked = withContext(Dispatchers.IO) { AppCatalog.ranking(this@MainActivity,data!!,settings) }
                Refresh.schedule(this@MainActivity)
                Refresh.service(this@MainActivity,settings.instant)
                Refresh.widgets(this@MainActivity,false)
            } finally { busy = false }
        }
    }
    private fun open(intent: Intent) {
        try { startActivity(intent) } catch (_: ActivityNotFoundException) { Toast.makeText(this,"This settings page is unavailable on this device.",Toast.LENGTH_LONG).show() }
    }
    private fun change(block: suspend () -> Unit) { lifecycleScope.launch { block(); UsageRepository.invalidate(); refresh() } }

    @Composable private fun Content() {
        var excludedDialog by rememberSaveable { mutableStateOf(false) }
        var guidance by rememberSaveable { mutableStateOf(false) }
        var tick by remember { mutableLongStateOf(SystemClock.elapsedRealtime()) }
        LaunchedEffect(data) {
            while (true) {
                tick = SystemClock.elapsedRealtime()
                if (data != null && data!!.midnight != midnightMillis()) refresh()
                delay(1000)
            }
        }
        val snapshot = data
        val millis = (snapshot?.totals?.screenMillis ?: 0) + if (snapshot?.totals?.screenOn == true) (tick-snapshot.elapsedAt).coerceAtLeast(0) else 0
        Column(Modifier.fillMaxSize().safeDrawingPadding().verticalScroll(rememberScrollState()).padding(horizontal=20.dp,vertical=16.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
            Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    Text("Screen Time",fontSize=28.sp,fontWeight=FontWeight.Bold)
                    Text(LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, d MMM")),color=Color(0xFF65736B),fontSize=14.sp)
                }
                TextButton(onClick={ refresh() },enabled=!busy) { Text(if(busy) "Loading…" else "Refresh") }
            }
            if (snapshot?.granted != true) {
                Panel {
                    Text("One permission to get started",fontSize=20.sp,fontWeight=FontWeight.SemiBold)
                    Text("Usage access reads screen and app activity on this phone. Nothing leaves your device.",fontSize=14.sp)
                    Button(onClick={ open(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)) },modifier=Modifier.fillMaxWidth()) { Text("Grant usage access") }
                    Text("Select Screen Time Widget, then allow usage access. Return here to continue.",fontSize=12.sp,color=Color(0xFF65736B))
                }
            }
            Panel {
                Text("Screen on today",color=Color(0xFF65736B),fontSize=14.sp)
                Text(clockLabel(millis),fontSize=44.sp,fontWeight=FontWeight.Bold)
                Text(snapshot?.message ?: if (snapshot?.totals?.screenOn == true) "Counting while your screen is on" else "Paused while your screen is off",fontSize=12.sp,color=Green)
                if(ranked.isNotEmpty()) {
                    HorizontalDivider(color=Color(0xFFE7ECE9))
                    Text("MOST USED TODAY",fontSize=11.sp,fontWeight=FontWeight.SemiBold,color=Color(0xFF65736B))
                    ranked.forEach { app ->
                        Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {
                            app.icon?.let { Image(it.asImageBitmap(),contentDescription=null,modifier=Modifier.size(32.dp)) }
                            Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(5.dp)) {
                                Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) {
                                    Text(app.label,modifier=Modifier.weight(1f),maxLines=1,overflow=androidx.compose.ui.text.style.TextOverflow.Ellipsis,fontSize=14.sp)
                                    Text(durationLabel(app.millis),fontSize=13.sp,color=Color(0xFF65736B))
                                }
                                LinearProgressIndicator(progress={ (app.millis.toFloat()/ranked.first().millis.coerceAtLeast(1)).coerceIn(0f,1f) },modifier=Modifier.fillMaxWidth().height(3.dp),color=Green,trackColor=Color(0xFFE7ECE9))
                            }
                        }
                    }
                } else Text("Your most-used apps will appear here.",fontSize=13.sp,color=Color(0xFF65736B))
                val time = snapshot?.let { SimpleDateFormat(if(settings.use24Hour) "HH:mm" else "h:mm a",Locale.getDefault()).format(java.util.Date(it.at)) } ?: "—"
                Text("App ranking refreshed $time",fontSize=11.sp,color=Color(0xFF65736B))
                OutlinedButton(onClick={
                    val manager = AppWidgetManager.getInstance(this@MainActivity)
                    if (manager.isRequestPinAppWidgetSupported) manager.requestPinAppWidget(ComponentName(this@MainActivity,ScreenWidget::class.java),null,null)
                    else Toast.makeText(this@MainActivity,"Long-press your home screen → Widgets → Screen Time Widget",Toast.LENGTH_LONG).show()
                },modifier=Modifier.fillMaxWidth()) { Text("Add home-screen widget") }
            }
            Panel {
                Text("Settings",fontSize=20.sp,fontWeight=FontWeight.SemiBold)
                SettingToggle("Instant screen updates","Keeps a silent notification. Turn off for periodic refreshes.",settings.instant) { value -> change { store.instant(value); Refresh.service(this@MainActivity,value) } }
                SettingToggle("24-hour timestamps","Applies to “refreshed at” labels. Duration never wraps at 12 or 24 hours.",settings.use24Hour) { value -> change { store.time24(value) } }
                Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
                    Text("Apps shown",modifier=Modifier.weight(1f))
                    TextButton(onClick={ change { store.top(settings.topN-1) } },enabled=settings.topN>1) { Text("−") }
                    Text(settings.topN.toString(),fontWeight=FontWeight.Bold)
                    TextButton(onClick={ change { store.top(settings.topN+1) } },enabled=settings.topN<5) { Text("+") }
                }
                OutlinedButton(onClick={ excludedDialog=true },modifier=Modifier.fillMaxWidth()) { Text("Excluded apps · ${settings.exclusions.size}") }
            }
            Panel {
                Text("Keep updates reliable",fontSize=20.sp,fontWeight=FontWeight.SemiBold)
                Text("${if(notifications) "✓" else "○"} Notifications   ·   ${if(batteryFree) "✓" else "○"} Unrestricted battery",fontSize=13.sp,color=Color(0xFF65736B))
                if (Build.VERSION.SDK_INT>=33 && !notifications) OutlinedButton(onClick={ notificationRequest.launch(Manifest.permission.POST_NOTIFICATIONS) },modifier=Modifier.fillMaxWidth()) { Text("Allow notification") }
                if (!batteryFree) OutlinedButton(onClick={ open(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,Uri.parse("package:$packageName"))) },modifier=Modifier.fillMaxWidth()) { Text("Allow unrestricted battery") }
                TextButton(onClick={ guidance=true }) { Text("Autostart & device guidance") }
                Text(if(settings.instant && !ScreenService.running) "Instant service is not active. Grant usage access, then reopen this app." else "Long-press the widget to resize it. Scroll its app list at small sizes.",fontSize=12.sp,color=Color(0xFF65736B))
            }
            Text("LOCAL ONLY · NO ACCOUNT · NO NETWORK",fontSize=11.sp,color=Color(0xFF65736B),modifier=Modifier.align(Alignment.CenterHorizontally))
        }
        if (excludedDialog) ExclusionDialog { excludedDialog=false }
        if (guidance) AlertDialog(onDismissRequest={guidance=false},title={Text("Autostart & battery")},text={
            Column(verticalArrangement=Arrangement.spacedBy(10.dp)) {
                Text("On Xiaomi / HyperOS: App info → Battery → No restrictions; Settings → Apps → Permissions → Background autostart → enable Screen Time Widget. Menu names vary.")
                Text("On other phones: allow background activity and remove this app from sleeping-app lists. Some OEMs still stop services.")
                Text("After Force stop, Android blocks receivers and services until you open the app again. Your usage history can be re-read then.")
                TextButton(onClick={ open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:$packageName"))) }) { Text("Open this app’s settings") }
                TextButton(onClick={ open(Intent(Intent.ACTION_VIEW,Uri.parse("https://dontkillmyapp.com/${if(Build.MANUFACTURER.equals("Xiaomi",true)) "xiaomi" else ""}"))) }) { Text("Open OEM guidance in browser") }
            }
        },confirmButton={TextButton(onClick={guidance=false}) {Text("Done")}})
    }
    @Composable private fun Panel(content: @Composable ColumnScope.() -> Unit) {
        Card(Modifier.fillMaxWidth(),shape=RoundedCornerShape(24.dp),colors=CardDefaults.cardColors(containerColor=Color.White)) {
            Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp),content=content)
        }
    }
    @Composable private fun SettingToggle(title: String,subtitle: String,checked: Boolean,action: (Boolean)->Unit) {
        Row(Modifier.fillMaxWidth().toggleableCompat(checked,action),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {
            Column(Modifier.weight(1f)) { Text(title,fontWeight=FontWeight.Medium); Text(subtitle,fontSize=12.sp,color=Color(0xFF65736B)) }
            Switch(checked=checked,onCheckedChange=action)
        }
    }
    @Composable private fun ExclusionDialog(dismiss: ()->Unit) {
        var custom by rememberSaveable { mutableStateOf("") }
        val choices = (installed + ranked.map {it.pkg to it.label} + settings.exclusions.map {it to it}).distinctBy {it.first}.sortedBy {it.second.lowercase()}
        AlertDialog(onDismissRequest=dismiss,title={Text("Excluded apps")},text={
            Column {
                Text("Launcher and System UI are excluded by default. Edit any entry below.",fontSize=12.sp)
                Column(Modifier.heightIn(max=300.dp).verticalScroll(rememberScrollState())) {
                    choices.forEach { (pkg,label) ->
                        Row(Modifier.fillMaxWidth().clickable { change { store.exclusions(if(pkg in settings.exclusions) settings.exclusions-pkg else settings.exclusions+pkg) } },verticalAlignment=Alignment.CenterVertically) {
                            Checkbox(checked=pkg in settings.exclusions,onCheckedChange={ value -> change { store.exclusions(if(value) settings.exclusions+pkg else settings.exclusions-pkg) } })
                            Column(Modifier.weight(1f)) { Text(label,fontSize=13.sp); Text(pkg,fontSize=10.sp,maxLines=1) }
                        }
                    }
                }
                OutlinedTextField(value=custom,onValueChange={custom=it},label={Text("Add package name")},singleLine=true,modifier=Modifier.fillMaxWidth())
                TextButton(onClick={ val p=custom.trim(); if(p.isNotEmpty()) change {store.exclusions(settings.exclusions+p)}; custom="" }) { Text("Exclude package") }
            }
        },confirmButton={TextButton(onClick=dismiss) {Text("Done")}})
    }
}
private fun Modifier.toggleableCompat(checked: Boolean,action: (Boolean)->Unit): Modifier = clickable { action(!checked) }
