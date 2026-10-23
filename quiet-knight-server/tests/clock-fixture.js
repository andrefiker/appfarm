// Synthetic persisted 10+0 room, used only by regression suites.
// Production creation/rematch must use resetClock, which now makes games untimed.
export function resetTimedClock(room, now) {
  Object.assign(room, {time_control:{initial_ms:600000,increment_ms:0},white_time_ms:600000,black_time_ms:600000,clock_running_color:room.status==='active'?'w':null,turn_started_at:room.status==='active'?now:null,flagged_color:null,clock_paused:false,pause_request:null,pause_id:null,pause_started_at:null});
}
