/* LEGACY APPDEPLOY SCAFFOLD: retained because platform routes import these modules. The production frontend uses native fetch/WebSocket to Railway; its authority is andrefiker/appfarm/quiet-knight-server/server.js. Do not repair live multiplayer here or wire these legacy room routes back into the UI. */ import { router, json, error } from "@appdeploy/sdk";

import { notifySubscribers, realtimeSubscriptionRoutes } from "./realtime-subscribers";
import { chessRoutes } from './chess';

export const handler = router({
    "GET /api/_healthcheck": [async () => json({ message: "Success" })],

    ...chessRoutes,
    ...realtimeSubscriptionRoutes,
})
