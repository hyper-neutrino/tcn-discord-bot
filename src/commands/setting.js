import { get_setting, set_setting } from "../db/settings.js";
import { double } from "../utils.js";

const key = {
    name: "key",
    description: "the setting key",
    type: "STRING",
    required: true,
};

export const command = {
    name: "setting",
    description: "Settings commands.",
    type: "CHAT_INPUT",
    options: [
        {
            name: "set",
            description: "Set a setting.",
            type: "SUB_COMMAND_GROUP",
            options: ["role", "channel", "string", "number"].map((type) => ({
                name: type,
                description: `Set a setting to a ${type}.`,
                type: "SUB_COMMAND",
                options: [
                    key,
                    {
                        name: type,
                        description: `the ${type} to set`,
                        type: type.toUpperCase(),
                        required: true,
                    },
                ],
            })),
        },
        {
            name: "get",
            description: "Get a setting.",
            type: "SUB_COMMAND",
            options: [key],
        },
    ],
};

export async function execute(
    interaction,
    { subgroup, sub, key, role, channel, string, number }
) {
    if (subgroup == "set") {
        const value =
            (role && role.id) ?? (channel && channel.id) ?? string ?? number;
        await set_setting(key, value);
        return double(`Setting \`${key}\` has been updated to \`${value}\`.`);
    } else if (sub == "get") {
        return `Setting \`${key}\` is currently set to \`${await get_setting(
            key
        )}\`.`;
    }
}
