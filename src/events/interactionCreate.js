import { is_council, is_voter } from "../api.js";
import { get_poll, get_poll_vote, set_poll_vote } from "../db/polls.js";
import { post_modal } from "../modals.js";
import { close_poll, update_poll } from "../polls.js";

export async function handle(interaction) {
    const user_id = interaction.user.id;
    if (interaction.isButton() || interaction.isSelectMenu()) {
        const args = interaction.customId.split(".");
        if (args[0] == "poll") {
            const id = args[1];
            const sub = args[2];
            const result = await handle_poll(interaction, id, sub);
            if (
                sub == "vote-yes" ||
                sub == "vote-no" ||
                sub == "vote" ||
                sub == "rank" ||
                sub == "abstain"
            ) {
                update_poll(interaction.message, args[1]);
            }
            return result;
        }
    }
}

async function handle_poll(interaction, id, sub) {
    const poll = await get_poll(id);
    if (!poll) return "This poll appears not to exist anymore.";
    if (
        (sub == "vote-yes" ||
            sub == "vote-no" ||
            sub == "vote" ||
            sub == "rank" ||
            sub == "abstain") &&
        !(poll.restrict
            ? await is_voter(interaction.user.id)
            : await is_council(interaction.user.id))
    ) {
        return `This poll is restricted to ${
            poll.restrict ? "voters" : "council members"
        }.`;
    }
    const user_id = interaction.user.id;
    if (sub == "vote-yes") {
        if (poll.closed) {
            close_poll(poll);
            return "This poll is now closed.";
        }
        await set_poll_vote(id, user_id, "yes");
        return "Your vote has been set to IN FAVOR of the proposition.";
    } else if (sub == "vote-no") {
        if (poll.closed) {
            close_poll(poll);
            return "This poll is now closed.";
        }
        await set_poll_vote(id, user_id, "no");
        return "Your vote has been set to IN OPPOSITION to the proposition.";
    } else if (sub == "vote") {
        if (interaction.values.length != 1) {
            return "Poll selection count was invalid. This should probably not happen.";
        }
        const value = interaction.values[0];
        await set_poll_vote(id, user_id, value);
        return `Your vote has been set to \`${value}\`.`;
    } else if (sub == "rank") {
        const ranks = new Map();
        const ballot = (poll.votes || {})[user_id];
        if (ballot && ballot != -1) {
            ballot.forEach((key, index) => ranks.set(key, index + 1));
        }
        const modal = await post_modal(interaction, {
            title: "Ranked Vote",
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            style: 2,
                            custom_id: "ranks",
                            label: `1 = BEST, ${poll.options.length} = WORST`,
                            value: poll.options
                                .map((key) => `${key}: ${ranks.get(key) || ""}`)
                                .join("\n"),
                        },
                    ],
                },
            ],
        });
        const response = modal.data.components[0].components[0].value;
        const taken = new Set();
        const values = [];
        try {
            for (const line of response.split("\n")) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const [key, value] = trimmed.split(":");
                if (poll.options.indexOf(key) == -1) {
                    throw `Error: ${key} is not one of the options.`;
                } else if (!value) {
                    throw `Error: You did not rank ${key}.`;
                }
                const rank = parseInt(value) - 1;
                if (isNaN(rank)) {
                    throw `Error: I do not understand what ${value} is supposed to mean as a ranking.`;
                } else if (rank < 0) {
                    throw `Error: You cannot give non-positive ranks.`;
                } else if (rank >= poll.options.length) {
                    throw `Error: ${value} is out of range (1..${poll.options.length})`;
                } else if (values[rank]) {
                    throw `Error: You ranked two objects #${value}.`;
                } else if (taken.has(key)) {
                    throw `Error: You ranked \`${key}\` twice.`;
                } else {
                    values[rank] = key;
                }
            }
            await set_poll_vote(poll.id, user_id, values);
            throw `Your vote has been set to \`${values.join(" > ")}\`.`;
        } catch (message) {
            await modal.respond({
                flags: 64,
                content: message,
            });
        }
    } else if (sub == "view") {
        const vote = await get_poll_vote(id, user_id);
        if (!vote) {
            return "You have not voted yet.";
        } else if (vote == -1) {
            return "You have chosen to abstain.";
        } else {
            return `Your vote is currently \`${[vote].flat().join(" > ")}\`.`;
        }
    } else if (sub == "votes") {
        return (
            Object.keys(poll.votes || {})
                .map(
                    (key) =>
                        `<@${key}>: \`${
                            poll.votes[key] == -1
                                ? "ABSTAINED"
                                : [poll.votes[key]].flat().join(" > ")
                        }\``
                )
                .join("\n") || "(nobody has voted yet)"
        );
    } else if (sub == "abstain") {
        await set_poll_vote(id, user_id, -1);
        return "Your vote has been set to ABSTAIN.";
    } else if (sub == "info") {
        return `**POLL** \`${poll.id}\`:\n${
            {
                proposal:
                    "This is a **proposal** poll. You can vote in favor or against.",
                select: "This is a **select** poll. You can choose one of several options.",
                ranked: "This is a **ranked** poll. You must rank all options from best to worst.",
            }[poll.type]
        }\n\n__${poll.question}__\n\n- ${
            poll.restrict
                ? "This poll is **restricted** to voters only."
                : "This poll is **open** to all council members."
        }\n- ${
            poll.quorum
                ? `This poll **requires ${poll.quorum}% quorum** in order for the result to be valid.`
                : "This poll does **not require quorum** in order to be valid."
        }\n- ${
            poll.hide
                ? "This poll's results will be **hidden** until the poll closes and is valid."
                : "This poll's results will be **shown** in real-time as people vote."
        }\n- ${
            poll.anonymous
                ? "This poll's votes will be **anonymous**."
                : "This poll's voters and their selections will be **visible** via clicking the 🗳️ button."
        }\n- ${
            poll.mandatory
                ? "This poll is **mandatory** and voting will be tracked. Abstaining counts as voting."
                : "This poll is **optional** and voting will not be tracked."
        }`;
    }
}
