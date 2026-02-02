import type { Context } from "hono";
import type { WorkerEnv } from "../config";
import { handleTriageMessage, getSessionState, setSessionState, type TriageSession } from "../../triage/flow";

export async function triageHandler(
    c: Context<{ Bindings: WorkerEnv; Variables: { requestId: string } }>
) {
    const body = await c.req.json().catch(() => null);

    if (!body || typeof body.message !== "string") {
        return c.json({ error: "invalid_body", requestId: c.get("requestId") }, 400);
    }

    const sessionId =
        typeof body.externalKey === "string" && body.externalKey.trim().length > 0
            ? body.externalKey.trim()
            : typeof body.sessionId === "string" && body.sessionId.trim().length > 0
                ? body.sessionId.trim()
                : c.get("requestId");

    if (c.env.EVENT_DEDUP) {
        const cached = await c.env.EVENT_DEDUP.get(`session:${sessionId}`, "json");
        if (cached && typeof cached === "object") {
            setSessionState(sessionId, cached as TriageSession);
        }
    }

    const result = handleTriageMessage(sessionId, body.message, {
        phone: typeof body.number === "string" ? body.number : null
    });

    if (c.env.EVENT_DEDUP) {
        const session = getSessionState(sessionId);
        if (session) {
            await c.env.EVENT_DEDUP.put(`session:${sessionId}`,
                JSON.stringify(session),
                { expirationTtl: 86400 }
            );
        }
    }

    return c.json({
        sessionId,
        reply: result.reply,
        step: result.step,
        data: result.data,
        requestId: c.get("requestId")
    });
}
