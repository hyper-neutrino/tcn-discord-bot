import client from "../client.js";
import {
    close_poll,
    create_poll,
    get_expired_polls,
    get_poll,
    get_poll_options,
    set_poll_date,
    set_poll_message,
    set_poll_options,
} from "../db/polls.js";
import { get_setting_channel } from "../db/settings.js";
import { expand } from "../format.js";
import { post_modal } from "../modals.js";
import { poll_embed } from "../polls.js";
import { alphabet_emojis, double, month_names } from "../utils.js";

export const command = {
    name: "poll",
    description: "Poll commands.",
    type: "CHAT_INPUT",
    options: [
        {
            name: "create",
            description: "Create a poll (does not post it).",
            type: "SUB_COMMAND",
            options: [
                {
                    name: "question",
                    description: "briefly explain what the poll is about",
                    type: "STRING",
                    required: true,
                },
                {
                    name: "short",
                    description:
                        "whether or not the poll is short-form (if so, the options are yes/abstain/no)",
                    type: "BOOLEAN",
                    required: true,
                },
                {
                    name: "restrict",
                    description:
                        "whether or not to restrict the poll to voters",
                    type: "BOOLEAN",
                    required: true,
                },
                {
                    name: "anonymous",
                    description: "whether or not the poll should be anonymous",
                    type: "BOOLEAN",
                    required: true,
                },
                {
                    name: "update",
                    description:
                        "whether or not the poll's current results should be updated in real-time",
                    type: "BOOLEAN",
                    required: true,
                },
            ],
        },
        {
            name: "post",
            description: "Post a poll.",
            type: "SUB_COMMAND",
            options: [
                {
                    name: "id",
                    description: "the poll id",
                    type: "INTEGER",
                    required: true,
                    minValue: 1,
                },
                {
                    name: "end_year",
                    description: "the year of the end date (UTC)",
                    type: "INTEGER",
                    required: true,
                    minValue: 1,
                },
                {
                    name: "end_month",
                    description: "the month of the end date (UTC)",
                    type: "STRING",
                    required: true,
                    choices: month_names.map((month) => ({
                        name: month,
                        value: month,
                    })),
                },
                {
                    name: "end_date",
                    description: "the end date (UTC)",
                    type: "INTEGER",
                    required: true,
                    minValue: 1,
                    maxValue: 31,
                },
                {
                    name: "end_hour",
                    description: "the hour of the end date (UTC - 24h time)",
                    type: "INTEGER",
                    required: true,
                    minValue: 0,
                    maxValue: 23,
                },
                {
                    name: "end_minute",
                    description: "the minute of the end date (UTC)",
                    type: "INTEGER",
                    required: true,
                    minValue: 0,
                    maxValue: 59,
                },
            ],
        },
    ],
};

export async function execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub == "create") {
        const question = interaction.options.getString("question", true);
        const short = interaction.options.getBoolean("short", true);
        const restrict = interaction.options.getBoolean("restrict", true);
        const anonymous = interaction.options.getBoolean("anonymous", true);
        const update = interaction.options.getBoolean("update", true);
        const id = await create_poll(
            question,
            short,
            restrict,
            anonymous,
            update
        );
        const success = `Poll created with id \`${id}\`.`;
        if (short) {
            await set_poll_options(id, ["👍", "🤐", "👎"]);
            await interaction.reply({ embeds: [{ description: success }] });
            await interaction.log(success);
        } else {
            const modal = await post_modal(interaction, {
                title: "Poll Options",
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                style: 2,
                                custom_id: "poll_options",
                                label: "Enter poll options line-by-line.",
                                placeholder:
                                    "option 1\noption 2\nmax 256 chars each\nmax 20 options",
                            },
                        ],
                    },
                ],
            });
            const options = modal.data.components[0].components[0].value
                .trim()
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line);
            if (options.length == 0) {
                await modal.respond({
                    flags: 64,
                    content: "You need to specify at least one option.",
                });
                return;
            } else if (options.length > 20) {
                await modal.respond({
                    flags: 64,
                    content: "There can only be up to 20 options.",
                });
            } else if (options.some((option) => option.length > 256)) {
                await modal.respond({
                    flags: 64,
                    content: "Options can only be at most 256 characters long.",
                });
                return;
            } else {
                await set_poll_options(id, options);
                await modal.respond({ embeds: [{ description: success }] });
                await interaction.log(`Poll created with id \`${id}\`.`);
            }
        }
    } else if (sub == "post") {
        const id = interaction.options.getInteger("id", true);
        const poll = await get_poll(id);
        if (!poll) return "Poll not found.";
        if (poll.posted) return "Poll already posted.";

        const year = interaction.options.getInteger("end_year", true);
        const month = month_names.indexOf(
            interaction.options.getString("end_month", true)
        );
        const date = interaction.options.getInteger("end_date", true);
        const hour = interaction.options.getInteger("end_hour", true);
        const minute = interaction.options.getInteger("end_minute", true);
        if (
            date >
            (month == 1
                ? year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
                    ? 29
                    : 28
                : month == 3 || month == 5 || month == 8 || month == 10
                ? 30
                : 31)
        ) {
            return "That date is invalid for the given month and year.";
        }
        const time = new Date(year, month, date, hour, minute);
        if (time < new Date()) {
            return "That date is invalid as it is in the past.";
        }

        const polls = await get_setting_channel("polls");
        if (!polls) return "The polls channel is not configured.";

        await set_poll_date(id, time);

        const components = [];
        const options = await get_poll_options(id);
        while (options.length > 0) {
            components.push({
                type: "ACTION_ROW",
                components: options.splice(0, 5).map((option) => ({
                    type: "BUTTON",
                    style: "SECONDARY",
                    custom_id: `poll.${poll.id}.${option.id}`,
                    emoji: poll.short
                        ? option.value
                        : alphabet_emojis[option.index],
                })),
            });
        }
        components.push({
            type: "ACTION_ROW",
            components: [
                {
                    type: "BUTTON",
                    style: "SECONDARY",
                    custom_id: `poll_votes.${poll.id}`,
                    emoji: "🗳️",
                    label: "see votes",
                    disabled: poll.anonymous || !poll.update,
                },
            ].flat(),
        });

        const message = await polls.send({
            embeds: [await poll_embed(id)],
            components,
        });

        await set_poll_message(id, message);

        return [
            `Posted to ${polls}.`,
            `Posted poll #${id} to ${expand(polls)}.`,
        ];
    }
}

setInterval(async () => {
    for (const poll of await get_expired_polls()) {
        try {
            const channel = await client.channels.fetch(poll.channel_id);
            const message = await channel.messages.fetch(poll.message_id);
            await message.edit({
                embeds: [await poll_embed(poll.id, true)],
                components: [
                    {
                        type: "ACTION_ROW",
                        components: message.components[
                            message.components.length - 1
                        ].components.map(
                            (component) => (
                                (component.disabled = poll.anonymous), component
                            )
                        ),
                    },
                ],
            });
            await close_poll(poll.id);
        } catch (error) {
            console.log(error);
        }
    }
}, 10000);
