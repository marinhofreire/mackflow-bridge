import axios from "axios";
import { Router } from "express";
import { getVehicleCategories } from "../connectors/cabme";
import { listTickets } from "../connectors/zpro";

export const adminRouter = Router();

type CallResult = {
    statusCode: number | null;
    durationMs: number;
};

async function timedCall<T>(fn: () => Promise<T>): Promise<CallResult> {
    const start = Date.now();
    try {
        const response = await fn();
        const durationMs = Date.now() - start;
        const status = (response as { status?: number }).status;
        return { statusCode: status ?? null, durationMs };
    } catch (error) {
        const durationMs = Date.now() - start;
        if (axios.isAxiosError(error)) {
            return { statusCode: error.response?.status ?? null, durationMs };
        }
        return { statusCode: null, durationMs };
    }
}

adminRouter.get("/admin/smoke", async (_req, res) => {
    const [cabme, zpro] = await Promise.all([
        timedCall(() => getVehicleCategories()),
        timedCall(() => listTickets())
    ]);

    res.json({ cabme, zpro });
});
