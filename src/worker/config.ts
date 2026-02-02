import { z } from "zod";

export type WorkerEnv = {
    CABME_BASE_URL: string;
    CABME_ORIGIN_BASE_URL?: string;
    CABME_APIKEY: string;
    CABME_ACCESSTOKEN: string;
    CABME_CREATE_OS_PATH?: string;
    CABME_DEFAULT_USER_ID?: string;
    CABME_DEFAULT_LAT?: string;
    CABME_DEFAULT_LNG?: string;
    CABME_DEFAULT_DEST_LAT?: string;
    CABME_DEFAULT_DEST_LNG?: string;
    CABME_DEFAULT_DEST_NAME?: string;
    CABME_DEFAULT_TOTAL_PEOPLE?: string;
    CABME_DEFAULT_TOTAL_CHILDREN?: string;
    CABME_DEFAULT_SUB_TOTAL?: string;
    CABME_DEFAULT_DISTANCE?: string;
    CABME_DEFAULT_DURATION?: string;
    CABME_DEFAULT_VEHICLE_TYPE_ID?: string;
    ZPRO_BASE_URL: string;
    ZPRO_API_ID: string;
    ZPRO_TOKEN: string;
    ADMIN_KEY?: string;
    REQUEST_TIMEOUT_MS?: string;
    LOG_LEVEL?: string;
    EVENT_DEDUP: KVNamespace;
};

const envSchema = z.object({
    CABME_BASE_URL: z.string().min(1),
    CABME_ORIGIN_BASE_URL: z.string().optional(),
    CABME_APIKEY: z.string().min(1),
    CABME_ACCESSTOKEN: z.string().min(1),
    CABME_CREATE_OS_PATH: z.string().optional(),
    CABME_DEFAULT_USER_ID: z.string().optional(),
    CABME_DEFAULT_LAT: z.string().optional(),
    CABME_DEFAULT_LNG: z.string().optional(),
    CABME_DEFAULT_DEST_LAT: z.string().optional(),
    CABME_DEFAULT_DEST_LNG: z.string().optional(),
    CABME_DEFAULT_DEST_NAME: z.string().optional(),
    CABME_DEFAULT_TOTAL_PEOPLE: z.string().optional(),
    CABME_DEFAULT_TOTAL_CHILDREN: z.string().optional(),
    CABME_DEFAULT_SUB_TOTAL: z.string().optional(),
    CABME_DEFAULT_DISTANCE: z.string().optional(),
    CABME_DEFAULT_DURATION: z.string().optional(),
    CABME_DEFAULT_VEHICLE_TYPE_ID: z.string().optional(),
    ZPRO_BASE_URL: z.string().min(1),
    ZPRO_API_ID: z.string().min(1),
    ZPRO_TOKEN: z.string().min(1),
    ADMIN_KEY: z.string().optional(),
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
            accesstoken: parsed.CABME_ACCESSTOKEN,
            createOsPath: parsed.CABME_CREATE_OS_PATH,
            defaults: {
                userId: parsed.CABME_DEFAULT_USER_ID,
                lat: parsed.CABME_DEFAULT_LAT,
                lng: parsed.CABME_DEFAULT_LNG,
                destLat: parsed.CABME_DEFAULT_DEST_LAT,
                destLng: parsed.CABME_DEFAULT_DEST_LNG,
                destName: parsed.CABME_DEFAULT_DEST_NAME,
                totalPeople: parsed.CABME_DEFAULT_TOTAL_PEOPLE,
                totalChildren: parsed.CABME_DEFAULT_TOTAL_CHILDREN,
                subTotal: parsed.CABME_DEFAULT_SUB_TOTAL,
                distance: parsed.CABME_DEFAULT_DISTANCE,
                duration: parsed.CABME_DEFAULT_DURATION,
                vehicleTypeId: parsed.CABME_DEFAULT_VEHICLE_TYPE_ID
            }
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
