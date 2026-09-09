/* LEGACY APPDEPLOY SCAFFOLD: retained because platform routes import these modules. The production frontend uses native fetch/WebSocket to Railway; its authority is andrefiker/appfarm/quiet-knight-server/server.js. Do not repair live multiplayer here or wire these legacy room routes back into the UI. */ import { removeSubscriptionsByConnection } from "./realtime-subscribers";

export const realtime = async (event: any) => {
    let msg: any = {};
    try {
        msg = JSON.parse(event.body || '{}');
    } catch {}

    if (msg.type === 'system.connected') {
        return { statusCode: 200 };
    }

    if (msg.type === 'system.disconnected') {
        const connectionId = msg.payload?.connection_id;
        if (connectionId) {
            await removeSubscriptionsByConnection(connectionId);
        }
        return { statusCode: 200 };
    }

    return { statusCode: 200 };
};