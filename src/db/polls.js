import { db } from "../db.js";

export async function get_poll(id) {
    return await db.polls.findOne({ id });
}

export async function create_poll(poll) {
    return await db.polls.insertOne(poll);
}

export async function get_polls() {
    return await db.polls.find().toArray();
}

export async function get_poll_vote(id, user_id) {
    const entry = await db.polls.findOne({ id });
    if (!entry) return undefined;
    const votes = entry.votes || {};
    return votes[user_id];
}

export async function set_poll_vote(id, user_id, value) {
    const $set = {};
    $set[`votes.${user_id}`] = value;
    return await db.polls.findOneAndUpdate({ id }, { $set });
}

export async function clear_poll_vote(id, user_id) {
    const $unset = {};
    $unset[`votes.${user_id}`] = 0;
    return await db.polls.findOneAndUpdate({ id }, { $unset });
}

export async function set_poll_closed(id) {
    return await db.polls.findOneAndUpdate({ id }, { $set: { closed: true } });
}

export async function set_poll_open(id) {
    return await db.polls.findOneAndUpdate({ id }, { $set: { closed: false } });
}

export async function set_poll_valid(id, valid) {
    return await db.polls.findOneAndUpdate({ id }, { $set: { valid } });
}

export async function set_poll_message(id, message) {
    return await db.polls.findOneAndUpdate(
        { id },
        { $set: { channel_id: message.channel.id, message_id: message.id } }
    );
}

export async function set_poll_deadline(id, time) {
    return await db.polls.findOneAndUpdate({ id }, { $set: { time } });
}
