import client from "../client.js";
import {
    add_permission,
    list_permissions_by_snowflake,
    list_snowflakes_by_permission,
    remove_permission,
} from "../db/permissions.js";
import { expand } from "../format.js";

export const command = {
    name: "permission",
    description: "Permission commands.",
    type: "CHAT_INPUT",
    options: [
        {
            name: "grant",
            description: "Grant permission to a role/user.",
            type: "SUB_COMMAND",
            options: [
                {
                    name: "permission",
                    description: "the permission to grant",
                    type: "STRING",
                    required: true,
                },
                {
                    name: "target",
                    description: "the target to grant permission to",
                    type: "MENTIONABLE",
                    required: true,
                },
            ],
        },
        {
            name: "deny",
            description: "Remove a permission from a role/user.",
            type: "SUB_COMMAND",
            options: [
                {
                    name: "permission",
                    description: "the permission to remove",
                    type: "STRING",
                    required: true,
                },
                {
                    name: "target",
                    description: "the target to remove permissions from",
                    type: "MENTIONABLE",
                    required: true,
                },
            ],
        },
        {
            name: "list",
            description: "List the roles and users who have a permission.",
            type: "SUB_COMMAND",
            options: [
                {
                    name: "permission",
                    description: "the permission to show",
                    type: "STRING",
                    required: true,
                },
            ],
        },
        {
            name: "get",
            description: "Get the permissions for a role/user.",
            type: "SUB_COMMAND",
            options: [
                {
                    name: "target",
                    description: "the target to show permissions for",
                    type: "MENTIONABLE",
                    required: true,
                },
            ],
        },
    ],
};

export async function execute(interaction) {
    const sub = interaction.options.getSubcommand(true);
    const permission = interaction.options.getString(
        "permission",
        sub == "grant" || sub == "deny" || sub == "list"
    );
    const target = interaction.options.getMentionable(
        "target",
        sub == "grant" || sub == "deny" || sub == "get"
    );
    if (sub == "grant") {
        await add_permission(permission, target.id);
        return [
            `Granted permission \`${permission}\` to ${target}.`,
            `Granted permission \`${permission}\` to ${expand(target)}`,
        ];
    } else if (sub == "deny") {
        await remove_permission(permission, target.id);
        return [
            `Removed permission \`${permission}\` from ${target}.`,
            `Removed permission \`${permission}\` from ${expand(target)}`,
        ];
    } else if (sub == "list") {
        const results = [];
        for (const id of await list_snowflakes_by_permission(permission)) {
            try {
                const user = await client.users.fetch(id);
                if (!user) throw 0;
                results.push(user);
                continue;
            } catch {}
            try {
                const role = await client.home.roles.fetch(id);
                if (!role) throw 0;
                results.push(role);
                continue;
            } catch {}
        }
        return (
            results.map((result) => result.toString()).join(", ") || "(none)"
        );
    } else if (sub == "get") {
        return (
            (await list_permissions_by_snowflake(target.id))
                .map((key) => `\`${key}\``)
                .join(", ") || "(none)"
        );
    }
}
