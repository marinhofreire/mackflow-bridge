import { Router } from "express";
import { handleTriageMessage } from "../triage/flow";

export const triageRouter = Router();

type TriageBody = {
    sessionId?: string;
    message?: string;
};

triageRouter.post("/triage", (req, res) => {
    const body = req.body as TriageBody | undefined;

    if (!body || typeof body.message !== "string") {
        res.status(400).json({ error: "invalid_body" });
        return;
    }

    const sessionId =
        typeof body.sessionId === "string" && body.sessionId.trim().length > 0
            ? body.sessionId.trim()
            : req.requestId;

    const result = handleTriageMessage(sessionId, body.message);

    res.json({
        sessionId,
        reply: result.reply,
        step: result.step,
        data: result.data
    });
});
