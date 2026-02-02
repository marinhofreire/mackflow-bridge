import { getVehicleCategories } from "../connectors/cabme";
import { listTickets } from "../connectors/zpro";
import type { WorkerEnv } from "../config";
import type { Context } from "hono";

type CallResult = {
    statusCode: number | null;
    durationMs: number;
};

async function timedCall(fn: () => Promise<Response>): Promise<CallResult> {
    const start = Date.now();
    try {
        const response = await fn();
        return { statusCode: response.status, durationMs: Date.now() - start };
    } catch {
        return { statusCode: null, durationMs: Date.now() - start };
    }
}

export async function adminSmokeHandler(
    c: Context<{ Bindings: WorkerEnv; Variables: { requestId: string } }>
) {
    const adminKey = c.env.ADMIN_KEY;
    if (adminKey && adminKey.length > 0) {
        const headerKey = c.req.header("x-admin-key");
        if (!headerKey || headerKey !== adminKey) {
            return c.json({ error: "unauthorized", requestId: c.get("requestId") }, 401);
        }
    }
    const env = c.env;
    const [cabme, zpro] = await Promise.all([
        timedCall(() => getVehicleCategories(env)),
        timedCall(() => listTickets(env))
    ]);

    return c.json({ cabme, zpro });
}
