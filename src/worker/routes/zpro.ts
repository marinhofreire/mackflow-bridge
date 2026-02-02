import type { Context } from "hono";
import type { WorkerEnv } from "../config";
import { handleTriageMessage } from "../../triage/flow";

type IncomingExtracted = {
    number: string | null;
    message: string | null;
    externalKey: string | null;
};

function asString(value: unknown) {
    return typeof value === "string" ? value : null;
}

function extractIncoming(body: Record<string, unknown>): IncomingExtracted {
    const number =
        asString(body.number) ??
        asString(body.phone) ??
        asString(body.from) ??
        asString((body.sender as { phone?: unknown } | undefined)?.phone) ??
        asString((body.contact as { phone?: unknown } | undefined)?.phone) ??
        null;

    const message =
        asString(body.message) ??
        asString(body.text) ??
        asString((body.text as { message?: unknown } | undefined)?.message) ??
        asString(body.body) ??
        asString((body.messages as Array<{ text?: { body?: unknown }; body?: unknown }> | undefined)?.[0]?.text?.body) ??
        asString((body.messages as Array<{ body?: unknown }> | undefined)?.[0]?.body) ??
        null;

    const externalKey =
        asString(body.externalKey) ??
        asString(body.external_key) ??
        asString(body.ticketId) ??
        asString(body.id) ??
        asString(body.messageId) ??
        null;

    return { number, message, externalKey };
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

function getZproConfig(env: WorkerEnv) {
    const baseUrl = env.ZPRO_BASE_URL;
    const apiId = env.ZPRO_API_ID;
    const token = env.ZPRO_TOKEN;
    if (!baseUrl || !apiId || !token) {
        return null;
    }
    const timeoutMs = env.REQUEST_TIMEOUT_MS ? Number(env.REQUEST_TIMEOUT_MS) : 15000;
    return { baseUrl, apiId, token, timeoutMs };
}

export async function zproIncomingHandler(
    c: Context<{ Bindings: WorkerEnv; Variables: { requestId: string } }>
) {
    const requestId = c.get("requestId");
    const body = await c.req.json().catch(() => null);

    if (!body || typeof body !== "object") {
        return c.json({ error: "invalid_body", requestId }, 400);
    }

    const extracted = extractIncoming(body as Record<string, unknown>);

    if (!extracted.number || !extracted.message) {
        return c.json({ error: "missing_fields", requestId }, 400);
    }

    const externalKey = extracted.externalKey ?? crypto.randomUUID();
    const triage = handleTriageMessage(externalKey, extracted.message);
    const config = getZproConfig(c.env);
    if (!config) {
        return c.json({ error: "config_error", requestId }, 500);
    }

    const url = new URL(`/v2/api/external/${config.apiId}`, config.baseUrl);

    const response = await fetchWithTimeout(
        url.toString(),
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                body: triage.reply,
                number: extracted.number,
                externalKey,
                isClosed: false
            })
        },
        config.timeoutMs
    ).catch(() => null);

    if (!response || !response.ok) {
        return c.json({ error: "zpro_send_failed", requestId }, 502);
    }

    return c.json({ ok: true, step: triage.step, requestId });
}
