import axios from "axios";
import { config } from "../config";

const cabmeClient = axios.create({
    baseURL: config.cabme.baseUrl,
    timeout: 15000,
    headers: {
        apikey: config.cabme.apikey,
        accesstoken: config.cabme.accesstoken
    }
});

export async function getVehicleCategories() {
    return cabmeClient.get("Vehicle-category");
}
