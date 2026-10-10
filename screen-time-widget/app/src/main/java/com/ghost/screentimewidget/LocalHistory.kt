package com.ghost.screentimewidget

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.content.ContentValues

/** Credential-protected, bounded local event journal. Never backed up or transmitted. */
class LocalHistory(context: Context): SQLiteOpenHelper(context.applicationContext,"away-history.db",null,1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE events(t INTEGER NOT NULL,k TEXT NOT NULL,p TEXT NOT NULL,a TEXT NOT NULL,PRIMARY KEY(t,k,p,a))")
        db.execSQL("CREATE INDEX event_time ON events(t)")
        db.execSQL("CREATE TABLE fences(lo INTEGER NOT NULL, hi INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE meta(k TEXT PRIMARY KEY,v TEXT NOT NULL)")
        db.execSQL("CREATE TABLE awards(day TEXT NOT NULL,title TEXT NOT NULL,minutes INTEGER NOT NULL,break_id TEXT NOT NULL,PRIMARY KEY(day,title,minutes))")
        db.execSQL("CREATE TABLE challenges(day TEXT PRIMARY KEY,minutes INTEGER NOT NULL,count INTEGER NOT NULL,kind TEXT NOT NULL,done INTEGER NOT NULL DEFAULT 0)")
    }
    override fun onUpgrade(db: SQLiteDatabase,oldVersion: Int,newVersion: Int) = Unit
    fun get(key: String): String? = readableDatabase.rawQuery("SELECT v FROM meta WHERE k=?",arrayOf(key)).use { if(it.moveToFirst()) it.getString(0) else null }
    fun number(key: String) = get(key)?.toLongOrNull() ?: 0
    fun put(key: String,value: Any) { writableDatabase.insertWithOnConflict("meta",null,ContentValues().apply { put("k",key); put("v",value.toString()) },SQLiteDatabase.CONFLICT_REPLACE) }
    fun save(events: List<TimedEvent>, now: Long) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            for(e in events) {
                if(e.activity != "#broadcast" && e.kind in listOf(EventKind.SCREEN_ON,EventKind.SCREEN_OFF,EventKind.LOCK,EventKind.RETURN)) db.delete("events","k=? AND a=? AND t BETWEEN ? AND ?",arrayOf(e.kind.name,"#broadcast",(e.time-2000).toString(),(e.time+2000).toString()))
                db.insertWithOnConflict("events",null,ContentValues().apply { put("t",e.time); put("k",e.kind.name); put("p",e.pkg); put("a",e.activity) },SQLiteDatabase.CONFLICT_IGNORE)
            }
            db.delete("events","t < ?",arrayOf((now-35*DAY).toString()))
            db.delete("fences","hi < ?",arrayOf((now-35*DAY).toString()))
            db.setTransactionSuccessful()
        } finally { db.endTransaction() }
    }
    fun events(from: Long,until: Long): List<TimedEvent> = readableDatabase.rawQuery("SELECT t,k,p,a FROM events WHERE t>=? AND t<=? ORDER BY t",arrayOf(from.toString(),until.toString())).use { c -> buildList { while(c.moveToNext()) add(TimedEvent(c.getLong(0),EventKind.valueOf(c.getString(1)),c.getString(2),c.getString(3))) } }
    fun fences(): List<Pair<Long,Long>> = readableDatabase.rawQuery("SELECT lo,hi FROM fences",null).use { c -> buildList { while(c.moveToNext()) add(c.getLong(0) to c.getLong(1)) } }
    fun fence(lo: Long,hi: Long) { writableDatabase.execSQL("INSERT INTO fences(lo,hi) VALUES(?,?)",arrayOf(lo,hi)) }
    fun resetAt(now: Long, discardFrom: Long? = null) {
        discardFrom?.let { writableDatabase.delete("events","t>=?",arrayOf(it.toString())) }
        save(listOf(TimedEvent(now,EventKind.RESET)),now)
        put("trackingSince",now)
        put("clockWarning",now)
    }
    fun award(day: String,step: Milestone,b: AwayBreak) {
        writableDatabase.insertWithOnConflict("awards",null,ContentValues().apply { put("day",day); put("title",step.title); put("minutes",step.minutes); put("break_id",b.id) },SQLiteDatabase.CONFLICT_IGNORE)
    }
    fun awards(day: String): List<Milestone> = readableDatabase.rawQuery("SELECT minutes,title FROM awards WHERE day=? ORDER BY minutes",arrayOf(day)).use { c -> buildList { while(c.moveToNext()) add(Milestone(c.getInt(0),c.getString(1))) } }
    fun challenge(day: String): Pair<DailyChallenge,Boolean>? = readableDatabase.rawQuery("SELECT minutes,count,kind,done FROM challenges WHERE day=?",arrayOf(day)).use { if(it.moveToFirst()) DailyChallenge(day,it.getInt(0),it.getInt(1),ChallengeKind.valueOf(it.getString(2))) to (it.getInt(3)==1) else null }
    fun saveChallenge(c: DailyChallenge) { writableDatabase.insertWithOnConflict("challenges",null,ContentValues().apply { put("day",c.date); put("minutes",c.minutes); put("count",c.count); put("kind",c.kind.name); put("done",0) },SQLiteDatabase.CONFLICT_IGNORE) }
    fun complete(day: String) { writableDatabase.execSQL("UPDATE challenges SET done=1 WHERE day=?",arrayOf(day)) }
    fun prune(day: String) { writableDatabase.delete("awards","day<?",arrayOf(day)); writableDatabase.delete("challenges","day<?",arrayOf(day)) }
}
