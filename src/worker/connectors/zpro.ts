import { getConfig, type WorkerEnv } from "../config";

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(input, { ...init, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timeout);
    }
}

export async function listTickets(env: WorkerEnv) {
    const config = getConfig(env);
    const url = new URL(`/v2/api/external/${config.zpro.apiId}/listTickets`, config.zpro.baseUrl);
    url.searchParams.set("pageNumber", "1");
    url.searchParams.set("status", "open");

    return fetchWithTimeout(
        url.toString(),
        {
            headers: {
                Authorization: `Bearer ${config.zpro.token}`
            }
        },
        config.timeoutMs
    );
}
