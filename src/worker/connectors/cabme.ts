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

export type CabmeCreateOSPayload = {
    name: string;
    plate: string;
    location: string;
    serviceType: string;
    phone?: string | null;
};

export type CabmeCreateOSResult = {
    ok: boolean;
    status: number | null;
    protocol?: string;
    osId?: string;
    errorBody?: string;
};

function ensureTrailingSlash(value: string) {
    return value.endsWith("/") ? value : `${value}/`;
}

function hasV1Segment(value: string) {
    return value.includes("/v1/") || value.includes("/api/v1/");
}

function normalizePath(path: string) {
    const trimmed = path.trim().replace(/^\//, "");
    return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function resolveCreateOsUrl(baseUrl: string, path?: string) {
    if (path && /^https?:\/\//i.test(path)) {
        return path;
    }
    const normalizedBase = ensureTrailingSlash(baseUrl);
    const fallbackPath = "v1/ride-book/";
    const finalPath = normalizePath(path && path.trim().length > 0 ? path : fallbackPath);

    if (hasV1Segment(normalizedBase)) {
        return new URL(finalPath, normalizedBase).toString();
    }

    if (finalPath.startsWith("v1/") || finalPath.startsWith("api/v1/")) {
        return new URL(finalPath, normalizedBase).toString();
    }

    return new URL(`v1/${finalPath}`, normalizedBase).toString();
}

function pickProtocol(value: unknown): string | null {
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }
    if (!value || typeof value !== "object") {
        return null;
    }
    const obj = value as Record<string, unknown>;
    const direct =
        obj.protocol ??
        obj.protocolo ??
        obj.osId ??
        obj.id ??
        obj.requestId ??
        obj.bookingId ??
        obj.booking_number ??
        obj.data;
    if (direct && typeof direct === "object") {
        return pickProtocol(direct);
    }
    return pickProtocol(direct);
}

function resolveDefaults(config: ReturnType<typeof getConfig>) {
    const defaults = config.cabme.defaults ?? {};
    return {
        userId: defaults.userId ?? "1",
        lat: defaults.lat ?? "0",
        lng: defaults.lng ?? "0",
        destLat: defaults.destLat ?? defaults.lat ?? "0",
        destLng: defaults.destLng ?? defaults.lng ?? "0",
        destName: defaults.destName ?? "Destino",
        totalPeople: defaults.totalPeople ?? "1",
        totalChildren: defaults.totalChildren ?? "0",
        subTotal: defaults.subTotal ?? "0",
        distance: defaults.distance ?? "1",
        duration: defaults.duration ?? "10",
        vehicleTypeId: defaults.vehicleTypeId ?? undefined
    };
}

function buildRideBookPayload(
    payload: CabmeCreateOSPayload,
    defaults: ReturnType<typeof resolveDefaults>
) {
    return {
        user_id: defaults.userId,
        latitude_depart: defaults.lat,
        longitude_depart: defaults.lng,
        latitude_arrivee: defaults.destLat,
        longitude_arrivee: defaults.destLng,
        depart_name: payload.location || "Local não informado",
        destination_name: defaults.destName,
        total_people: defaults.totalPeople,
        total_children: defaults.totalChildren,
        sub_total: defaults.subTotal,
        distance: defaults.distance,
        duration: defaults.duration,
        vehicle_type_id: defaults.vehicleTypeId,
        customer_name: payload.name,
        customer_phone: payload.phone ?? undefined,
        service_type: payload.serviceType,
        plate: payload.plate
    };
}

export async function cabmeCreateOS(env: WorkerEnv, payload: CabmeCreateOSPayload): Promise<CabmeCreateOSResult> {
    const config = getConfig(env);
    const url = resolveCreateOsUrl(config.cabme.baseUrl, config.cabme.createOsPath ?? env.CABME_CREATE_OS_PATH);
    const defaults = resolveDefaults(config);
    const body = buildRideBookPayload(payload, defaults);

    let response: Response;
    try {
        response = await fetchWithTimeout(
            url,
            {
                method: "POST",
                headers: {
                    apikey: config.cabme.apikey,
                    accesstoken: config.cabme.accesstoken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            },
            config.timeoutMs
        );
    } catch (error) {
        return {
            ok: false,
            status: null,
            errorBody: error instanceof Error ? error.message : "fetch_error"
        };
    }
    const rawText = await response.text().catch(() => "");
    const data = rawText
        ? (() => {
            try {
                return JSON.parse(rawText) as unknown;
            } catch {
                return null;
            }
        })()
        : null;
    const protocol = pickProtocol(data ?? undefined) ?? undefined;
    const osId =
        typeof (data as { osId?: unknown } | null)?.osId === "string"
            ? ((data as { osId?: unknown }).osId as string)
            : protocol;

    return {
        ok: response.ok,
        status: response.status,
        protocol,
        osId,
        errorBody: response.ok ? undefined : rawText
    };
}
