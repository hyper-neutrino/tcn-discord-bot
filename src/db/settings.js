import client from "../client.js";
import { db } from "../db.js";

export async function get_setting(key) {
    const entry = await db.settings.findOne({ key });
    return entry && entry.value;
}

export async function get_setting_channel(key) {
    try {
        return await client.channels.fetch(await get_setting(key));
    } catch {}
}

export async function get_setting_role(key) {
    try {
        return await client.home.roles.fetch(await get_setting(key));
    } catch {}
}

export async function set_setting(key, value) {
    await db.settings.findOneAndUpdate(
        { key },
        { $set: { value } },
        { upsert: true }
    );
}
