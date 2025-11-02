"use client";

import { useWhisperStore } from "../../store/whisperStore";
import { WHISPER_MODELS_META, type WhisperModelKey } from "../../../constants/whisper";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Download, CheckCircle2, Loader2, Rabbit, Squirrel, Cat, Dog, Bird, Turtle, Trash2, FolderOpen } from "lucide-react";
import { Card } from "../ui/card";

const MODEL_ICONS: Record<WhisperModelKey, JSX.Element> = {
    tiny: <Rabbit className="w-5 h-5" />,
    base: <Squirrel className="w-5 h-5" />,
    small: <Cat className="w-5 h-5" />,
    medium: <Dog className="w-5 h-5" />,
    "large-v2": <Bird className="w-5 h-5" />,
    "large-v3": <Turtle className="w-5 h-5" />,
};

export default function WhisperModelSelect() {
    const {
        selectedModel,
        setModel,
        cachedModels,
        downloading,
        downloadModel,
        progress,
        deleteModel,
    } = useWhisperStore();

    const isCached = (key: WhisperModelKey) => cachedModels.has(key);
    const isDownloading = (key: WhisperModelKey) => downloading === key;

    const handleCardClick = (modelKey: WhisperModelKey) => {
        if (isCached(modelKey)) {
            setModel(modelKey);
        }
    };

    const handleDelete = (e: React.MouseEvent, modelKey: WhisperModelKey) => {
        e.stopPropagation();
        deleteModel(modelKey);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    Whisper Models
                    <button
                        onClick={() => window.electronAPI?.openWhisperFolder()}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Open models folder"
                    >
                        <FolderOpen className="w-4 h-4" />
                    </button>
                </label>
                {selectedModel && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span>
                            Selected:{" "}
                            <span className="font-medium capitalize">{selectedModel}</span>
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                {WHISPER_MODELS_META.map((model) => {
                    const cached = isCached(model.key);
                    const downloadingNow = isDownloading(model.key);
                    const isSelected = selectedModel === model.key;

                    return (
                        <Card
                            key={model.key}
                            className={`p-4 cursor-pointer transition-all hover:shadow-md h-full ${isSelected
                                ? "ring-2 ring-primary bg-primary/5"
                                : cached
                                    ? "hover:bg-accent"
                                    : "opacity-75"
                                } ${!cached ? "cursor-default" : ""}`}
                            onClick={() => handleCardClick(model.key)}
                        >
                            <div className="flex flex-col justify-between h-full gap-4">
                                {/* Top Section: Icon, Name, Metadata */}
                                <div className="flex items-start gap-3">
                                    <div className={isSelected ? "text-primary" : "text-muted-foreground"}>
                                        {MODEL_ICONS[model.key]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold capitalize">{model.label}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {model.sizeMB} MB • {model.note}
                                                </p>
                                            </div>
                                            {isSelected && (
                                                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Section: Status Badge or Download Button */}
                                <div className="flex items-center gap-2">
                                    {cached ? (
                                        <>
                                            <Badge
                                                variant="default"
                                                className="flex-1"
                                            >
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                Cached
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={(e) => handleDelete(e, model.key)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : downloadingNow ? (
                                        <div className="flex flex-col gap-1 w-full">
                                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Downloading {progress.toFixed(0)}%
                                            </Badge>
                                            <div className="w-full h-[3px] bg-muted-foreground/20 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-200"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log("🔽 Download clicked for:", model.key);
                                                downloadModel(model.key);
                                            }}
                                            className="gap-2 w-full"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}