import { Hono } from "hono";
import { healthHandler } from "./worker/routes/health";
import { adminSmokeHandler } from "./worker/routes/admin";
import { triageHandler } from "./worker/routes/triage";
import { zproIncomingHandler } from "./worker/routes/zpro";
import type { WorkerEnv } from "./worker/config";

const app = new Hono<{ Bindings: WorkerEnv; Variables: { requestId: string } }>();

app.use("*", async (c, next) => {
    const incomingId = c.req.header("x-request-id");
    const requestId = incomingId && incomingId.trim().length > 0 ? incomingId : crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);

    const start = Date.now();
    await next();
    const durationMs = Date.now() - start;
    const url = new URL(c.req.url);

    console.log(
        JSON.stringify({
            level: "info",
            msg: "request",
            requestId,
            method: c.req.method,
            path: url.pathname,
            statusCode: c.res.status,
            durationMs
        })
    );
});

app.get("/health", (c) => healthHandler(c));
app.get("/", (c) => c.json({ ok: true, service: "mackflow-bridge" }));
app.get("/favicon.ico", (c) => c.body(null, 204));
app.get("/admin/smoke", (c) => adminSmokeHandler(c));
app.post("/triage", (c) => triageHandler(c));
app.post("/zpro/incoming", (c) => zproIncomingHandler(c));

app.onError((err, c) => {
    const requestId = c.get("requestId");
    console.log(
        JSON.stringify({
            level: "error",
            msg: "unhandled_error",
            requestId,
            error: err.message
        })
    );
    return c.json({ error: "internal_error", requestId }, 500);
});

export default app;
