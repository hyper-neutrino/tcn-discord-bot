import client from "../client.js";
import db from "../db.js";

export async function set_setting(setting, value) {
    await db.query(
        `insert into settings values ($1, $2) on conflict (setting) do update set value = $2`,
        [setting, value]
    );
}

export async function get_setting(setting) {
    const results = await db.query(
        `select value from settings where setting = $1`,
        [setting]
    );
    return results.rows.length > 0 ? results.rows[0].value : undefined;
}

export async function get_setting_member(setting) {
    try {
        const value = await get_setting(setting);
        if (!value) return;
        return await client.home.members.fetch(value);
    } catch {}
}

export async function get_setting_role(setting) {
    try {
        const value = await get_setting(setting);
        if (!value) return;
        return await client.home.roles.fetch(value);
    } catch {}
}

export async function get_setting_channel(setting) {
    try {
        const value = await get_setting(setting);
        if (!value) return;
        return await client.home.channels.fetch(value);
    } catch {}
}
