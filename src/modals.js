import client from "./client.js";

const resolvers = new Map();
const rejecters = new Map();

function random_id() {
    var id = "";
    for (var x = 0; x < 100; ++x) {
        id += String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }
    return id;
}

export function post_modal(interaction, modal) {
    modal.custom_id = random_id();
    client.api.interactions(interaction.id)[interaction.token].callback.post({
        data: {
            type: 9,
            data: modal,
        },
    });
    return new Promise((resolve, reject) => {
        resolvers.set(modal.custom_id, resolve);
        rejecters.set(modal.custom_id, reject);
    });
}

client.ws.on("INTERACTION_CREATE", (interaction) => {
    if (resolvers.has(interaction.data.custom_id)) {
        interaction.respond = (data) =>
            client.api
                .interactions(interaction.id)
                [interaction.token].callback.post({ data: { type: 4, data } });
        resolvers.get(interaction.data.custom_id)(interaction);
    }
});
