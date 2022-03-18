import { User, GuildMember, Role, Channel } from "discord.js";

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
