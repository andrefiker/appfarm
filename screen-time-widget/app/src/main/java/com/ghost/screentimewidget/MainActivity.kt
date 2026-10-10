package com.ghost.screentimewidget

import android.Manifest
import android.app.TimePickerDialog
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.*
import java.time.*
import java.time.format.DateTimeFormatter

private val Leaf = Color(0xFF3C7559)
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
        lifecycleScope.launch { store.flow.collect { settings=it } }
        lifecycleScope.launch(Dispatchers.IO) {
            val packages = packageManager.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER),0).map { it.activityInfo.packageName to it.loadLabel(packageManager).toString() }
            withContext(Dispatchers.Main) { installed=(packages+AppCatalog.defaults(this@MainActivity).map { it to it }).distinctBy { it.first }.sortedBy { it.second.lowercase() } }
        }
        setContent {
            val dark = darkTheme(this,settings)
            LaunchedEffect(dark) { androidx.core.view.WindowCompat.getInsetsController(window,window.decorView).apply { isAppearanceLightStatusBars=!dark; isAppearanceLightNavigationBars=!dark }; window.statusBarColor=android.graphics.Color.parseColor(if(dark) "#101D17" else "#F6F7F2"); window.navigationBarColor=window.statusBarColor }
            val colors = if(dark) darkColorScheme(primary=Color(0xFF9DCBA5),onPrimary=Color(0xFF183E32),background=Color(0xFF101D17),surface=Color(0xFF1B2B22),surfaceVariant=Color(0xFF253B2D),secondaryContainer=Color(0xFF334E3A),onSecondaryContainer=Color(0xFFE3EDE4),outline=Color(0xFF91A797),onSurface=Color(0xFFE3EDE4),onBackground=Color(0xFFE3EDE4),onSurfaceVariant=Color(0xFFBCCAC0))
            else lightColorScheme(primary=Leaf,onPrimary=Color.White,background=Color(0xFFF6F7F2),surface=Color(0xFFFFFFFF),surfaceVariant=Color(0xFFE8F0E2),secondaryContainer=Color(0xFFDCEBD5),onSecondaryContainer=Color(0xFF223B2D),outline=Color(0xFF8B9B8B),onSurface=Color(0xFF223B2D),onBackground=Color(0xFF223B2D),onSurfaceVariant=Color(0xFF53685B))
            MaterialTheme(colorScheme=colors) { Surface(Modifier.fillMaxSize(),color=colors.background) { Content() } }
        }
    }
    override fun onResume() { super.onResume(); refresh() }
    private fun refresh() {
        if(busy) return
        busy=true
        lifecycleScope.launch {
            try {
                notifications = Build.VERSION.SDK_INT<33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED
                batteryFree = getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName)
                settings=store.read()
                data=UsageRepository.read(this@MainActivity,true)
                ranked=withContext(Dispatchers.IO) { AppCatalog.ranking(this@MainActivity,data!!,settings) }
                Refresh.schedule(this@MainActivity); Refresh.service(this@MainActivity,settings.instant); Refresh.widgets(this@MainActivity,false)
            } finally { busy=false }
        }
    }
    private fun open(intent: Intent) { try { startActivity(intent) } catch(_: ActivityNotFoundException) { Toast.makeText(this,"This settings page isn't available on this phone.",Toast.LENGTH_LONG).show() } }
    private fun change(block: suspend ()->Unit) { lifecycleScope.launch { block(); UsageRepository.invalidate(); refresh() } }
    @Composable private fun Content() {
        var tab by rememberSaveable { mutableIntStateOf(0) }
        var exclusions by rememberSaveable { mutableStateOf(false) }
        var guidance by rememberSaveable { mutableStateOf(false) }
        val valid = data?.granted == true && data?.message == null
        val behavior=data?.behavior
        Column(Modifier.fillMaxSize().safeDrawingPadding()) {
            Row(Modifier.fillMaxWidth().padding(horizontal=22.dp,vertical=16.dp),verticalAlignment=Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { Text("A little more away.",fontSize=24.sp,fontWeight=FontWeight.SemiBold); Muted(LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, d MMM"))) }
            }
            Row(Modifier.fillMaxWidth().padding(horizontal=16.dp),horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                listOf("Today","Progress","Settings").forEachIndexed { i,label -> FilterChip(selected=tab==i,onClick={tab=i},label={Text(label)},modifier=Modifier.weight(1f).heightIn(min=48.dp)) }
            }
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
                if(data == null) { LinearProgressIndicator(Modifier.fillMaxWidth(),color=MaterialTheme.colorScheme.primary,trackColor=MaterialTheme.colorScheme.surfaceVariant); Text("Reading local history…") }
                if(data?.granted == false) PermissionPanel()
                if(data?.granted == true && data?.message != null) Panel { Text(data!!.message!!); TextButton(onClick={refresh()},enabled=!busy) { Text("Refresh local data") } }
                when(tab) {
                    0 -> {
                        Hero(if(valid) behavior else null)
                        if(valid && behavior != null) {
                            Panel {
                                Text("An optional little challenge",fontWeight=FontWeight.SemiBold)
                                Text(behavior.challenge.text,fontSize=19.sp)
                                Muted(if(behavior.challengeComplete) "✓ Completed quietly. Nothing to claim." else "It expires tonight. Tomorrow is another opportunity.")
                                val next = behavior.steps.firstOrNull { it.minutes*MINUTE > behavior.today.longest }
                                if(next != null) LinearProgressIndicator(progress={ (behavior.today.longest.toFloat()/(next.minutes*MINUTE)).coerceIn(0f,1f) },modifier=Modifier.fillMaxWidth(),color=MaterialTheme.colorScheme.primary,trackColor=MaterialTheme.colorScheme.surfaceVariant)
                                Muted(next?.let { "Next gentle milestone: ${it.minutes} min · ${it.title}" } ?: "Space well made today.")
                                if(behavior.awards.isNotEmpty()) Text("Recognized today: "+behavior.awards.joinToString { "${it.title} (${it.minutes}m)" },fontSize=13.sp)
                            }
                            UsagePanel()
                        }
                        OutlinedButton(onClick={pinWidget()},modifier=Modifier.fillMaxWidth().heightIn(min=48.dp)) { Text("Add home-screen widget") }
                        Muted("No rewards to collect. Let the widget remember; go do something else.")
                    }
                    1 -> if(valid && behavior != null) ProgressPanel(behavior) else Muted("Progress appears after usage access and recorded screen events.")
                    else -> {
                        Panel {
                            Text("Make it fit your day",fontSize=20.sp,fontWeight=FontWeight.SemiBold)
                            Muted("Sleep hours are removed from daytime breaks and achievements.")
                            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(12.dp)) {
                                OutlinedButton(onClick={pickSleep(true)},modifier=Modifier.weight(1f)) { Text("From ${timeLabel(settings.sleep.startMinute)}") }
                                OutlinedButton(onClick={pickSleep(false)},modifier=Modifier.weight(1f)) { Text("Until ${timeLabel(settings.sleep.endMinute)}") }
                            }
                            if(settings.sleep.startMinute==settings.sleep.endMinute) Muted("Sleep exclusion is off (equal endpoints).")
                            Muted("Appearance")
                            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(4.dp)) { listOf("system","light","dark").forEach { theme -> FilterChip(selected=settings.theme==theme,onClick={change {store.theme(theme)}},label={Text(theme.replaceFirstChar {it.uppercase()})},modifier=Modifier.weight(1f)) } }
                            Toggle("Instant return updates","Optional silent service. Reacts to screen/unlock broadcasts without polling.",settings.instant) { v -> change { store.instant(v); Refresh.service(this@MainActivity,v) } }
                            Muted(if(settings.instant) if(ScreenService.running) "Instant listener active." else "Listener unavailable: grant usage access and reopen. Periodic fallback stays scheduled." else "Periodic snapshots (about 15 minutes). Android may delay them; immediate return feedback is unavailable when the process sleeps.")
                            Toggle("24-hour timestamps","Duration labels always show elapsed time.",settings.use24Hour) { v -> change {store.time24(v)} }
                            Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
                                Text("Most-used apps",modifier=Modifier.weight(1f))
                                TextButton(onClick={change {store.top(settings.topN-1)}},enabled=settings.topN>1) { Text("−") }; Text(settings.topN.toString()); TextButton(onClick={change {store.top(settings.topN+1)}},enabled=settings.topN<5) { Text("+") }
                            }
                            OutlinedButton(onClick={exclusions=true},modifier=Modifier.fillMaxWidth()) { Text("Excluded apps · ${settings.exclusions.size}") }
                        }
                        Panel {
                            Text("Reliable, quiet updates",fontSize=20.sp,fontWeight=FontWeight.SemiBold)
                            Muted("${if(notifications) "✓" else "○"} Notification permission · ${if(batteryFree) "✓" else "○"} Unrestricted battery")
                            if(settings.instant && Build.VERSION.SDK_INT>=33 && !notifications) OutlinedButton(onClick={notificationRequest.launch(Manifest.permission.POST_NOTIFICATIONS)},modifier=Modifier.fillMaxWidth()) { Text("Allow silent service notification") }
                            if(settings.instant && !batteryFree) OutlinedButton(onClick={open(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,Uri.parse("package:$packageName")))},modifier=Modifier.fillMaxWidth()) { Text("Battery exception (optional)") }
                            TextButton(onClick={guidance=true}) { Text("Permission & Xiaomi / HyperOS help") }
                            TextButton(onClick={refresh()},enabled=!busy) { Text(if(busy) "Refreshing…" else "Refresh local data") }
                        }
                        Panel {
                            Text("Less friction from your phone",fontSize=20.sp,fontWeight=FontWeight.SemiBold)
                            OutlinedButton(onClick={open(Intent("android.settings.WELLBEING_SETTINGS"))},modifier=Modifier.fillMaxWidth()) { Text("Digital Wellbeing") }
                            OutlinedButton(onClick={open(Intent(if(Build.VERSION.SDK_INT>=33) Settings.ACTION_ALL_APPS_NOTIFICATION_SETTINGS else Settings.ACTION_SETTINGS))},modifier=Modifier.fillMaxWidth()) { Text("Manage app notifications") }
                            Muted("For grayscale: Settings → Accessibility → Color correction → Grayscale, or Digital Wellbeing → Bedtime mode. Menu names vary. Nothing here blocks calls or other apps.")
                            val opens=behavior?.opens?.entries?.sortedByDescending { it.value }?.take(3)
                            if(!opens.isNullOrEmpty()) Text("Frequently foreground today:\n"+opens.joinToString("\n") { e -> "${installed.firstOrNull {it.first==e.key}?.second ?: e.key}: ${e.value} recorded starts" },fontSize=13.sp)
                        }
                    }
                }
                Muted("LOCAL ONLY · NO NETWORK · v1.1.0")
            }
        }
        if(exclusions) ExclusionDialog { exclusions=false }
        if(guidance) AlertDialog(onDismissRequest={guidance=false},title={Text("Keep the instrument working")},text={ Column(Modifier.verticalScroll(rememberScrollState()),verticalArrangement=Arrangement.spacedBy(12.dp)) {
            Text("If Android blocks usage access: Settings → Apps → Screen Time Widget → ⋮ → Allow restricted settings, then grant usage access. The menu varies by phone.")
            Text("Xiaomi / HyperOS: App info → Battery → No restrictions; Settings → Apps → Permissions → Background autostart. These exceptions are optional, for instant mode.")
            Text("Force stop prevents widget, service and worker recovery until this app is reopened. Ordinary process death is different: local history and system events can recover it.")
            Text("The number measures locked/screen-off time, not your intentions. Sleep is excluded. Missing keyguard events make unlock counts unavailable or undercounts. Manual clock changes discard uncertain intervals.")
            TextButton(onClick={open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:$packageName")))}) { Text("Open app settings") }
        } },confirmButton={TextButton(onClick={guidance=false}) {Text("Done")}})
    }
    @Composable private fun PermissionPanel() { Panel {
        Text("One permission, all local.",fontSize=20.sp,fontWeight=FontWeight.SemiBold)
        Text("Usage access reads this phone's screen and foreground events. Nothing leaves the device.")
        Button(onClick={open(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))},modifier=Modifier.fillMaxWidth()) {Text("Grant usage access")}
        Muted("If Android says “Restricted setting”, open App info → ⋮ → Allow restricted settings, then return here.")
    } }
    @Composable private fun Hero(b: BehaviorSnapshot?) {
        Card(Modifier.fillMaxWidth(),shape=RoundedCornerShape(28.dp),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surfaceVariant)) {
            Column(Modifier.padding(24.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
                Text("TIME AWAY · DAYTIME",fontSize=12.sp,fontWeight=FontWeight.SemiBold,color=MaterialTheme.colorScheme.primary)
                Text(b?.last?.let {awayLabel(b.lastDaytime)} ?: "—",fontSize=if((b?.last?.let {awayLabel(b.lastDaytime)} ?: "").length>7) 36.sp else 52.sp,fontWeight=FontWeight.SemiBold)
                Text(if(b?.last == null) "Your next break will appear here." else if(!b.last.confirmed) "Last estimated foreground return" else "Your last completed break",fontSize=15.sp)
                if(b != null) {
                    Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(16.dp)) {
                        Column(Modifier.weight(1f)) { Text(awayLabel(b.today.longest),fontWeight=FontWeight.Bold); Muted("Longest today") }
                        Column(Modifier.weight(1f)) { Text(b.today.meaningful.toString(),fontWeight=FontWeight.Bold); Muted("Breaks ≥${b.steps.first().minutes}m") }
                    }
                    if(b.message != null) Text(b.message,fontSize=16.sp)
                    if(b.overnight > 0) Muted("${awayLabel(b.overnight)} of the last interval was in your sleep window.")
                    b.comparison.screenPercent?.takeIf {it>0}?.let { Text("↓ $it% screen time ${b.comparison.label}",fontSize=13.sp) }
                    b.comparison.fewerUnlocks?.takeIf {it>0}?.let { Text("$it fewer recorded unlocks ${b.comparison.label}",fontSize=13.sp) }
                    b.warning?.let { Muted(it) }
                }
                Muted("Measured locked/screen-off time. It cannot tell what you were doing.")
            }
        }
    }
    @Composable private fun UsagePanel() {
        var tick by remember { mutableLongStateOf(SystemClock.elapsedRealtime()) }
        LaunchedEffect(data) { lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) { while(true) { tick=SystemClock.elapsedRealtime(); if(data?.midnight != midnightMillis()) refresh(); delay(1000) } } }
        val snapshot=data ?: return
        val millis=snapshot.totals.screenMillis+if(snapshot.totals.screenOn) (tick-snapshot.elapsedAt).coerceAtLeast(0) else 0
        Panel {
            Text("The other side of the day",fontWeight=FontWeight.SemiBold)
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) { Muted("Screen on today"); Text(clockLabel(millis),fontWeight=FontWeight.Medium) }
            ranked.forEach { app -> Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {
                app.icon?.let {Image(it.asImageBitmap(),contentDescription=null,modifier=Modifier.size(28.dp))}
                Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(4.dp)) {
                    Row(Modifier.fillMaxWidth()) { Text(app.label,modifier=Modifier.weight(1f),maxLines=1,overflow=TextOverflow.Ellipsis,fontSize=14.sp); Text(durationLabel(app.millis),fontSize=13.sp) }
                    LinearProgressIndicator(progress={ (app.millis.toFloat()/ranked.first().millis.coerceAtLeast(1)).coerceIn(0f,1f) },modifier=Modifier.fillMaxWidth().height(3.dp),trackColor=MaterialTheme.colorScheme.surfaceVariant)
                }
            } }
            Muted("Screen-on includes the lock screen; foreground time isn't attention time.")
        }
    }
    @Composable private fun ProgressPanel(b: BehaviorSnapshot) {
        Panel {
            Text("Today, recorded",fontSize=20.sp,fontWeight=FontWeight.SemiBold)
            Metric("Screen on",awayLabel(b.today.screenMillis)); Metric("Unlocks",b.today.unlocks?.toString() ?: "Unavailable")
            Metric("Longest daytime break",awayLabel(b.today.longest)); Metric("Meaningful daytime breaks",b.today.meaningful.toString())
            Metric("Optional challenge",if(b.challengeComplete) "Completed" else "Available")
            val yesterday=b.days.lastOrNull()
            Metric("Yesterday's unlocks",yesterday?.unlocks?.let {"$it${if(!yesterday.full) " · partial/recovered" else ""}"} ?: "Unavailable")
            val counts=b.days.filter {it.full}.mapNotNull {it.unlocks}
            Metric("Daily unlock average",if(counts.size>=3) "%.1f (%d days)".format(counts.average(),counts.size) else "Building baseline")
            Muted("Unlocks are recorded keyguard-hidden events; unsupported or omitted events can't be invented.")
        }
        Panel {
            Text("Last 7 days",fontSize=20.sp,fontWeight=FontWeight.SemiBold)
            Trend("Screen on · minutes",b.days.map {(if(it.available) it.screenMillis/MINUTE else null) to it.date.dayOfWeek.name.take(1)})
            if(b.days.any {it.unlocks != null}) Trend("Recorded unlocks",b.days.map {it.unlocks?.toLong() to it.date.dayOfWeek.name.take(1)})
            val full=b.days.filter {it.full}
            val average=full.flatMap {it.breaks}.filter(::eligible).map { breakMillis(it,settings.sleep,ZoneId.systemDefault()) }.filter {it>0}
            Metric("Average daytime break",if(average.isEmpty()) "Building baseline" else awayLabel(average.average().toLong()))
            Metric("Typical break baseline",b.baseline?.let(::awayLabel) ?: "Need 3 full days + 6 breaks")
            Muted("${b.historyDays}/7 full observed days. Pale history is recovered/partial and excluded from adaptive baselines. Zero can mean no recorded events; Android may omit history.")
            b.days.forEach { day -> Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) { Text(day.date.format(DateTimeFormatter.ofPattern("EEE d")),fontSize=12.sp); Text("${if(day.available) awayLabel(day.screenMillis) else "—"} · ${day.unlocks?.toString() ?: "—"} unlocks${if(!day.full) " *" else ""}",fontSize=12.sp) } }
            b.comparison.screenPercent?.let { p -> Muted(if(p>0) "$p% less screen time ${b.comparison.label} (${b.comparison.samples} days)." else "Same-time comparison available across ${b.comparison.samples} days; no penalty for a busier day.") }
        }
    }
    @Composable private fun Trend(title: String,values: List<Pair<Long?,String>>) {
        Muted(title)
        val highest=values.mapNotNull {it.first}.maxOrNull()?.coerceAtLeast(1) ?: 1
        Row(Modifier.fillMaxWidth().height(108.dp),horizontalArrangement=Arrangement.spacedBy(8.dp),verticalAlignment=Alignment.Bottom) {
            values.forEach { (value,label) -> Column(Modifier.weight(1f),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(4.dp)) {
                Text(value?.toString() ?: "—",fontSize=10.sp,maxLines=1)
                Box(Modifier.widthIn(max=28.dp).fillMaxWidth().height(((value ?: 0).toFloat()/highest*66).coerceAtLeast(2f).dp).background(MaterialTheme.colorScheme.primary.copy(alpha=0.6f),RoundedCornerShape(5.dp)))
                Text(label,fontSize=11.sp)
            } }
        }
    }
    @Composable private fun Metric(label: String,value: String) { Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(12.dp)) { Muted(label,Modifier.weight(1f)); Text(value,fontSize=14.sp,fontWeight=FontWeight.Medium,modifier=Modifier.weight(1f)) } }
    @Composable private fun Panel(content: @Composable ColumnScope.()->Unit) { Card(Modifier.fillMaxWidth(),shape=RoundedCornerShape(24.dp),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface)) { Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp),content=content) } }
    @Composable private fun Muted(text: String,modifier: Modifier=Modifier) { Text(text,modifier=modifier,fontSize=12.sp,color=MaterialTheme.colorScheme.onSurfaceVariant) }
    @Composable private fun Toggle(title: String,subtitle: String,checked: Boolean,action: (Boolean)->Unit) { Row(Modifier.fillMaxWidth().heightIn(min=48.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) { Column(Modifier.weight(1f)) {Text(title,fontWeight=FontWeight.Medium); Muted(subtitle)}; Switch(checked=checked,onCheckedChange=action) } }
    @Composable private fun ExclusionDialog(dismiss: ()->Unit) {
        var custom by rememberSaveable {mutableStateOf("")}
        val choices=(installed+settings.exclusions.map {it to it}).distinctBy {it.first}.sortedBy {it.second.lowercase()}
        AlertDialog(onDismissRequest=dismiss,title={Text("Excluded apps")},text={ Column {
            Muted("Launcher and System UI start excluded. This affects rankings, never screen totals or confirmed unlocks.")
            Column(Modifier.heightIn(max=280.dp).verticalScroll(rememberScrollState())) { choices.forEach { (pkg,label) -> Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
                Checkbox(checked=pkg in settings.exclusions,onCheckedChange={v -> change {store.exclusions(if(v) settings.exclusions+pkg else settings.exclusions-pkg)}})
                Text(label,modifier=Modifier.weight(1f),fontSize=13.sp,maxLines=2,overflow=TextOverflow.Ellipsis)
            } } }
            OutlinedTextField(value=custom,onValueChange={custom=it},label={Text("Package name")},singleLine=true,modifier=Modifier.fillMaxWidth())
            TextButton(onClick={val p=custom.trim(); if(p.isNotEmpty()) change {store.exclusions(settings.exclusions+p)}; custom=""}) {Text("Add exclusion")}
        } },confirmButton={TextButton(onClick=dismiss) {Text("Done")}})
    }
    private fun pinWidget() { val manager=AppWidgetManager.getInstance(this); if(manager.isRequestPinAppWidgetSupported) manager.requestPinAppWidget(ComponentName(this,ScreenWidget::class.java),null,null) else Toast.makeText(this,"Long-press home screen → Widgets → Screen Time Widget",Toast.LENGTH_LONG).show() }
    private fun timeLabel(minutes: Int) = "%02d:%02d".format(minutes/60,minutes%60)
    private fun pickSleep(start: Boolean) { val m=if(start) settings.sleep.startMinute else settings.sleep.endMinute; TimePickerDialog(this,{_,h,min -> val value=h*60+min; change {store.sleep(if(start) settings.sleep.copy(startMinute=value) else settings.sleep.copy(endMinute=value))} },m/60,m%60,true).show() }
}
