import db from "../db.js";

export async function add_permission(permission, snowflake) {
    await db.query(
        `insert into permissions values ($1, $2) on conflict (permission, snowflake) do nothing`,
        [permission, snowflake]
    );
}

export async function remove_permission(permission, snowflake) {
    await db.query(
        `delete from permissions where permission = $1 and snowflake = $2`,
        [permission, snowflake]
    );
}

export async function has_permission(permission, member) {
    if (permission == "everyone") return true;
    if (member.id == member.guild.ownerId) return true;
    for (const id of [member.id, ...member.roles.cache.keys()]) {
        if (
            (
                await db.query(
                    `select count(*) from permissions where permission = $1 and snowflake = $2`,
                    [permission, id]
                )
            ).rows[0].count > 0
        ) {
            return true;
        }
    }
    return false;
}

export async function list_snowflakes_by_permission(permission) {
    return (
        await db.query(
            `select snowflake from permissions where permission = $1`,
            [permission]
        )
    ).rows.map((row) => row.snowflake);
}

export async function list_permissions_by_snowflake(snowflake) {
    return (
        await db.query(
            `select permission from permissions where snowflake = $1`,
            [snowflake]
        )
    ).rows.map((row) => row.permission);
}
