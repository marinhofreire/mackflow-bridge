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

export async function getVehicleCategories(env: WorkerEnv) {
    const config = getConfig(env);
    return fetchWithTimeout(
        `${config.cabme.baseUrl}Vehicle-category/`,
        {
            headers: {
                apikey: config.cabme.apikey,
                accesstoken: config.cabme.accesstoken
            }
        },
        config.timeoutMs
    );
}
