import {
    get_setting_channel,
    get_setting_role,
    set_setting,
} from "../db/settings.js";
import { expand } from "../format.js";

const channels = ["logs", "polls"];
const roles = ["voter"];

export const command = {
    name: "setting",
    description: "Settings commands.",
    type: "CHAT_INPUT",
    options: [
        {
            name: "set",
            description: "Set a setting.",
            type: "SUB_COMMAND_GROUP",
            options: [
                [
                    "channel",
                    "CHANNEL",
                    channels,
                    {
                        channelTypes: [
                            "GUILD_TEXT",
                            "GUILD_NEWS",
                            "GUILD_NEWS_THREAD",
                            "GUILD_PUBLIC_THREAD",
                            "GUILD_PRIVATE_THREAD",
                        ],
                    },
                ],
                ["role", "ROLE", roles],
            ].map(([name, type, keys, extra = {}]) => ({
                name,
                description: `Set a ${name} setting.`,
                type: "SUB_COMMAND",
                options: [
                    {
                        name: "key",
                        description: "the setting to modify",
                        type: "STRING",
                        required: true,
                        choices: keys.map((key) => ({ name: key, value: key })),
                    },
                    {
                        name,
                        description: `the ${name} to set to`,
                        type,
                        required: true,
                        ...extra,
                    },
                ],
            })),
        },
        {
            name: "get",
            description: "View a setting.",
            type: "SUB_COMMAND_GROUP",
            options: [
                ["channel", channels],
                ["role", roles],
            ].map(([name, keys]) => ({
                name,
                description: `Get a ${name} setting.`,
                type: "SUB_COMMAND",
                options: [
                    {
                        name: "key",
                        description: "the setting to fetch",
                        type: "STRING",
                        required: true,
                        choices: keys.map((key) => ({ name: key, value: key })),
                    },
                ],
            })),
        },
    ],
};

export async function execute(interaction) {
    const subgroup = interaction.options.getSubcommandGroup(true);
    const sub = interaction.options.getSubcommand(true);
    const key = interaction.options.getString("key", true);
    if (subgroup == "set") {
        if (sub == "channel") {
            const channel = interaction.options.getChannel("channel", true);
            await set_setting(key, channel.id);
            return [
                `Set setting \`${key}\` to ${channel}.`,
                `Setting \`${key}\` modified to ${expand(channel)}.`,
            ];
        } else if (sub == "role") {
            const role = interaction.options.getRole("role", true);
            await set_setting(key, role.id);
            return [
                `Set setting \`${key}\` to ${role}.`,
                `Setting \`${key}\` modified to ${expand(role)}`,
            ];
        }
    } else if (subgroup == "get") {
        if (sub == "channel") {
            const channel = await get_setting_channel(key);
            return `Setting \`${key}\` is set to ${channel}.`;
        } else if (sub == "role") {
            const role = await get_setting_role(key);
            return `Setting \`${key}\` is set to ${role}.`;
        }
    }
}
