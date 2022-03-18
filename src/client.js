import { Client, Intents } from "discord.js";

export default new Client({
    intents: new Intents(32767),
    partials: ["CHANNEL", "MESSAGE", "REACTION"],
});
