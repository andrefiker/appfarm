import { useCallback, useEffect, useRef, useState } from "react";
import { MULTIPLAYER_WS } from "./network";
import { idleDiagnostics } from "./diagnostics";
import type { RealtimeDiagnostics } from "./diagnostics";
export type TablePresence = { white: boolean; black: boolean };
type Extras = {
  seatToken?: string | null;
  onPresence?: (presence: TablePresence) => void;
  onRole?: (role: "white" | "black" | "spectator", gameNumber: number) => void;
  onNudge?: (eventId: string) => void;
};
type RoomVersion = { code: string; version: number };
type State = {
  connection: string;
  connectionId: string | null;
  detail: string;
};
const DELAYS = [600, 1200, 2400, 4800, 9600, 15000];
export function useRoomRealtime<T extends RoomVersion>(
  roomCode: string | null,
  onRoom: (room: T) => void,
  extras: Extras = {},
) {
  const extra = useRef(extras);
  extra.current = extras;
  const inspect = useRef<() => RealtimeDiagnostics>(idleDiagnostics);
  const callback = useRef(onRoom);
  callback.current = onRoom;
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<State>({
    connection: "Connecting…",
    connectionId: null,
    detail: "",
  });
  useEffect(() => {
    if (!roomCode) {
      inspect.current = idleDiagnostics;
      setState({ connection: "Idle", connectionId: null, detail: "" });
      return;
    }
    let active = true,
      socket: WebSocket | null = null,
      attempt = 0,
      halted = false,
      paused = document.visibilityState === "hidden",
      highest = -1,
      lastResume = -Infinity;
    let retryTimer: number | undefined,
      watchdog: number | undefined,
      heartbeat: number | undefined;
    let lastUpdateAt: number | null = null,
      reason = retry ? "Manual reconnect" : "Initial connection",
      currentConnection = "Connecting…";
    inspect.current = () => ({
      connection: currentConnection,
      readyState: socket?.readyState ?? null,
      lastUpdateAt,
      attempt,
      reason,
      paused,
    });
    const publish = (connection: string, detail = "") => {
      currentConnection = connection;
      if (active)
        setState({
          connection,
          connectionId: connection === "Live" ? "railway" : null,
          detail,
        });
    };
    const clear = () => {
      window.clearTimeout(retryTimer);
      window.clearTimeout(watchdog);
      window.clearTimeout(heartbeat);
      retryTimer = watchdog = heartbeat = undefined;
    };
    const retire = () => {
      clear();
      const old = socket;
      socket = null;
      if (old) {
        old.onopen = old.onmessage = old.onerror = old.onclose = null;
        try {
          old.close();
        } catch {}
      }
    };
    const suspend = () => {
      if (!active) return;
      reason = "Page backgrounded";
      paused = true;
      retire();
      publish(
        "Paused",
        "Your seat is saved. Returning to the game reconnects automatically.",
      );
    };
    const failed = (failure: string) => {
      if (!active) return;
      reason = failure;
      if (paused || document.visibilityState === "hidden") {
        suspend();
        return;
      }
      retire();
      if (!navigator.onLine) {
        publish("Offline", "Your seat is kept. Restore internet to continue.");
        return;
      }
      if (attempt >= DELAYS.length) {
        halted = true;
        publish("Connection unavailable", reason);
        return;
      }
      publish("Reconnecting…", reason);
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        open();
      }, DELAYS[attempt++]);
    };
    const arm = (current: WebSocket) => {
      window.clearTimeout(watchdog);
      watchdog = window.setTimeout(() => {
        if (active && socket === current)
          failed("The live channel did not return the current position.");
      }, 10000);
    };
    const probe = () => {
      const current = socket;
      if (
        !active ||
        paused ||
        !current ||
        current.readyState !== WebSocket.OPEN
      )
        return;
      window.clearTimeout(heartbeat);
      if (watchdog !== undefined) return;
      arm(current);
      try {
        current.send(JSON.stringify({ type: "room.sync" }));
      } catch {
        failed("The live channel could not refresh.");
      }
    };
    const open = () => {
      if (!active || socket || halted || paused) return;
      if (document.visibilityState === "hidden") {
        suspend();
        return;
      }
      if (!navigator.onLine) {
        publish("Offline", "Your seat is kept. Restore internet to continue.");
        return;
      }
      publish(
        attempt ? "Reconnecting…" : "Connecting…",
        "Opening the live channel.",
      );
      let current: WebSocket;
      try {
        current = new WebSocket(
          MULTIPLAYER_WS + "?room=" + encodeURIComponent(roomCode),
        );
      } catch {
        failed("Could not open the live channel.");
        return;
      }
      socket = current;
      arm(current);
      current.onopen = () => {
        if (active && !paused && socket === current) {
          publish("Syncing…", "Waiting for the current position.");
          if (extra.current.seatToken)
            try {
              current.send(
                JSON.stringify({
                  type: "presence.hello",
                  seat_token: extra.current.seatToken,
                }),
              );
            } catch {
              failed("Could not identify this seat.");
            }
        }
      };
      current.onmessage = (event) => {
        if (!active || paused || socket !== current) return;
        let message;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (
          message?.type === "presence.update" &&
          typeof message.white === "boolean" &&
          typeof message.black === "boolean"
        ) {
          extra.current.onPresence?.({
            white: message.white,
            black: message.black,
          });
          return;
        }
        if (
          message?.type === "seat.role" &&
          ["white", "black", "spectator"].includes(message.role) &&
          Number.isSafeInteger(message.game_number) &&
          message.room_version >= highest
        ) {
          extra.current.onRole?.(message.role, message.game_number);
          return;
        }
        if (
          message?.type === "opponent.nudge" &&
          typeof message.event_id === "string"
        ) {
          extra.current.onNudge?.(message.event_id);
          return;
        }
        const room = message?.room as T;
        if (
          message?.type !== "room.update" ||
          room?.code !== roomCode ||
          !Number.isSafeInteger(room.version) ||
          room.version < highest
        )
          return;
        window.clearTimeout(watchdog);
        watchdog = undefined;
        highest = room.version;
        lastUpdateAt = Date.now();
        callback.current(room);
        attempt = 0;
        publish("Live", "Current position received through the live channel.");
        window.clearTimeout(heartbeat);
        heartbeat = window.setTimeout(probe, 20000);
      };
      current.onerror = () => {
        if (active && socket === current)
          failed("The live channel reported an error.");
      };
      current.onclose = () => {
        if (active && socket === current) failed("The live channel closed.");
      };
    };
    const offline = () => {
      if (!active) return;
      reason = "Network offline";
      retire();
      if (document.visibilityState === "hidden") {
        suspend();
        return;
      }
      publish("Offline", "Your seat is kept. Restore internet to continue.");
    };
    const resume = (networkRestored = false) => {
      if (!active) return;
      if (document.visibilityState === "hidden") {
        suspend();
        return;
      }
      if (!navigator.onLine) {
        paused = false;
        offline();
        return;
      }
      const now = Date.now();
      if (
        !networkRestored &&
        !paused &&
        !halted &&
        socket &&
        now - lastResume < 1000
      )
        return;
      reason = networkRestored ? "Network restored" : "Page returned";
      paused = false;
      halted = false;
      attempt = 0;
      lastResume = now;
      retire();
      open();
    };
    const online = () => resume(true);
    const visible = () => {
      if (document.visibilityState === "hidden") suspend();
      else resume();
    };
    const returned = () => resume();
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("pageshow", returned);
    window.addEventListener("pagehide", suspend);
    window.addEventListener("focus", returned);
    document.addEventListener("visibilitychange", visible);
    document.addEventListener("freeze", suspend);
    document.addEventListener("resume", returned);
    if (paused) suspend();
    else {
      lastResume = Date.now();
      open();
    }
    return () => {
      active = false;
      retire();
      inspect.current = idleDiagnostics;
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("pageshow", returned);
      window.removeEventListener("pagehide", suspend);
      window.removeEventListener("focus", returned);
      document.removeEventListener("visibilitychange", visible);
      document.removeEventListener("freeze", suspend);
      document.removeEventListener("resume", returned);
    };
  }, [roomCode, retry, extras.seatToken]);
  const reconnect = useCallback(() => setRetry((value) => value + 1), []);
  const getDiagnostics = useCallback(() => inspect.current(), []);
  return { ...state, reconnect, getDiagnostics };
}
