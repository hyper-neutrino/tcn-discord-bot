import { get_council, get_voters } from "../api.js";
import { get_poll, get_polls } from "../db/polls.js";

export const command = {
    name: "voter-list",
    description: "List eligible voters and whether or not they've voted.",
    type: "CHAT_INPUT",
    options: [
        {
            name: "id",
            description: "The poll ID.",
            type: "STRING",
            required: true,
            autocomplete: true,
        },
    ],
};

export async function execute(interaction, { id }) {
    const poll = await get_poll(id);
    if (!poll) return "There is no poll by this ID.";

    const eligible = poll.restrict ? await get_voters() : await get_council();
    const voted = new Set(Object.keys(poll.votes));

    const output = [];

    for (const id of eligible) {
        const user = await interaction.client.users.fetch(id);
        output.push(`${voted.has(id) ? "✅" : "❌"} ${user.id} ${user.tag}`);
    }

    await interaction.reply({
        files: [
            {
                attachment: Buffer.from(
                    `Quorum: ${(voted.size / eligible.size) * 100}%\n\n` +
                        output.join("\n")
                ),
                name: "voters.txt",
            },
        ],
    });
}

export async function autocomplete(interaction) {
    const query = interaction.options.getFocused();
    return (await get_polls())
        .map((poll) => poll.id)
        .filter((x) => x.match(query));
}
