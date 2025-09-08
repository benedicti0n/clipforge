import { Slider } from "../../ui/slider";
import { Input } from "../../ui/input";
import { Switch } from "../../ui/switch";  // ✅ add this

import type { SubtitleStyle } from "../../../../electron/types/subtitleTypes";
import { loadFontToCSS } from "../../../utils/fontManager";
import { useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "../../ui/button";

interface SubtitleStylePanelProps {
    style: SubtitleStyle;
    setStyle: (style: SubtitleStyle) => void;
    uploadedFonts: { name: string; path: string }[];
    setUploadedFonts: React.Dispatch<React.SetStateAction<{ name: string; path: string }[]>>;

}


export default function SubtitleStylePanel({ style, setStyle, uploadedFonts, setUploadedFonts }: SubtitleStylePanelProps) {
    const handleFontUpload = async (file: File) => {
        const arrayBuffer = await file.arrayBuffer();
        const fontName = file.name.replace(/\.(ttf|otf)$/i, "");
        const ext = "." + (file.name.split(".").pop() || "ttf");

        // 1. Inject into browser for preview
        loadFontToCSS(fontName, file);

        // 2. Persist font for Skia — always return { name, path: string }
        const savedPath: string = await window.electron?.ipcRenderer.invoke("fonts:save", {
            name: fontName,
            data: arrayBuffer, // ArrayBuffer, main will wrap in Buffer
            ext,
        });

        // 3. Update dropdown + current style
        setUploadedFonts((prev) => [...prev, { name: fontName, path: savedPath }]);
        setStyle({ ...style, fontFamily: fontName });
    };

    useEffect(() => {
        (async () => {
            const savedFonts: { name: string; path: string }[] =
                await window.electron?.ipcRenderer.invoke("fonts:list");

            if (savedFonts.length > 0) {
                // Inject each font into CSS for preview
                savedFonts.forEach((f) => {
                    loadFontToCSS(f.name, f.path);
                });

                setUploadedFonts(savedFonts);
            }
        })();
    }, [setUploadedFonts]);


    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-3">
            <h4 className="font-semibold text-sm">Subtitle Style</h4>

            {/* Font Size */}
            <div className="flex items-center gap-3">
                <label className="text-sm w-24">Font Size</label>
                <Slider
                    min={12}
                    max={72}
                    step={1}
                    value={[style.fontSize]}
                    onValueChange={(v) => setStyle({ ...style, fontSize: v[0] })}
                />
            </div>

            {/* Stroke Width */}
            <div className="flex items-center gap-3">
                <label className="text-sm w-24">Stroke Width</label>
                <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[style.strokeWidth]}
                    onValueChange={(v) => setStyle({ ...style, strokeWidth: v[0] })}
                />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-2">
                <Input
                    type="color"
                    value={style.fontColor}
                    onChange={(e) => setStyle({ ...style, fontColor: e.target.value })}
                />
                <Input
                    type="color"
                    value={style.strokeColor}
                    onChange={(e) => setStyle({ ...style, strokeColor: e.target.value })}
                />
            </div>

            {/* Font Family */}
            <div className="space-y-2">
                <label className="text-sm">Font Family</label>
                <div className="flex gap-2">
                    <select
                        className="border rounded p-1 flex-1"
                        value={style.fontFamily}
                        onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
                    >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Verdana">Verdana</option>

                        {/* Uploaded fonts */}
                        {uploadedFonts.map((f) => (
                            <option key={f.name} value={f.name}>
                                {f.name}
                            </option>
                        ))}
                    </select>

                    {/* Hidden native input */}
                    <input
                        type="file"
                        accept=".ttf,.otf"
                        ref={fileInputRef}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFontUpload(file);
                        }}
                        hidden
                    />

                    {/* Button beside dropdown */}
                    <Button
                        onClick={triggerFileSelect}
                        variant="outline"
                        className="flex items-center gap-1 whitespace-nowrap"
                    >
                        <Upload className="w-4 h-4" />
                        Upload
                    </Button>
                </div>
            </div>

            {/* Text Style Controls */}
            <div className="flex gap-2">
                <button
                    className={`px-2 py-1 border rounded ${style.bold ? "bg-gray-200" : ""}`}
                    onClick={() => setStyle({ ...style, bold: !style.bold })}
                >
                    B
                </button>
                <button
                    className={`px-2 py-1 border rounded ${style.italic ? "bg-gray-200" : ""}`}
                    onClick={() => setStyle({ ...style, italic: !style.italic })}
                >
                    I
                </button>
                <button
                    className={`px-2 py-1 border rounded ${style.underline ? "bg-gray-200" : ""}`}
                    onClick={() => setStyle({ ...style, underline: !style.underline })}
                >
                    U
                </button>
            </div>

            {/* Background Box Switch */}
            <div className="flex items-center justify-between">
                <label className="text-sm">Background Box</label>
                <Switch
                    checked={style.backgroundEnabled}
                    onCheckedChange={(v) => setStyle({ ...style, backgroundEnabled: v })}
                />
            </div>

            {/* Background Box Controls */}
            {style.backgroundEnabled && (
                <div className="space-y-3 pl-2 border-l border-gray-300 mt-2">
                    {/* Background Color */}
                    <div className="flex items-center gap-3">
                        <label className="text-sm w-24">Color</label>
                        <Input
                            type="color"
                            value={style.backgroundColor}
                            onChange={(e) =>
                                setStyle({ ...style, backgroundColor: e.target.value })
                            }
                        />
                    </div>

                    {/* Background Opacity */}
                    <div>
                        <label className="text-sm">Opacity</label>
                        <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[style.backgroundOpacity]}
                            onValueChange={(v) =>
                                setStyle({ ...style, backgroundOpacity: v[0] })
                            }
                        />
                    </div>

                    {/* Border Radius */}
                    <div>
                        <label className="text-sm">Border Radius</label>
                        <Slider
                            min={0}
                            max={50}
                            step={1}
                            value={[style.backgroundRadius]}
                            onValueChange={(v) =>
                                setStyle({ ...style, backgroundRadius: v[0] })
                            }
                        />
                    </div>

                    {/* Padding */}
                    <div>
                        <label className="text-sm">Padding</label>
                        <Slider
                            min={0}
                            max={50}
                            step={1}
                            value={[style.backgroundPadding]}
                            onValueChange={(v) =>
                                setStyle({ ...style, backgroundPadding: v[0] })
                            }
                        />
                    </div>
                </div>
            )}

            {/* Position */}
            <div className="space-y-2">
                <label className="text-sm">Position X</label>
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[style.x]}
                    onValueChange={(v) => setStyle({ ...style, x: v[0] })}
                />
                <label className="text-sm">Position Y</label>
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[style.y]}
                    onValueChange={(v) => setStyle({ ...style, y: v[0] })}
                />
            </div>

            {/* Opacity */}
            <div>
                <label className="text-sm">Opacity</label>
                <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[style.opacity]}
                    onValueChange={(v) => setStyle({ ...style, opacity: v[0] })}
                />
            </div>

        </div>
    );
}
