import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino(
    isProd
        ? undefined
        : {
            transport: {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "SYS:standard"
                }
            }
        }
);

declare module "express-serve-static-core" {
    interface Request {
        requestId?: string;
    }
}

export function logRequest(req: Request, res: Response, next: NextFunction): void {
    const incomingId = req.header("x-request-id");
    const requestId = incomingId && incomingId.trim().length > 0 ? incomingId : randomUUID();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    const start = Date.now();

    res.on("finish", () => {
        const durationMs = Date.now() - start;
        logger.info(
            {
                requestId,
                method: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
                durationMs
            },
            "request"
        );
    });

    next();
}
