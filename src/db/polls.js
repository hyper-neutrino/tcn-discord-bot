import db from "../db.js";

export async function create_poll(
    question,
    short,
    restrict,
    anonymous,
    update
) {
    return (
        await db.query(
            `insert into polls (question, short, restrict, anonymous, update) values ($1, $2, $3, $4, $5) returning id`,
            [question, short, restrict, anonymous, update]
        )
    ).rows[0].id;
}

export async function set_poll_date(id, date) {
    await db.query(`update polls set end_date = $1 where id = $2`, [date, id]);
}

export async function set_poll_message(id, message) {
    await db.query(
        `update polls set posted = true, channel_id = $1, message_id = $2 where id = $3`,
        [message.channel.id, message.id, id]
    );
}

export async function set_poll_options(id, values) {
    await db.query(`delete from poll_options where poll_id = $1`, [id]);
    for (const index in values) {
        await db.query(
            `insert into poll_options (poll_id, index, value) values ($1, $2, $3)`,
            [id, index, values[index]]
        );
    }
}

export async function get_poll(id) {
    return (await db.query(`select * from polls where id = $1`, [id])).rows[0];
}

export async function get_expired_polls() {
    return (
        await db.query(
            `select * from polls where not closed and end_date is not null and end_date <= NOW()`
        )
    ).rows;
}

export async function close_poll(id) {
    await db.query(`update polls set closed = true where id = $1`, [id]);
}

export async function get_poll_options(id) {
    return (
        await db.query(`select * from poll_options where poll_id = $1`, [id])
    ).rows;
}

export async function get_poll_votes(id) {
    return (await db.query(`select * from poll_votes where poll_id = $1`, [id]))
        .rows;
}

export async function get_poll_counts(poll_id) {
    const options = [];
    for (const { id, value } of (
        await db.query(
            `select id, value from poll_options where poll_id = $1 order by index asc`,
            [poll_id]
        )
    ).rows) {
        options.push([
            value,
            (
                await db.query(
                    `select count(*) from poll_votes where option_id = $1`,
                    [id]
                )
            ).rows[0].count,
        ]);
    }
    return options;
}

export async function set_poll_vote(poll_id, user_id, option_id) {
    const results = await db.query(
        `select count(*) from poll_votes where poll_id = $1 and user_id = $2 and option_id = $3`,
        [poll_id, user_id, option_id]
    );
    if (results.rows[0].count > 0) {
        await db.query(
            `delete from poll_votes where poll_id = $1 and user_id = $2 and option_id = $3`,
            [poll_id, user_id, option_id]
        );
        return false;
    } else {
        await db.query(
            `insert into poll_votes values ($1, $2, $3) on conflict (poll_id, user_id) do update set option_id = $3`,
            [poll_id, user_id, option_id]
        );
        const value = (
            await db.query(`select value from poll_options where id = $1`, [
                option_id,
            ])
        ).rows[0].value;
        return value;
    }
}
