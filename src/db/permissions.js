import { db } from "../db.js";

export async function has_permission(key, member) {
    if (key == "@everyone") return true;
    if (member.guild.ownerId == member.id) return true;
    const entry = await db.permissions.findOne({ key });
    if (!entry) return false;
    if (!entry.snowflakes) return false;
    const snowflakes = new Set(entry.snowflakes);
    if (snowflakes.has(member.id)) return true;
    for (const id of member.roles.cache) {
        if (snowflakes.has(id)) return true;
    }
    return false;
}

export async function grant_permission(key, snowflake) {
    await db.permissions.findOneAndUpdate(
        { key },
        { $addToSet: { snowflakes: snowflake } },
        { upsert: true }
    );
}

export async function deny_permission(key, snowflake) {
    await db.permissions.findOneAndUpdate(
        { key },
        { $pull: { snowflakes: snowflake } }
    );
}

export async function reset_permission(key) {
    await db.permissions.findOneAndUpdate(
        { key },
        { $set: { snowflakes: [] } }
    );
}

export async function get_permissions(key) {
    const entry = await db.permissions.findOne({ key });
    return (entry && entry.snowflakes) || [];
}
