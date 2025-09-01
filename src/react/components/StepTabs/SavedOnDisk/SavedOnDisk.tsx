"use client";

import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";

interface SavedItem {
    name: string;
    type: "clip" | "video" | "font" | "bgmusic" | "preset";
    path: string;
    size: number; // in bytes
}

export default function SavedOnDisk() {
    const [items, setItems] = useState<SavedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const fetchItems = async () => {
        try {
            const data: SavedItem[] = await window.electron?.ipcRenderer.invoke("saved:list");
            setItems(data);
        } catch (err) {
            console.error("[SavedOnDisk] Failed to fetch items:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const deleteItem = async (path: string) => {
        try {
            await window.electron?.ipcRenderer.invoke("saved:delete", path);
            setItems((prev) => prev.filter((i) => i.path !== path));
        } catch (err) {
            console.error("[SavedOnDisk] Failed to delete item:", err);
        }
    };

    const sortedItems = [...items].sort((a, b) =>
        sortOrder === "asc" ? a.size - b.size : b.size - a.size
    );

    const grouped = {
        clip: sortedItems.filter((i) => i.type === "clip"),
        video: sortedItems.filter((i) => i.type === "video"),
        font: sortedItems.filter((i) => i.type === "font"),
        bgmusic: sortedItems.filter((i) => i.type === "bgmusic"),
        preset: sortedItems.filter((i) => i.type === "preset"),
    };

    const renderGroup = (title: string, type: keyof typeof grouped) => {
        const items = grouped[type];
        return (
            <div className="space-y-2">
                <h3 className="text-md font-semibold">{title}</h3>
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No {title.toLowerCase()} found.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map((item, idx) => (
                            <div key={idx} className="border rounded p-3 flex justify-between items-center">
                                <div className="flex-1">
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(item.size / 1024).toFixed(1)} KB
                                    </p>
                                    <p className="text-xs break-all">{item.path}</p>

                                    {/* Special preview for bg music */}
                                    {item.type === "bgmusic" && (
                                        <audio
                                            controls
                                            src={`file://${item.path}`}
                                            className="mt-1 w-full"
                                        />
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.electron?.ipcRenderer.invoke("saved:open", item.path)}
                                    >
                                        Open
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => deleteItem(item.path)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="p-4">Loading saved items...</div>;
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Saved on Disk</h2>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Sort by size" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="asc">Size: Small → Large</SelectItem>
                        <SelectItem value="desc">Size: Large → Small</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {renderGroup("Clips", "clip")}
            {renderGroup("Uploads", "video")}
            {renderGroup("Fonts", "font")}
            {renderGroup("Background Music", "bgmusic")}
            {renderGroup("Presets", "preset")}
        </div>
    );
}
