import client from "./client.js";
import {
    get_poll,
    get_polls,
    set_poll_closed,
    set_poll_valid,
} from "./db/polls.js";
import { get_setting, get_setting_role } from "./db/settings.js";
import { create_gist } from "./gist.js";
import { alphabet_emojis } from "./utils.js";

function tally(poll, ballots) {
    if (poll.type == "proposal") {
        var yes = 0,
            no = 0;
        for (const ballot of ballots) {
            if (ballot == "yes") ++yes;
            if (ballot == "no") ++no;
        }
        return { yes, no };
    } else if (poll.type == "select") {
        const keys = poll.options;
        const score = {};
        var total = 0;
        for (const key of keys) score[key] = 0;
        for (const ballot of ballots) {
            ++score[ballot];
            ++total;
        }
        keys.sort((a, b) => score[b] - score[a]);
        return {
            total,
            scores: keys.map((key) => ({ key, score: score[key] })),
        };
    } else if (poll.type == "ranked") {
        const keys = poll.options;
        const score = {};
        var total = 0;
        for (const key of keys) score[key] = 0;
        for (const ballot of ballots) {
            if (ballot == -1) continue;
            ballot.forEach((item, index) => (score[item] += index + 1));
            ++total;
        }
        keys.sort((a, b) => score[a] - score[b]);
        return {
            total,
            scores: keys.map((key) => ({ key, score: score[key] })),
        };
    }
}

export async function show_poll(poll) {
    const embed = {
        title: `[ **${poll.id}** ]`,
        color: await get_setting("embed-color"),
        description: `**${poll.question}**`,
        fields: [],
        footer: {
            text: [
                poll.restrict ? "voter only" : "open to all",
                poll.quorum
                    ? `quorum required: ${poll.quorum}%`
                    : "quorum not needed",
                poll.hide ? "results hidden" : "real-time result",
                poll.anonymous ? "anonymous" : "not anonymous",
                poll.mandatory ? "mandatory" : "optional",
            ].join(" | "),
        },
    };
    if (!poll.hide || poll.closed) {
        var value = "...";
        if (poll.hide && !poll.valid) {
            value = `This poll failed to reach quorum and its votes are hidden, so the results will not be disclosed.${
                poll.mandatory && poll.missing
                    ? ` Missing voters: ${[...poll.missing]
                          .map(([id, member]) => `${member.user.tag} \`${id}\``)
                          .join(", ")}`
                    : ""
            }`;
        } else {
            const ballots = Object.keys(poll.votes || {}).map(
                (key) => poll.votes[key]
            );
            var abstain = 0;
            for (const ballot of ballots) if (ballot == -1) ++abstain;
            if (poll.type == "proposal") {
                const { yes, no } = tally(poll, ballots);
                const size = 10;
                const left = Math.round((size * yes) / (yes + no));
                const right = size - left;
                value = `⬆️ ${yes}   ${"🟩".repeat(left)}${
                    yes + no == 0 ? "⬜".repeat(size) : ""
                }${"🟥".repeat(right)}   ${no} ⬇️\n\n(${(
                    (yes / (yes + no || 1)) *
                    100
                ).toFixed(2)}% approval)`;
            } else if (poll.type == "select") {
                const { total, scores } = tally(poll, ballots);
                value = scores
                    .map(
                        ({ key, score }) =>
                            `${key} - **${score} vote${
                                score == 1 ? "" : "s"
                            }** (${((score / (total || 1)) * 100).toFixed(2)}%)`
                    )
                    .join("\n");
            } else if (poll.type == "ranked") {
                value = `(Lower score is better)\n\n${tally(poll, ballots)
                    .scores.map(
                        ({ key, score }) => `${key} - **score: ${score}**`
                    )
                    .join("\n")}`;
            }
            value += `\n\n${abstain} voter${
                abstain == 1 ? "" : "s"
            } abstained.`;
        }
        embed.fields.push({
            name: "Results",
            value: value,
        });
    }
    const components = [];
    if (poll.type == "proposal") {
        components.push({
            type: "ACTION_ROW",
            components: [
                {
                    type: "BUTTON",
                    style: "SUCCESS",
                    customId: `poll.${poll.id}.vote-yes`,
                    emoji: "⬆️",
                    disabled: poll.closed,
                },
                {
                    type: "BUTTON",
                    style: "DANGER",
                    customId: `poll.${poll.id}.vote-no`,
                    emoji: "⬇️",
                    disabled: poll.closed,
                },
            ],
        });
    } else if (poll.type == "select") {
        components.push({
            type: "ACTION_ROW",
            components: [
                {
                    type: "SELECT_MENU",
                    customId: `poll.${poll.id}.vote`,
                    options: poll.options.map((option, index) => ({
                        label: option,
                        value: option,
                        emoji: alphabet_emojis[index],
                    })),
                    disabled: poll.closed,
                },
            ],
        });
    } else if (poll.type == "ranked") {
        components.push({
            type: "ACTION_ROW",
            components: [
                {
                    type: "BUTTON",
                    style: "PRIMARY",
                    customId: `poll.${poll.id}.rank`,
                    label: "VOTE",
                    disabled: poll.closed,
                },
            ],
        });
    }
    components.push({
        type: "ACTION_ROW",
        components: [
            {
                type: "BUTTON",
                style: "PRIMARY",
                customId: `poll.${poll.id}.abstain`,
                label: "ABSTAIN",
                disabled: poll.closed,
            },
            {
                type: "BUTTON",
                style: "SUCCESS",
                customId: `poll.${poll.id}.view`,
                label: "VIEW YOUR VOTE",
            },
            {
                type: "BUTTON",
                style: "SECONDARY",
                customId: `poll.${poll.id}.info`,
                emoji: "ℹ️",
            },
            ...(poll.anonymous
                ? []
                : [
                      {
                          type: "BUTTON",
                          style: "SECONDARY",
                          customId: `poll.${poll.id}.votes`,
                          emoji: "🗳️",
                      },
                  ]),
        ],
    });
    return { embeds: [embed], components };
}

export async function update_poll(message, id) {
    await message.edit(await show_poll(await get_poll(id)));
}

export async function get_poll_message(poll) {
    try {
        const channel = await client.channels.fetch(poll.channel_id);
        const message = await channel.messages.fetch(poll.message_id);
        return message;
    } catch {}
}

export async function close_poll(poll) {
    const summarize = !poll.closed;
    await set_poll_closed(poll.id);
    poll.closed = true;
    const ballots = [];
    var index = 0;
    const voter = await get_setting_role("voter");
    for (const key of Object.keys(poll.votes || {})) {
        try {
            const member = await client.home.members.fetch(key);
            if (!poll.restrict || (voter && member.roles.cache.has(voter.id))) {
                ballots.push({
                    name: poll.anonymous
                        ? `ANON VOTER #${++index}`
                        : member.user.tag,
                    vote: poll.votes[key],
                });
            }
        } catch (error) {
            console.error(error);
        }
    }
    var valid = false;
    const permitted = new Map();
    if (poll.quorum) {
        if (poll.restrict) {
            if (voter) {
                for (const member of voter.members.values()) {
                    permitted.set(member.id, member);
                }
            }
        } else {
            client.home.members.cache
                .toJSON()
                .filter((x) => !x.user.bot)
                .forEach((x) => permitted.set(x.id, x));
        }
        if (ballots.length * 100 >= permitted.size * poll.quorum) {
            valid = true;
        }
    } else {
        valid = true;
    }
    if (poll.mandatory) {
        for (const key of Object.keys(poll.votes || {})) {
            permitted.delete(key);
        }
        poll.missing = permitted;
    }
    await set_poll_valid(poll.id, valid);
    poll.valid = valid;
    const message = await get_poll_message(poll);
    if (summarize) {
        if (valid) {
            var text = "";
            const print = (line) => (text += (line || "") + "  \n");
            print("# Ballots");
            print();
            for (const ballot of ballots) {
                if (ballot.vote == -1) continue;
                print(
                    `- ${ballot.name}: \`${[ballot.vote].flat().join(" > ")}\``
                );
            }
            print();
            print("# Evaluation");
            print();
            const values = ballots.map((ballot) => ballot.vote);
            if (poll.type == "proposal") {
                const { yes, no } = tally(poll, values);
                print(`TOTAL: ${yes} in favor - ${no} in opposition`);
                if (yes > no) {
                    print("\\>50% approval: **MOTION PASSED**");
                } else if (yes < no) {
                    print("\\<50% approval: **MOTION FAILED**");
                } else {
                    print("\\=50% approval: **TIED VOTE**");
                }
            } else if (poll.type == "select" || poll.type == "ranked") {
                const { total, scores } = tally(poll, values);
                const winners = [];
                for (const { key, score } of scores) {
                    if (score != scores[0].score) break;
                    winners.push(key);
                }
                for (const { key, score } of scores) {
                    print(
                        `${key}: ${score}${
                            poll.type == "select"
                                ? ` = ${(score / total) * 100}%`
                                : ""
                        }`
                    );
                }
                print();
                print("WINNERS:");
                for (const winner of winners) {
                    print(`- ${winner}`);
                }
            }
            if (poll.mandatory) {
                print();
                print("# Missing Votes (Mandatory Poll)");
                for (const [id, member] of permitted) {
                    print(`- ${member.user.tag} \`${id}\``);
                }
            }
            const url = await create_gist(
                `poll-${poll.id}.md`,
                `Conclusion for the results of the poll: ${poll.id} (${poll.question})`,
                text
            );
            if (message) {
                await message.reply({
                    embeds: [
                        {
                            title: "Vote Concluded and Validated",
                            description: `You can view the full vote summary here: ${url}`,
                            color:
                                (await get_setting("embed-color")) || "d9e9f9",
                            fields: poll.mandatory
                                ? [
                                      {
                                          name: "Mandatory Poll: Results",
                                          value: `Missing voters: ${permitted.size}`,
                                      },
                                  ]
                                : [],
                        },
                    ],
                });
            }
        } else if (poll.mandatory) {
            if (message) {
                await message.reply({
                    content: `The following users failed to vote: ${[
                        ...permitted,
                    ]
                        .map(([id, member]) => `${member} (${member.user.tag})`)
                        .join(", ")}`,
                    allowedMentions: { parse: [] },
                });
            }
        }
    }
    if (message) {
        await message.edit(await show_poll(poll));
    }
}

export async function is_voter(member) {
    const role = await get_setting_role("voter");
    if (!role) return false;
    return member.roles.cache.has(role.id);
}

setInterval(async () => {
    for (const poll of await get_polls()) {
        if (poll.time && !poll.closed && poll.time <= new Date()) {
            close_poll(poll);
        }
    }
}, 10000);
