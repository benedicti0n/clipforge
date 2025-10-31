"use client";

import React, { useState, useRef } from "react";
import { useVideoStore } from "../../store/videoStore";
import { Button } from "../ui/button";
import { Trash, UploadCloud, X } from "lucide-react";

export default function Upload() {
  const { video, setVideo, clearVideo } = useVideoStore();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    setVideo(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  if (video) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 h-full text-center">
        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">{video.name}</h3>
          <p className="text-sm text-muted-foreground">
            {(video.size / (1024 * 1024)).toFixed(2)} MB •{" "}
            {video.duration.toFixed(1)}s
          </p>
        </div>

        {/* Video Player */}
        <div className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden border bg-muted/30 shadow-sm hover:shadow-md transition-shadow">
          <video
            src={video.url || ""}
            controls
            className="absolute inset-0 h-full w-full object-contain rounded-xl"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="destructive"
            onClick={clearVideo}
            className="flex gap-2 items-center px-4"
          >
            <Trash className="w-4 h-4" /> Remove Video
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg cursor-pointer transition 
        ${dragOver ? "border-primary bg-accent/30" : "border-muted-foreground/30"}`}
      onClick={() => fileInputRef.current?.click()}
    >
      <UploadCloud className="w-12 h-12 mb-3 text-muted-foreground" />
      <p className="text-sm text-muted-foreground mb-2">
        Drag & drop your video here or click to browse
      </p>
      <p className="text-xs text-muted-foreground">(Max size: 2 GB)</p>

      <input
        type="file"
        accept="video/*"
        ref={fileInputRef}
        onChange={handleSelect}
        className="hidden"
      />
    </div>
  );
}
