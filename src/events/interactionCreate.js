import client from "../client.js";
import {
    get_poll,
    get_poll_options,
    get_poll_votes,
    set_poll_vote,
} from "../db/polls.js";
import { get_setting_role } from "../db/settings.js";
import { poll_embed } from "../polls.js";

export async function handle(interaction) {
    await check_poll(interaction);
    await check_poll_votes(interaction);
}

async function check_poll(interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("poll.")) return;
    const [poll_id, option_id] = interaction.customId
        .substring(5)
        .split(".")
        .map((id) => parseInt(id));
    const poll = await get_poll(poll_id);
    if (poll.restrict) {
        const voter = await get_setting_role("voter");
        if (!voter) {
            await interaction.notify(
                "You must have the voter role, which is not configured."
            );
            return;
        }
        if (!interaction.member.roles.cache.has(voter.id)) {
            await interaction.notify(`You must have the ${voter} role.`);
            return;
        }
    }
    const response = await set_poll_vote(
        poll_id,
        interaction.user.id,
        option_id
    );
    if (!response) {
        await interaction.notify("Your vote has been cleared.");
    } else {
        await interaction.notify(`Your vote has been set to: ${response}.`);
    }
    if (!poll.update) return;
    const channel = await client.channels.fetch(poll.channel_id);
    const message = await channel.messages.fetch(poll.message_id);
    await message.edit({ embeds: [await poll_embed(poll_id)] });
}

async function check_poll_votes(interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("poll_votes.")) return;
    const poll_id = parseInt(interaction.customId.substring(11));
    const poll = await get_poll(poll_id);
    if (poll.anonymous) {
        await interaction.notify("This poll is anonymous.");
    } else if (!poll.update && !poll.closed) {
        await interaction.notify(
            "This poll's votes cannot be viewed until after the poll is over."
        );
    } else {
        const options = await get_poll_options(poll_id);
        const voters = new Map();
        for (const option of options) {
            voters.set(option.id, []);
        }
        for (const vote of await get_poll_votes(poll_id)) {
            var string;
            try {
                string = (await client.users.fetch(vote.user_id)).tag;
            } catch {
                string = `[${vote.user_id}]`;
            }
            voters.get(vote.option_id).push(string);
        }
        await interaction.notify(
            options
                .map(
                    (option) =>
                        `**__${option.value}__**\n${
                            voters.get(option.id).join(", ") || "(none)"
                        }`
                )
                .join("\n\n")
        );
    }
}
