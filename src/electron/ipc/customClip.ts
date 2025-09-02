import { app, ipcMain } from "electron";
import fs from "fs";
import path from "path";

export function registerCustomClipIpc() {
    ipcMain.handle(
        "clip:upload",
        async (_event, { data, name }: { data: number[]; name: string }) => {
            try {
                const userDataPath = app.getPath("userData");
                const clipsDir = path.join(userDataPath, "clips");

                if (!fs.existsSync(clipsDir)) {
                    fs.mkdirSync(clipsDir, { recursive: true });
                }

                const fileName = `${Date.now()}_${name}`;
                const destPath = path.join(clipsDir, fileName);

                // ✅ Convert back into Buffer
                const buffer = Buffer.from(new Uint8Array(data));
                fs.writeFileSync(destPath, buffer);

                return destPath;
            } catch (err) {
                console.error("clip:upload error:", err);
                throw new Error("Failed to save uploaded clip");
            }
        }
    );
}
