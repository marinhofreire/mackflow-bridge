import express from "express";
import { config } from "./config";
import { logger, logRequest } from "./logger";
import { adminRouter } from "./routes/admin";
import { healthRouter } from "./routes/health";

const app = express();

app.use(express.json());
app.use(logRequest);

app.use(healthRouter);
app.use(adminRouter);

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ requestId: req.requestId, err }, "unhandled_error");
    res.status(500).json({ error: "internal_error", requestId: req.requestId });
});

app.listen(config.port, () => {
    logger.info({ port: config.port }, "listening");
});
