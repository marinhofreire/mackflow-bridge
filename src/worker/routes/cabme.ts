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

    const bodyText = await response.text().catch(() => "");
    const debugSnippet = bodyText.slice(0, 200);

    if (response.status === 403) {
        if (bodyText.includes("error code: 1003")) {
            return c.json(
                {
                    ok: false,
                    error: "CF_1003",
                    message: "403 (Cloudflare 1003): o Cloudflare está bloqueando a chamada do Worker ao CabMe. Verifique se CABME_BASE_URL está usando domínio (https://console.mackflow.com.br/api/) e não IP, e se não há regra/WAF bloqueando Workers.",
                    next: "Confirme CABME_BASE_URL e libere o Worker nas regras do Cloudflare (WAF/Bot/Firewall), depois rode /cabme/ping de novo.",
                    status: response.status,
                    debugSnippet,
                    requestId
                },
                403
            );
        }

        return c.json(
            {
                ok: false,
                error: "CABME_AUTH",
                message: "403: CabMe recusou autenticação. Isso normalmente indica CABME_ACCESSTOKEN inválido/inativo na tabela (access_tokens/users_access).",
                next: "Atualize o secret CABME_ACCESSTOKEN com um token ativo do CabMe e teste /cabme/ping.",
                status: response.status,
                debugSnippet,
                requestId
            },
            403
        );
    }

    const payload = bodyText
        ? (() => {
            try {
                return JSON.parse(bodyText) as unknown;
            } catch {
                return null;
            }
        })()
        : null;

    return c.json(
        {
            ok: response.ok,
            status: response.status,
            data: payload,
            debugSnippet: response.ok ? undefined : debugSnippet,
            requestId
        },
        response.ok ? 200 : 502
    );
}
