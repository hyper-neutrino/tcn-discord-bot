import { Role } from "discord.js";
import client from "../client.js";
import {
    deny_permission,
    get_permissions,
    grant_permission,
    reset_permission,
} from "../db/permissions.js";
import { expand } from "../format.js";
import { double } from "../utils.js";

const key = {
    name: "key",
    description: "the permission",
    type: "STRING",
    required: true,
};

const target = {
    name: "target",
    description: "the user or role",
    type: "MENTIONABLE",
    required: true,
};

export const command = {
    name: "permission",
    description: "Permission commands.",
    type: "CHAT_INPUT",
    options: [
        {
            name: "grant",
            description: "Grant a permission to a user or role.",
            type: "SUB_COMMAND",
            options: [key, target],
        },
        {
            name: "deny",
            description: "Remove a permission from a user or role.",
            type: "SUB_COMMAND",
            options: [key, target],
        },
        {
            name: "reset",
            description:
                "Reset users and roles for a permission (remove from all).",
            type: "SUB_COMMAND",
            options: [key],
        },
        {
            name: "show",
            description:
                "Show the users and roles that have access to a permission.",
            type: "SUB_COMMAND",
            options: [key],
        },
    ],
};

export async function execute(interaction, { sub, key, target }) {
    if (sub == "grant") {
        await grant_permission(key, target.id);
        return double(`Granted permission \`${key}\` to ${expand(target)}.`);
    } else if (sub == "deny") {
        await deny_permission(key, target.id);
        return double(`Denied permission \`${key}\` from ${expand(target)}.`);
    } else if (sub == "reset") {
        await reset_permission(key);
        return double(
            `Reset permission \`${key}\` denying it from all users and roles.`
        );
    } else if (sub == "show") {
        const users = [];
        const roles = [];
        for (const snowflake of await get_permissions(key)) {
            try {
                users.push(await client.users.fetch(snowflake));
                continue;
            } catch {}
            try {
                const role = await client.home.roles.fetch(snowflake);
                if (!(role instanceof Role)) throw 0;
                roles.push(role);
                continue;
            } catch {}
        }
        return `**Access for permission \`${key}\`:**\n\nUsers: ${
            users.map(expand).join(", ") || "(none)"
        }\n\nRoles: ${roles.map(expand).join(", ") || "(none)"}`;
    }
}
