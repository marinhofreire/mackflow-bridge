import type { Context } from "hono";
import type { WorkerEnv } from "../config";
import { handleTriageMessage, getSessionState, setSessionState, type TriageSession } from "../../triage/flow";
import { cabmeCreateOS } from "../connectors/cabme";

type IncomingExtracted = {
    number: string | null;
    message: string | null;
    externalKey: string | null;
};

type DedupStored = {
    protocol?: string;
    osId?: string;
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

async function sendZproMessage(
    config: ReturnType<typeof getZproConfig>,
    number: string,
    body: string,
    externalKey: string
) {
    const url = new URL(`/v2/api/external/${config.apiId}`, config.baseUrl);

    return fetchWithTimeout(
        url.toString(),
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                body,
                number,
                externalKey,
                isClosed: false
            })
        },
        config.timeoutMs
    ).catch(() => null);
}

function formatSuccessMessage(protocol: string, data: { serviceType?: string; location?: string; plate?: string }) {
    return `✅ OS aberta!\n📌 Protocolo: ${protocol}\n🧰 Serviço: ${data.serviceType ?? "-"}\n📍 Local: ${data.location ?? "-"}\n🚗 Placa: ${data.plate ?? "-"}`;
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

    if (c.env.EVENT_DEDUP) {
        const cached = await c.env.EVENT_DEDUP.get(`session:${externalKey}`, "json");
        if (cached && typeof cached === "object") {
            setSessionState(externalKey, cached as TriageSession);
        }
    }

    const triage = handleTriageMessage(externalKey, extracted.message, { phone: extracted.number });
    const config = getZproConfig(c.env);
    if (!config) {
        return c.json({ error: "config_error", requestId }, 500);
    }

    if (c.env.EVENT_DEDUP) {
        const session = getSessionState(externalKey);
        if (session) {
            await c.env.EVENT_DEDUP.put(`session:${externalKey}`,
                JSON.stringify(session),
                { expirationTtl: 86400 }
            );
        }
    }

    if (triage.step === "READY_TO_OPEN_OS" && triage.data.statusFinanceiro === "ADIMPLENTE") {
        try {
            const dedup = c.env.EVENT_DEDUP;
            if (!dedup) {
                return c.json({ error: "dedup_missing", requestId }, 500);
            }

            const cached = await dedup.get<DedupStored>(externalKey, "json");
            const cachedProtocol = cached?.protocol ?? cached?.osId ?? null;
            if (cachedProtocol) {
                const cachedMessage = formatSuccessMessage(cachedProtocol, triage.data);
                const cachedResponse = await sendZproMessage(config, extracted.number, cachedMessage, externalKey);
                if (!cachedResponse || !cachedResponse.ok) {
                    return c.json({ error: "zpro_send_failed", requestId }, 502);
                }
                return c.json({ ok: true, step: triage.step, requestId, protocol: cachedProtocol, dedup: true });
            }

            const cabmeResult = await cabmeCreateOS(c.env, {
                name: triage.data.name ?? "",
                plate: triage.data.plate ?? "",
                location: triage.data.location ?? "",
                serviceType: triage.data.serviceType ?? "",
                phone: triage.data.phone ?? extracted.number
            });

            if (!cabmeResult.ok || !cabmeResult.protocol) {
                const fallbackMessage = "⚠️ Não consegui abrir a OS agora. Vou te direcionar para um atendente.";
                const fallbackResponse = await sendZproMessage(config, extracted.number, fallbackMessage, externalKey);
                if (!fallbackResponse || !fallbackResponse.ok) {
                    return c.json({ error: "zpro_send_failed", requestId }, 502);
                }
                return c.json({ error: "cabme_create_failed", requestId }, 502);
            }

            await dedup.put(
                externalKey,
                JSON.stringify({ protocol: cabmeResult.protocol, osId: cabmeResult.osId }),
                { expirationTtl: 86400 }
            );

            const successMessage = formatSuccessMessage(cabmeResult.protocol, triage.data);
            const successResponse = await sendZproMessage(config, extracted.number, successMessage, externalKey);
            if (!successResponse || !successResponse.ok) {
                return c.json({ error: "zpro_send_failed", requestId }, 502);
            }

            return c.json({ ok: true, step: triage.step, requestId, protocol: cabmeResult.protocol });
        } catch (error) {
            console.log(
                JSON.stringify({
                    level: "error",
                    msg: "cabme_flow_error",
                    requestId,
                    error: error instanceof Error ? error.message : "unknown_error"
                })
            );
            return c.json({ error: "cabme_flow_error", requestId }, 502);
        }
    }

    if (triage.data.statusFinanceiro === "INADIMPLENTE") {
        const refusalResponse = await sendZproMessage(config, extracted.number, triage.reply, externalKey);
        if (!refusalResponse || !refusalResponse.ok) {
            return c.json({ error: "zpro_send_failed", requestId }, 502);
        }
        return c.json({ ok: true, step: triage.step, requestId });
    }

    const response = await sendZproMessage(config, extracted.number, triage.reply, externalKey);
    if (!response || !response.ok) {
        return c.json({ error: "zpro_send_failed", requestId }, 502);
    }

    return c.json({ ok: true, step: triage.step, requestId });
}
