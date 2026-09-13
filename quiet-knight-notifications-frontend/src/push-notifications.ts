import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./network";

export type PushState = "off" | "on" | "unsupported" | "blocked" | "working";
const ENABLED = "qk-move-notifications-v1";
const ENABLED_AT = "qk-move-notifications-enabled-at-v1";

function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function remember(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}
function standalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
function ios() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
function supported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    (!ios() || standalone())
  );
}
function permission() {
  return "Notification" in window
    ? Notification.permission
    : "unavailable";
}
function applicationKey(value: string) {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function useMoveNotifications(
  roomCode: string | null,
  seatToken: string | null,
) {
  const initial = useMemo<PushState>(
    () =>
      !supported()
        ? "unsupported"
        : Notification.permission === "denied"
          ? "blocked"
          : stored(ENABLED) === "true" && Notification.permission === "granted"
            ? "on"
            : "off",
    [],
  );
  const [state, setState] = useState<PushState>(initial);
  const [detail, setDetail] = useState("");
  const [lastResult, setLastResult] = useState("None");
  const bind = useCallback(
    async (create: boolean) => {
      if (!roomCode || !seatToken)
        throw new Error("A saved player seat is required.");
      if (!supported())
        throw new Error(
          ios() && !standalone()
            ? "Add Quiet Knight to your Home Screen to receive move notifications."
            : "This browser does not support move notifications.",
        );
      if (Notification.permission !== "granted")
        throw new Error(
          Notification.permission === "denied"
            ? "Notification permission is blocked in browser settings."
            : "Notification permission has not been granted.",
        );
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription && create) {
        const { data } = await api.get("/api/push/public-key");
        if (!data?.supported || typeof data.public_key !== "string")
          throw new Error("Move notifications are temporarily unavailable.");
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationKey(data.public_key),
        });
      }
      if (!subscription)
        throw new Error("No notification subscription is available.");
      await api.post("/api/push/subscribe", {
        room_code: roomCode,
        seat_token: seatToken,
        subscription: subscription.toJSON(),
      });
      setLastResult("Subscribed");
      return subscription;
    },
    [roomCode, seatToken],
  );
  const enable = useCallback(async () => {
    if (state === "working") return;
    setState("working");
    setDetail("");
    try {
      if (!supported())
        throw new Error(
          ios() && !standalone()
            ? "Add Quiet Knight to your Home Screen to receive move notifications."
            : "This browser does not support move notifications.",
        );
      let permission = Notification.permission;
      if (permission === "default")
        permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        setDetail(
          permission === "denied"
            ? "Permission blocked. Change it in browser settings if you want notifications."
            : "Notifications remain off.",
        );
        return;
      }
      await bind(true);
      remember(ENABLED, "true");
      if (!stored(ENABLED_AT)) remember(ENABLED_AT, new Date().toISOString());
      setState("on");
      setDetail("Move notifications are enabled for this device.");
    } catch (error) {
      setState(
        permission() === "denied"
          ? "blocked"
          : supported()
            ? "off"
            : "unsupported",
      );
      setDetail(
        error instanceof Error
          ? error.message
          : "Could not enable move notifications.",
      );
    }
  }, [bind, state]);
  const disable = useCallback(async () => {
    setState("working");
    setDetail("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription && roomCode && seatToken)
        await api.post("/api/push/unsubscribe", {
          room_code: roomCode,
          seat_token: seatToken,
          endpoint: subscription.endpoint,
        });
      if (subscription) await subscription.unsubscribe();
      remember(ENABLED, null);
      remember(ENABLED_AT, null);
      setState("off");
      setLastResult("Unsubscribed");
      setDetail("Move notifications are off.");
    } catch (error) {
      setState("on");
      setDetail(
        error instanceof Error
          ? error.message
          : "Could not disable notifications.",
      );
    }
  }, [roomCode, seatToken]);
  useEffect(() => {
    if (
      state !== "on" ||
      stored(ENABLED) !== "true" ||
      Notification.permission !== "granted" ||
      !roomCode ||
      !seatToken
    )
      return;
    void bind(false).catch((error) => {
      setLastResult("Binding failed");
      setDetail(
        error instanceof Error
          ? error.message
          : "Could not connect notifications to this room.",
      );
    });
  }, [bind, roomCode, seatToken, state]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.data?.type !== "qk.push.foreground" ||
        event.data.roomCode !== roomCode
      )
        return;
      setLastResult(
        event.data.kind === "nudge" ? "Foreground nudge" : "Foreground move",
      );
    };
    navigator.serviceWorker?.addEventListener("message", receive);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", receive);
  }, [roomCode]);
  const age = useMemo(() => {
    const date = Date.parse(stored(ENABLED_AT) || "");
    if (!Number.isFinite(date)) return "None";
    const days = Math.floor((Date.now() - date) / 86400000);
    return days < 1 ? "<1d" : `${days}d`;
  }, [state]);
  return {
    state,
    detail,
    enable,
    disable,
    supported: supported(),
    iosInstallRequired: ios() && !standalone(),
    diagnostics: {
      supported: supported(),
      permission:
        permission(),
      subscribed: state === "on",
      age,
      lastResult,
    },
  };
}
