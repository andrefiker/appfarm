package com.ghost.screentimewidget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import android.os.Looper
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[35],application=ScreenTimeApplication::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class MainRenderTest {
    @Test fun launchPermissionOnboardingLight() {render(false,360,800,"main-onboarding-light")}
    @Test fun launchPermissionOnboardingDarkSmall() {render(true,320,720,"main-onboarding-dark-small")}
    private fun render(dark: Boolean,width: Int,height: Int,name: String) {
        RuntimeEnvironment.setQualifiers(if(dark) "+night" else "+notnight")
        val context=RuntimeEnvironment.getApplication()
        UsageRepository.invalidate(true)
        shadowOf(context.getSystemService(android.app.AppOpsManager::class.java)).setMode(android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,android.os.Process.myUid(),context.packageName,android.app.AppOpsManager.MODE_IGNORED)
        val controller=Robolectric.buildActivity(MainActivity::class.java).setup().visible()
        try {
            val field=MainActivity::class.java.getDeclaredField("data"+"$"+"delegate").apply {isAccessible=true}
            @Suppress("UNCHECKED_CAST")
            val state=field.get(controller.get()) as androidx.compose.runtime.MutableState<Snapshot?>
            var attempts=0
            while(state.value == null && attempts++<100) { Thread.sleep(25);shadowOf(Looper.getMainLooper()).idle() }
            assertEquals(false,state.value?.granted)
            shadowOf(Looper.getMainLooper()).idle()
            val view=controller.get().window.decorView
            val density=view.resources.displayMetrics.density
            val w=(width*density).toInt();val h=(height*density).toInt()
            view.measure(View.MeasureSpec.makeMeasureSpec(w,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(h,View.MeasureSpec.EXACTLY));view.layout(0,0,w,h)
            shadowOf(Looper.getMainLooper()).idleFor(java.time.Duration.ofMillis(500))
            view.measure(View.MeasureSpec.makeMeasureSpec(w,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(h,View.MeasureSpec.EXACTLY));view.layout(0,0,w,h)
            val bitmap=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);view.draw(Canvas(bitmap))
            val file=File("build/qa/$name.png");file.parentFile!!.mkdirs();file.outputStream().use {bitmap.compress(Bitmap.CompressFormat.PNG,100,it)}
            assertTrue(file.length()>1000)
        } finally {controller.pause().stop().destroy()}
    }
}
