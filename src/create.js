import path from "path";

import client from "./client.js";
import config from "./config.js";
import loadDir from "./loadDir.js";

client.on("ready", async () => {
    console.log("Creating commands...");

    const guild = await client.guilds.fetch("927153548339343360");

    for (const [, { command }] of await loadDir(
        path.join(process.cwd(), "src", "commands")
    )) {
        console.log("Creating:", command.name);
        await guild.commands.create(command);
    }

    console.log("Done creating commands.");
    process.exit();
});

client.login(config.discord_token);
