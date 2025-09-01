"use client";

import { useEffect, useState } from "react";
import { Slider } from "../../ui/slider";
import { Button } from "../../ui/button";

interface BgMusicPanelProps {
    bgMusic: { path: string; volume: number } | null;
    setBgMusic: (m: { path: string; volume: number } | null) => void;
}

export default function BgMusicPanel({ bgMusic, setBgMusic }: BgMusicPanelProps) {
    const [volume, setVolume] = useState(bgMusic?.volume ?? 50);
    const [library, setLibrary] = useState<{ name: string; path: string; size: number }[]>([]);

    const refreshLibrary = async () => {
        const list = await window.electron?.ipcRenderer.invoke("music:list");
        if (list) setLibrary(list);
    };

    useEffect(() => {
        refreshLibrary();
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const saved = await window.electron?.ipcRenderer.invoke("music:save", {
            name: file.name,
            data: await file.arrayBuffer(),
        });

        if (saved?.path) {
            setBgMusic({ path: saved.path, volume });
            refreshLibrary(); // refresh library after new upload
        }
    };

    const handleDelete = async (filePath: string) => {
        await window.electron?.ipcRenderer.invoke("music:delete", filePath);
        refreshLibrary();
    };

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-sm">Background Music</h4>

            <input type="file" accept="audio/*" onChange={handleFileSelect} />

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
                    <Button
                        variant="destructive"
                        onClick={() => setBgMusic(null)}
                    >
                        Remove Selected
                    </Button>
                </div>
            )}

            <div className="space-y-2">
                <h5 className="font-medium text-sm">Your Library</h5>
                <ul className="space-y-1">
                    {library.map((track) => (
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

                            {/* Preview audio player */}
                            <audio controls src={`file://${track.path}`} className="w-full mt-1" />
                        </li>
                    ))}
                </ul>

            </div>
        </div>
    );
}
