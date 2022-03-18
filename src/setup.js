import db from "./db.js";

(async () => {
    await db.connect();

    await db.query(
        `create table if not exists permissions (
            permission          varchar(32)     not null,
            snowflake           varchar(32)     not null,
            primary key (permission, snowflake)
        )`
    );

    await db.query(
        `create table if not exists settings (
            setting             varchar(32)     not null primary key,
            value               varchar(32)
        )`
    );

    await db.query(
        `create table if not exists polls (
            id                  serial          primary key,
            channel_id          varchar(32),
            message_id          varchar(32),
            type                varchar(32),
            question            varchar(1024)   not null,
            short               boolean         not null,
            restrict            boolean         not null,
            anonymous           boolean         not null,
            update              boolean         not null,
            end_date            timestamp,
            posted              boolean         not null default false,
            closed              boolean         not null default false
        )`
    );

    await db.query(
        `create table if not exists poll_options (
            id                  serial          primary key,
            poll_id             integer         references polls(id) on delete cascade,
            index               integer         not null,
            value               varchar(256)    not null,
            unique (poll_id, index)
        )`
    );

    await db.query(
        `create table if not exists poll_votes (
            poll_id             integer         references polls(id) on delete cascade,
            user_id             varchar(32),
            option_id           integer         references poll_options(id) on delete cascade,
            primary key (poll_id, user_id)
        )`
    );

    await db.end();
})();
