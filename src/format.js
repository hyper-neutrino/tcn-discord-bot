import { User, GuildMember, Role, Channel } from "discord.js";
import client from "./client.js";

export function expand(item) {
    if (item instanceof User) {
        return `${item} (${item.tag} \`${item.id}\`)`;
    } else if (item instanceof GuildMember) {
        return `${item} (${item.user.tag} \`${item.id}\`)`;
    } else if (item instanceof Role) {
        return `${item} (@${item.name} \`${item.id}\`)`;
    } else if (item instanceof Channel) {
        return `${item} (#${item.name} \`${item.id}\`)`;
    } else {
        return item.toString();
    }
}

export function timestamp(time, flag) {
    return `<t:${Math.floor(time.getTime() / 1000)}${flag ? `:${flag}` : ""}>`;
}

export async function tag_user(id) {
    try {
        return (await client.users.fetch(id)).tag;
    } catch {
        return "Unknown User";
    }
}
