import path from "path";
import fs from "fs/promises";
import { app } from "electron";

const getPresetsFile = () =>
    path.join(app.getPath("userData"), "presets.json");

export async function savePresetToDisk(preset: any) {
    const filePath = getPresetsFile();
    let data: any[] = [];

    try {
        const raw = await fs.readFile(filePath, "utf-8");
        data = JSON.parse(raw);
    } catch {
        data = [];
    }

    // Replace if exists
    data = data.filter((p) => p.name !== preset.name);
    data.push(preset);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    return data;
}

export async function listPresetsFromDisk() {
    const filePath = getPresetsFile();
    try {
        const raw = await fs.readFile(filePath, "utf-8");
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export async function deletePresetFromDisk(name: string) {
    const filePath = getPresetsFile();
    try {
        const raw = await fs.readFile(filePath, "utf-8");
        let data = JSON.parse(raw);
        data = data.filter((p: any) => p.name !== name);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
        return data;
    } catch {
        return [];
    }
}
