import type { Context } from "hono";
import type { WorkerEnv } from "../config";
import { handleTriageMessage } from "../../triage/flow";

export async function triageHandler(
    c: Context<{ Bindings: WorkerEnv; Variables: { requestId: string } }>
) {
    const body = await c.req.json().catch(() => null);

    if (!body || typeof body.message !== "string") {
        return c.json({ error: "invalid_body", requestId: c.get("requestId") }, 400);
    }

    const sessionId =
        typeof body.sessionId === "string" && body.sessionId.trim().length > 0
            ? body.sessionId.trim()
            : c.get("requestId");

    const result = handleTriageMessage(sessionId, body.message);

    return c.json({
        sessionId,
        reply: result.reply,
        step: result.step,
        data: result.data,
        requestId: c.get("requestId")
    });
}
