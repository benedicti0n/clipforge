import { app } from "electron";
import path from "path";
import * as fs from "fs";

export type ApiKey = { name: string; key: string };

/**
 * Location of the keys JSON file in Electron's userData directory
 */
function keysFilePath(): string {
    return path.join(app.getPath("userData"), "gemini_keys.json");
}

/**
 * Read all stored API keys.
 * Returns [] if file is missing or invalid.
 */
export function readKeys(): ApiKey[] {
    try {
        const raw = fs.readFileSync(keysFilePath(), "utf8");
        return JSON.parse(raw) as ApiKey[];
    } catch {
        return [];
    }
}

/**
 * Write all API keys back to disk.
 */
export function writeKeys(keys: ApiKey[]) {
    fs.writeFileSync(keysFilePath(), JSON.stringify(keys, null, 2), "utf8");
}

/**
 * Add or update a single key.
 */
export function saveKey(apiKey: ApiKey): ApiKey[] {
    let keys = readKeys();
    keys = keys.filter((k) => k.name !== apiKey.name); // prevent duplicate names
    keys.push(apiKey);
    writeKeys(keys);
    return keys;
}

/**
 * Remove a key by its name.
 */
export function removeKey(name: string): ApiKey[] {
    const keys = readKeys().filter((k) => k.name !== name);
    writeKeys(keys);
    return keys;
}
