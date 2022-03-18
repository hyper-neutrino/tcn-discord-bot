import { get_poll, get_poll_counts } from "./db/polls.js";
import { alphabet_emojis } from "./utils.js";

export async function poll_embed(id, expose) {
    const poll = await get_poll(id);
    const counts = await get_poll_counts(id);
    const update = poll.update || expose;
    return {
        title: `Poll #${id}`,
        color: "d9e9f9",
        fields: [
            {
                name: "**Poll Question**",
                value: poll.question,
                inline: true,
            },
            {
                name: "**Restriction**",
                value: poll.restrict ? "Voter only" : "Everyone",
                inline: true,
            },
            {
                name: "**Anonymous**",
                value: poll.anonymous ? "Yes" : "No",
                inline: true,
            },
            {
                name: "**Deadline**",
                value: `<t:${Math.floor(poll.end_date.getTime() / 1000)}>`,
                inline: true,
            },
            {
                name: "**Scores**",
                value: poll.short
                    ? update
                        ? counts
                              .map(([emoji, count]) => `${emoji} ${count}`)
                              .join(" ")
                        : "Scores are hidden until the poll closes."
                    : counts
                          .map(
                              ([option, count], index) =>
                                  `${alphabet_emojis[index]} ${option}${
                                      update
                                          ? ` - **${count} vote${
                                                count == 1 ? "" : "s"
                                            }**`
                                          : ""
                                  }`
                          )
                          .join("\n"),
            },
        ],
    };
}
