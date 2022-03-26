import { get_setting } from "./db/settings.js";
import { is_string } from "./utils.js";
import { expand } from "./format.js";
import { log } from "./logging.js";

export async function transform(interaction) {
    interaction.notify = async (message) =>
        await interaction.reply({
            ...(is_string(message) ? { content: message } : message),
            allowedMentions: { parse: [] },
            ephemeral: true,
            fetchReply: true,
        });
    interaction.log = async (message) => {
        console.log(
            `[CMD] ${interaction.user.tag} (${interaction.user.id}): /${interaction.commandName} - ${message}`
        );
        var reply;
        try {
            reply = await interaction.fetchReply();
        } catch {}
        return await log({
            embeds: [
                {
                    title: `Command Executed: ${interaction.commandName}`,
                    description: message,
                    color: (await get_setting("color-default")) || "d9e9f9",
                    fields: [
                        {
                            name: "Executor",
                            value: expand(interaction.user),
                        },
                        {
                            name: "Channel",
                            value: expand(interaction.channel),
                        },
                    ],
                    url: reply && reply.url,
                },
            ],
        });
    };
}

export async function handle(interaction, handler) {
    try {
        const options = {};
        if (interaction.isCommand()) {
            try {
                options.sub = interaction.options.getSubcommand();
            } catch {}
            try {
                options.subgroup = interaction.options.getSubcommandGroup();
            } catch {}
            for (const { name, type } of interaction.options._hoistedOptions) {
                options[name] =
                    interaction.options[
                        `get${type.charAt(0)}${type.substring(1).toLowerCase()}`
                    ](name);
            }
        }
        const response = await handler(interaction, options);
        if (response) throw response;
    } catch (error) {
        if (is_string(error)) {
            await interaction.notify(error);
        } else if (
            Array.isArray(error) &&
            error.length == 2 &&
            is_string(error[0]) &&
            is_string(error[1])
        ) {
            await interaction.notify(error[0]);
            await interaction.log(error[1]);
        } else {
            try {
                await interaction.notify("An unexpected error occurred!");
            } finally {
                throw error;
            }
        }
    }
}
