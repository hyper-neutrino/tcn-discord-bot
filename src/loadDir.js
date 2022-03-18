import fs from "fs";
import path from "path";

export default async function (directory) {
    const objects = [];
    for (const file of fs.readdirSync(directory)) {
        objects.push([file, await import(path.join(directory, file))]);
    }
    return objects;
}
