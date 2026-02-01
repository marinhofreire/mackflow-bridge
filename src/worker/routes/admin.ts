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
    const env = c.env;
    const [cabme, zpro] = await Promise.all([
        timedCall(() => getVehicleCategories(env)),
        timedCall(() => listTickets(env))
    ]);

    return c.json({ cabme, zpro });
}
