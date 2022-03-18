import { get_setting_channel } from "./db/settings.js";

export async function log(message) {
    const logs = await get_setting_channel("logs");
    if (!logs) return;
    return await logs.send(message);
}
