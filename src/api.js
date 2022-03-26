import fetch from "node-fetch";

const API = "https://api.teyvatcollective.network";

export async function is_council(user_id) {
    const response = await fetch(API + `/users/${user_id}`);
    return response.ok;
}

export async function is_voter(user_id) {
    const response = await fetch(API + `/users/voters`);
    const data = await response.json();
    return user_id in data;
}

export async function get_council() {
    const response = await fetch(API + `/users`);
    const data = await response.json();
    return new Set(Object.keys(data));
}

export async function get_voters() {
    const response = await fetch(API + `/users/voters`);
    const data = await response.json();
    return new Set(Object.keys(data));
}
