"use client";

import { useEffect, useState } from "react";
import { Slider } from "../../ui/slider";
import { Button } from "../../ui/button";
import { Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "../../ui/select";

interface BgMusicPanelProps {
    bgMusic: { path: string; volume: number } | null;
    setBgMusic: (m: { path: string; volume: number } | null) => void;
}

export default function BgMusicPanel({ bgMusic, setBgMusic }: BgMusicPanelProps) {
    const [volume, setVolume] = useState(bgMusic?.volume ?? 50);
    const [library, setLibrary] = useState<
        { name: string; path: string; size: number; category: string }[]
    >([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [uploadModal, setUploadModal] = useState(false);

    // Upload form state
    const [file, setFile] = useState<File | null>(null);
    const [musicName, setMusicName] = useState("");
    const [category, setCategory] = useState<string>("Uncategorized");
    const [newCategory, setNewCategory] = useState("");

    // Filter state
    const [filter, setFilter] = useState<string>("all");

    const refreshLibrary = async () => {
        const list = await window.electron?.ipcRenderer.invoke("music:list");
        if (list) {
            setLibrary(list);
            const uniqueCategories = [
                ...new Set(
                    list.map((l: { category?: string }) => l.category || "Uncategorized")
                ),
            ] as string[]; // ✅ assert type
            setCategories(uniqueCategories);
        }
    };


    useEffect(() => {
        refreshLibrary();
    }, []);

    const handleSave = async () => {
        if (!file) return;

        const saved = await window.electron?.ipcRenderer.invoke("music:save", {
            name: musicName || file.name,
            data: await file.arrayBuffer(),
            category: newCategory || category,
        });

        if (saved?.path) {
            setBgMusic({ path: saved.path, volume });
            refreshLibrary();
            setUploadModal(false);
            setFile(null);
            setMusicName("");
            setCategory("Uncategorized");
            setNewCategory("");
        }
    };

    const handleDelete = async (filePath: string) => {
        await window.electron?.ipcRenderer.invoke("music:delete", filePath);
        refreshLibrary();
    };

    // Library filtered by category
    const filteredLibrary =
        filter === "all"
            ? library
            : library.filter((track) => track.category === filter);

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-sm">Background Music</h4>

            {/* Upload Modal Trigger + Filter */}
            <div className="flex items-center justify-between">
                <Button
                    onClick={() => setUploadModal(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Upload Audio
                </Button>

                <select
                    className="border rounded px-2 py-1 text-sm"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="all">All</option>
                    {categories.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>

            {/* Upload Modal */}
            <Dialog open={uploadModal} onOpenChange={setUploadModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload New Audio</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        {/* File input */}
                        <Input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                setFile(f);
                                if (f) setMusicName(f.name.replace(/\.[^/.]+$/, ""));
                            }}
                        />

                        {/* Name field */}
                        <Input
                            placeholder="Track name"
                            value={musicName}
                            onChange={(e) => setMusicName(e.target.value)}
                        />

                        {/* Category selection */}
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                                <SelectItem value="__new">+ Create new category</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Show new category input when selected */}
                        {category === "__new" && (
                            <Input
                                placeholder="New category name"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                            />
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setUploadModal(false)} variant="outline">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={!file}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Selected track controls */}
            {bgMusic && (
                <div className="space-y-2">
                    <label className="text-sm">Volume: {volume}%</label>
                    <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[volume]}
                        onValueChange={(v) => {
                            setVolume(v[0]);
                            setBgMusic({ ...bgMusic, volume: v[0] });
                        }}
                    />
                    <Button variant="destructive" onClick={() => setBgMusic(null)}>
                        Remove Selected
                    </Button>
                </div>
            )}

            {/* Library list */}
            <div className="space-y-2">
                {filter === "all" ? (
                    // Group by category
                    categories.map((c) => (
                        <div key={c} className="space-y-2">
                            <h5 className="font-medium text-sm">{c}</h5>
                            <ul className="space-y-1">
                                {library
                                    .filter((track) => (track.category || "Uncategorized") === c)
                                    .map((track) => (
                                        <li
                                            key={track.path}
                                            className="flex flex-col border p-2 rounded space-y-1"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm">{track.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {(track.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setBgMusic({ path: track.path, volume })}
                                                    >
                                                        Use
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDelete(track.path)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                            <audio
                                                controls
                                                src={`file://${track.path}`}
                                                className="w-full mt-1"
                                            />
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    ))
                ) : (
                    // Filtered single category
                    <ul className="space-y-1">
                        {filteredLibrary.map((track) => (
                            <li
                                key={track.path}
                                className="flex flex-col border p-2 rounded space-y-1"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm">{track.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {(track.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => setBgMusic({ path: track.path, volume })}
                                        >
                                            Use
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDelete(track.path)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                                <audio
                                    controls
                                    src={`file://${track.path}`}
                                    className="w-full mt-1"
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
