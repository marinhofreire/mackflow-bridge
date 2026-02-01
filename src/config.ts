import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
    PORT: z.coerce.number().int().positive(),
    CABME_BASE_URL: z.string().min(1),
    CABME_APIKEY: z.string().min(1),
    CABME_ACCESSTOKEN: z.string().min(1),
    ZPRO_BASE_URL: z.string().min(1),
    ZPRO_API_ID: z.string().min(1),
    ZPRO_TOKEN: z.string().min(1)
});

const env = envSchema.parse(process.env);

export const config = {
    port: env.PORT,
    cabme: {
        baseUrl: env.CABME_BASE_URL,
        apikey: env.CABME_APIKEY,
        accesstoken: env.CABME_ACCESSTOKEN
    },
    zpro: {
        baseUrl: env.ZPRO_BASE_URL,
        apiId: env.ZPRO_API_ID,
        token: env.ZPRO_TOKEN
    }
};
