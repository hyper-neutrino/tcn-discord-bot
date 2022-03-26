import fetch from "node-fetch";
import config from "./config.js";

export async function create_gist(filename, description, content) {
    const files = {};
    files[filename] = { content: content || "(nothing here)" };
    const response = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(
                `${config.github_username}:${config.github_token}`,
                "utf-8"
            ).toString("base64")}`,
        },
        body: JSON.stringify({ description, files }),
    });
    const data = await response.json();
    return data.html_url;
}
