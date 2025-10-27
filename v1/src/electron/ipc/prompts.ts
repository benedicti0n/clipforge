import { ipcMain, app } from "electron";
import fs from "fs/promises";
import path from "path";

const promptsDir = path.join(app.getPath("userData"), "prompts");

export interface CustomPrompt {
    name: string;
    text: string;
}

// Keep in-memory cache as well (optional)
let customPrompts: CustomPrompt[] = [];

export function registerPromptHandlers() {
    // List all saved prompts
    ipcMain.handle("prompts:list", async (): Promise<CustomPrompt[]> => {
        try {
            await fs.mkdir(promptsDir, { recursive: true });
            const files = await fs.readdir(promptsDir);
            const prompts: CustomPrompt[] = [];

            for (const f of files) {
                const fullPath = path.join(promptsDir, f);
                const text = await fs.readFile(fullPath, "utf-8");
                prompts.push({ name: path.parse(f).name, text });
            }

            customPrompts = prompts; // keep cache in sync
            return prompts;
        } catch (err) {
            console.error("[Prompts] Failed to list:", err);
            return [];
        }
    });

    // Save a new prompt (or overwrite existing)
    ipcMain.handle(
        "prompts:save",
        async (_e, { name, text }: { name: string; text: string }): Promise<boolean> => {
            try {
                await fs.mkdir(promptsDir, { recursive: true });
                const filePath = path.join(promptsDir, `${name}.txt`);
                await fs.writeFile(filePath, text, "utf-8");
                console.log("[Prompts] Saved:", filePath);

                // update cache
                const idx = customPrompts.findIndex((p) => p.name === name);
                if (idx >= 0) customPrompts[idx] = { name, text };
                else customPrompts.push({ name, text });

                return true;
            } catch (err) {
                console.error("[Prompts] Failed to save:", err);
                return false;
            }
        }
    );

    // Delete a prompt
    ipcMain.handle("prompts:delete", async (_e, name: string): Promise<boolean> => {
        try {
            const filePath = path.join(promptsDir, `${name}.txt`);
            await fs.unlink(filePath);
            console.log("[Prompts] Deleted:", filePath);

            // update cache
            customPrompts = customPrompts.filter((p) => p.name !== name);
            return true;
        } catch (err) {
            console.error("[Prompts] Failed to delete:", err);
            return false;
        }
    });
}
