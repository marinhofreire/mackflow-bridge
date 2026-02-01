import axios from "axios";
import { config } from "../config";

const zproClient = axios.create({
    baseURL: config.zpro.baseUrl,
    timeout: 15000,
    headers: {
        Authorization: `Bearer ${config.zpro.token}`
    }
});

export async function listTickets() {
    return zproClient.get(`/v2/api/external/${config.zpro.apiId}/listTickets`, {
        params: {
            pageNumber: 1,
            status: "open"
        }
    });
}
