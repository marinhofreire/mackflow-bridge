import type { Context } from "hono";
import type { WorkerEnv } from "../config";
import { getVehicleCategories } from "../connectors/cabme";

export async function cabmePingHandler(
    c: Context<{ Bindings: WorkerEnv; Variables: { requestId: string } }>
) {
    const requestId = c.get("requestId");
    const response = await getVehicleCategories(c.env).catch(() => null);

    if (!response) {
        return c.json({ ok: false, error: "cabme_unreachable", requestId }, 502);
    }

    const payload = await response.json().catch(() => null);

    return c.json(
        {
            ok: response.ok,
            status: response.status,
            data: payload,
            requestId
        },
        response.ok ? 200 : 502
    );
}
