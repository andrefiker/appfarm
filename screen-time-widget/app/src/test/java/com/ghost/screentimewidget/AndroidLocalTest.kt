package com.ghost.screentimewidget

import android.app.Application
import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import android.widget.RemoteViews
import android.widget.TextView
import android.widget.FrameLayout
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File
import java.time.*
import java.util.TimeZone

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[35],application=Application::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class AndroidLocalTest {
    private val date=LocalDate.of(2026,10,9)
    private fun at(h: Int,m: Int=0,d: LocalDate=date)=d.atTime(h,m).toInstant(ZoneOffset.UTC).toEpochMilli()
    private val context get()=RuntimeEnvironment.getApplication()
    @Before fun reset() {TimeZone.setDefault(TimeZone.getTimeZone("UTC"));context.deleteDatabase("away-history.db")}
    @Test fun journalSurvivesCloseReopenAndDeduplicates() {
        val es=listOf(TimedEvent(at(8),EventKind.SCREEN_OFF),TimedEvent(at(9),EventKind.RETURN))
        LocalHistory(context).use {it.save(es,at(10));it.save(es,at(10));it.put("trackingSince",at(7))}
        LocalHistory(context).use {val saved=it.events(at(0),at(10));assertEquals(es,saved);assertEquals(60*MINUTE,deriveBehavior(saved,at(10)).breaks.single().rawMillis);assertEquals(at(7),it.number("trackingSince"))}
    }
    @Test fun delayedNativeEventReplacesBroadcast() {
        LocalHistory(context).use { h ->
            h.save(listOf(TimedEvent(at(9)+500,EventKind.RETURN,activity="#broadcast")),at(10))
            h.save(listOf(TimedEvent(at(9),EventKind.RETURN,"android")),at(10))
            assertEquals(1,h.events(at(8),at(10)).size)
        }
    }
    @Test fun awardsAreAutomaticAndIdempotentAcrossReopen() {
        val es=listOf(TimedEvent(at(8),EventKind.SCREEN_ON),TimedEvent(at(8,1),EventKind.SCREEN_OFF),TimedEvent(at(8,21),EventKind.RETURN))
        LocalHistory(context).use {h -> h.put("trackingSince",at(0));buildBehavior(es,at(9),AppSettings(),h,false)}
        LocalHistory(context).use {h -> val b=buildBehavior(es+es,at(9),AppSettings(),h,false);assertEquals(2,b.awards.size);assertTrue(b.challengeComplete);assertNull(b.message)}
    }
    @Test fun openingAppCannotRotateMessagesOrClaimRewards() {
        val es=listOf(TimedEvent(at(8),EventKind.SCREEN_ON),TimedEvent(at(8,1),EventKind.SCREEN_OFF),TimedEvent(at(8,21),EventKind.RETURN))
        LocalHistory(context).use {h -> h.put("trackingSince",at(0));val b=buildBehavior(es,at(8,21)+500,AppSettings(),h,true);assertNotNull(b.message);val seq=h.number("messageSequence");val again=buildBehavior(es,at(8,22),AppSettings(),h,false);assertEquals(seq,h.number("messageSequence"));assertEquals(b.message,again.message);buildBehavior(es,at(8,22),AppSettings(),h,true);assertEquals(seq,h.number("messageSequence"))}
    }
    @Test fun overnightCannotCompleteChallengeOrAward() {
        val es=listOf(TimedEvent(at(23,d=date.minusDays(1)),EventKind.SCREEN_OFF),TimedEvent(at(7),EventKind.RETURN),TimedEvent(at(7),EventKind.SCREEN_ON))
        LocalHistory(context).use {h -> h.put("trackingSince",at(0,d=date.minusDays(1)));val b=buildBehavior(es,at(7)+1000,AppSettings(),h,true);assertEquals(0,b.lastDaytime);assertTrue(b.awards.isEmpty());assertFalse(b.challengeComplete);assertNull(b.message)}
    }
    @Test fun clockResetDropsPendingAndRestartsBaseline() {
        LocalHistory(context).use {h -> h.save(listOf(TimedEvent(at(8),EventKind.SCREEN_OFF)),at(10));h.resetAt(at(9));h.save(listOf(TimedEvent(at(10),EventKind.RETURN)),at(11));assertTrue(deriveBehavior(h.events(at(0),at(11)),at(11)).breaks.isEmpty());assertEquals(at(9),h.number("trackingSince"))}
    }
    @Test fun historyMissingDaysAreUnavailableNotZeroBaseline() {
        LocalHistory(context).use {h -> h.put("trackingSince",at(0,d=date.minusDays(10)));val b=buildBehavior(emptyList(),at(9),AppSettings(),h,false);assertEquals(0,b.historyDays);assertNull(b.baseline);assertNull(b.comparison.screenPercent);assertTrue(b.days.none {it.available});assertTrue(b.days.all {it.unlocks == null})}
    }
    @Test fun challengeThresholdIsStableForTheDay() {
        LocalHistory(context).use {h -> h.put("trackingSince",at(0));val b=buildBehavior(emptyList(),at(8),AppSettings(),h,false);val later=buildBehavior(emptyList(),at(10),AppSettings(sleep=SleepWindow(0,0)),h,false);assertEquals(b.challenge,later.challenge)}
    }
    @Test fun noonChallengeNotCreatedAfterLunch() {
        val monday=LocalDate.of(2026,10,12)
        val events=(1..3).flatMap { i -> val d=monday.minusDays(i.toLong());listOf(TimedEvent(at(0,d=d),EventKind.SCREEN_ON),TimedEvent(at(8,d=d),EventKind.SCREEN_OFF),TimedEvent(at(8,10,d=d),EventKind.RETURN),TimedEvent(at(9,d=d),EventKind.SCREEN_OFF),TimedEvent(at(9,10,d=d),EventKind.RETURN)) } + TimedEvent(at(12,d=monday),EventKind.SCREEN_ON)
        LocalHistory(context).use {h -> h.put("trackingSince",at(0,d=monday.minusDays(7)));val result=buildBehavior(events,at(14,d=monday),AppSettings(),h,false);assertEquals(ChallengeKind.ONE,result.challenge.kind)}
    }
    @Test fun retentionKeepsRecentHistoryOnly() {
        LocalHistory(context).use {h ->h.save(listOf(TimedEvent(at(8)-36*DAY,EventKind.SCREEN_OFF),TimedEvent(at(8),EventKind.SCREEN_OFF)),at(9));assertEquals(1,h.events(0,at(9)).size)}
    }
    @Test fun clockFencePersistsAcrossRestart() {
        LocalHistory(context).use {it.fence(at(8),at(9))}
        LocalHistory(context).use {assertEquals(listOf(at(8) to at(9)),it.fences())}
    }
    @Test fun actualRemoteViewsRenderCompactLightAndDark() {render(R.layout.widget_compact,180,120,false,"compact-light");render(R.layout.widget_compact,180,120,true,"compact-dark")}
    @Test fun actualRemoteViewsRenderExpandedLightAndDark() {render(R.layout.screen_widget,320,260,false,"expanded-light");render(R.layout.screen_widget,320,260,true,"expanded-dark")}
    @Test fun actualRemoteViewsMediumHostFitsCore() {render(R.layout.screen_widget,320,190,false,"medium-light")}
    @Test fun actualRemoteViewsSmallHostFitsCore() {render(R.layout.widget_compact,120,110,false,"compact-small")}
    private fun render(layout: Int,widthDp: Int,heightDp: Int,dark: Boolean,name: String) {
        val now=at(10,31)
        val es=listOf(TimedEvent(at(7),EventKind.SCREEN_OFF),TimedEvent(at(8,12),EventKind.RETURN),TimedEvent(at(8,30),EventKind.SCREEN_OFF),TimedEvent(at(8,40),EventKind.RETURN),TimedEvent(at(9),EventKind.SCREEN_OFF),TimedEvent(at(9,20),EventKind.RETURN),TimedEvent(at(9,43),EventKind.SCREEN_OFF),TimedEvent(at(10,30),EventKind.RETURN),TimedEvent(at(10,30),EventKind.SCREEN_ON))
        val settings=AppSettings(instant=false,theme=if(dark) "dark" else "light")
        val behavior=LocalHistory(context).use { h -> h.put("trackingSince",at(0));buildBehavior(es,now,settings,h,true) }.copy(comparison=Comparison(22,12,3,"vs recent days by this time"))
        val snapshot=Snapshot(now,android.os.SystemClock.elapsedRealtime(),at(0),UsageTotals(102*MINUTE+7000,emptyMap(),true),true,behavior=behavior)
        val options=android.os.Bundle().apply { putInt(android.appwidget.AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,widthDp);putInt(android.appwidget.AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,heightDp) }
        val rv=ScreenWidget.buildViews(context,snapshot,settings,7,options)
        val view=rv.apply(context,FrameLayout(context))
        val density=context.resources.displayMetrics.density
        val w=(widthDp*density).toInt();val h=(heightDp*density).toInt()
        view.measure(View.MeasureSpec.makeMeasureSpec(w,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(h,View.MeasureSpec.EXACTLY));view.layout(0,0,w,h)
        val details=view.findViewById<TextView>(R.id.away_details)
        assertTrue("Core detail must fit $name",details.bottom <= h-view.paddingBottom)
        val bitmap=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);view.draw(Canvas(bitmap))
        val file=File("build/qa/$name.png");file.parentFile!!.mkdirs();file.outputStream().use {bitmap.compress(Bitmap.CompressFormat.PNG,100,it)}
        assertTrue(file.length()>100)
    }
}
