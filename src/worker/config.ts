import { z } from "zod";

export type WorkerEnv = {
    CABME_BASE_URL: string;
    CABME_APIKEY: string;
    CABME_ACCESSTOKEN: string;
    ZPRO_BASE_URL: string;
    ZPRO_API_ID: string;
    ZPRO_TOKEN: string;
    REQUEST_TIMEOUT_MS?: string;
    LOG_LEVEL?: string;
};

const envSchema = z.object({
    CABME_BASE_URL: z.string().min(1),
    CABME_APIKEY: z.string().min(1),
    CABME_ACCESSTOKEN: z.string().min(1),
    ZPRO_BASE_URL: z.string().min(1),
    ZPRO_API_ID: z.string().min(1),
    ZPRO_TOKEN: z.string().min(1),
    REQUEST_TIMEOUT_MS: z.string().optional(),
    LOG_LEVEL: z.string().optional()
});

export function getConfig(env: WorkerEnv) {
    const parsed = envSchema.parse(env);
    const timeoutMs = parsed.REQUEST_TIMEOUT_MS ? Number(parsed.REQUEST_TIMEOUT_MS) : 15000;

    return {
        cabme: {
            baseUrl: parsed.CABME_BASE_URL,
            apikey: parsed.CABME_APIKEY,
            accesstoken: parsed.CABME_ACCESSTOKEN
        },
        zpro: {
            baseUrl: parsed.ZPRO_BASE_URL,
            apiId: parsed.ZPRO_API_ID,
            token: parsed.ZPRO_TOKEN
        },
        timeoutMs,
        logLevel: parsed.LOG_LEVEL ?? "info"
    };
}
