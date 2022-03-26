import { db } from "../db.js";
import {
    create_poll,
    get_poll,
    get_polls,
    set_poll_deadline,
    set_poll_message,
    set_poll_open,
} from "../db/polls.js";
import { expand, timestamp } from "../format.js";
import { post_modal } from "../modals.js";
import { close_poll, get_poll_message, show_poll } from "../polls.js";
import { double } from "../utils.js";

const id = {
    name: "id",
    description:
        "the poll ID (must be unique across all polls, ≤ 16 chars, no periods)",
    type: "STRING",
    required: true,
};

const duration = {
    name: "duration",
    description: "the number of hours for which to keep the poll open",
    type: "NUMBER",
    required: true,
};

export const command = {
    name: "poll",
    description: "Poll commands.",
    type: "CHAT_INPUT",
    options: [
        {
            name: "create",
            description: "Create a poll.",
            type: "SUB_COMMAND",
            options: [
                id,
                {
                    name: "type",
                    description: "the poll type",
                    type: "STRING",
                    required: true,
                    choices: ["proposal", "select", "ranked"].map((option) => ({
                        name: option,
                        value: option,
                    })),
                },
                {
                    name: "question",
                    description: "the poll question",
                    type: "STRING",
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
                    name: "quorum",
                    description:
                        "the threshold of voters that must vote for this poll to be valid",
                    type: "INTEGER",
                    required: true,
                    minValue: 0,
                    maxValue: 100,
                },
                {
                    name: "hide",
                    description:
                        "whether or not to hide the poll results until it closes",
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
                    name: "mandatory",
                    description:
                        "set this to TRUE to track voting (for voting mandates)",
                    type: "BOOLEAN",
                    required: true,
                },
            ],
        },
        {
            name: "post",
            description: "Post a poll in the current channel.",
            type: "SUB_COMMAND",
            options: [{ ...id, autocomplete: true }, duration],
        },
        {
            name: "close",
            description: "Close a poll immediately.",
            type: "SUB_COMMAND",
            options: [{ ...id, autocomplete: true }],
        },
        {
            name: "delete",
            description: "Delete a poll.",
            type: "SUB_COMMAND",
            options: [{ ...id, autocomplete: true }],
        },
    ],
};

export async function execute(
    interaction,
    {
        sub,
        id,
        type,
        question,
        restrict,
        quorum,
        hide,
        anonymous,
        mandatory,
        duration,
    }
) {
    if (id.length > 16) return "ID cannot exceed 16 characters.";
    if (id.match("\\.")) return "ID cannot contain periods.";
    if (sub == "create") {
        if (await get_poll(id)) {
            return "This poll ID is already in use.";
        }
        const poll = {
            id,
            type,
            question,
            restrict,
            quorum,
            hide,
            anonymous,
            mandatory,
        };
        if (type == "select" || type == "ranked") {
            const modal = await post_modal(interaction, {
                title: "Poll Options",
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                style: 2,
                                custom_id: "options",
                                label: "Enter poll options line-by-line",
                                placeholder: "≤ 25 options, ≤ 100 chars each",
                            },
                        ],
                    },
                ],
            });
            const options = modal.data.components[0].components[0].value
                .split("\n")
                .map((x) => x.trim())
                .filter((x) => x);
            if (options.length <= 0) {
                return await modal.respond({
                    flags: 64,
                    content: "You must specify at least one option.",
                });
            } else if (options.length > 25) {
                return await modal.respond({
                    flags: 64,
                    content: "You must not specify more than 25 options.",
                });
            } else if (options.some((x) => x.length > 100)) {
                return await modal.respond({
                    flags: 64,
                    content: "Options must not be longer than 100 characters.",
                });
            }
            poll.options = options;
            await create_poll(poll);
            await modal.respond({
                flags: 64,
                content: `Created poll with ID \`${id}\`.`,
            });
            await interaction.log(`Created poll with ID \`${id}\`.`);
        } else {
            await create_poll(poll);
            return double(`Created poll with ID \`${id}\`.`);
        }
    } else if (sub == "post") {
        const poll = await get_poll(id);
        if (!poll) return "There is no poll by that ID.";
        if (await get_poll_message(poll)) return "This poll is already posted.";
        poll.closed = false;
        const message = await interaction.channel.send(await show_poll(poll));
        const time = new Date();
        time.setSeconds(time.getSeconds() + duration * 3600);
        await set_poll_message(id, message);
        await set_poll_deadline(id, time);
        await set_poll_open(id);
        return double(
            `Posted poll \`${id}\` in ${expand(
                interaction.channel
            )} closing ${timestamp(time)}`
        );
    } else if (sub == "close") {
        const poll = await get_poll(id);
        if (!poll) return "There is no poll by that ID.";
        if (poll.closed) return "This poll is already closed.";
        close_poll(poll);
        return double(`Manually closed poll \`${id}\`.`);
    } else if (sub == "delete") {
        const poll = await get_poll(id);
        if (!poll) return "There is no poll by that ID.";
        await db.polls.findOneAndDelete({ id });
        return double(`Delete poll \`${id}\`.`);
    }
}

export async function autocomplete(interaction) {
    const query = interaction.options.getFocused();
    return (await get_polls())
        .map((poll) => poll.id)
        .filter((x) => x.match(query));
}
