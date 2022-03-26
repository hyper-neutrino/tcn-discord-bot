import path from "path";

import config from "./config.js";
import client from "./client.js";
import { handle, transform } from "./interactionutils.js";
import loadDir from "./loadDir.js";
import { has_permission } from "./db/permissions.js";
import { db, db_client } from "./db.js";

process.on("uncaughtException", (error) => {
    console.error("UNEXPECTED UNCAUGHT EXCEPTION");
    console.error("=============================");
    console.error(error);
});

const to_log = new Set();
const commands = new Map();
const autocompletes = new Map();
const permissions = new Map();
let interaction_listener;

for (const [, { command, execute, autocomplete }] of await loadDir(
    path.join(process.cwd(), "src", "commands")
)) {
    commands.set(command.name, execute);
    if (command.log !== false) to_log.add(command.name);
    permissions.set(command.name, command.permission || command.name);
    if (autocomplete) autocompletes.set(command.name, autocomplete);
}

for (const [file, { handle }] of await loadDir(
    path.join(process.cwd(), "src", "events")
)) {
    if (file === "interactionCreate.js") {
        interaction_listener = handle;
    } else {
        client.on(file.substring(0, file.length - 3), handle);
    }
}

client.on("ready", async () => {
    await db_client.connect();

    for (const collection of await db.collections()) {
        db[collection.collectionName] = collection;
    }

    client.home = await client.guilds.fetch(config.guild_id);

    console.log("TCN Paimon is ready.");
});

client.on("interactionCreate", async (interaction) => {
    transform(interaction);

    if (interaction.isCommand() || interaction.isContextMenu()) {
        if (commands.has(interaction.commandName)) {
            if (
                await has_permission(
                    permissions.get(interaction.commandName),
                    interaction.member
                )
            ) {
                await handle(
                    interaction,
                    commands.get(interaction.commandName)
                );
            } else {
                await interaction.notify(
                    "You do not have permission to use this command."
                );
            }
        } else {
            await interaction.notify(
                "This command no longer exists. I will now delete it."
            );
            await client.home.commands.delete(interaction.commandId);
        }
    } else if (interaction.isAutocomplete()) {
        if (
            await has_permission(
                permissions.get(interaction.commandName),
                interaction.member
            )
        ) {
            if (autocompletes.has(interaction.commandName)) {
                await interaction.respond(
                    (
                        await autocompletes.get(interaction.commandName)(
                            interaction
                        )
                    ).map((option) => ({ name: option, value: option }))
                );
            }
        }
    }

    if (interaction_listener) {
        await handle(interaction, interaction_listener);
    }
});

client.login(config.discord_token);
