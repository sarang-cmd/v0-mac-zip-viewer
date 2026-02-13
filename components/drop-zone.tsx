"use client";

import { useState, useCallback, useRef } from "react";
import { Upload } from "./mac-icons";

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export function DropZone({ onFileSelect, isLoading }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounter.current = 0;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.name.endsWith(".zip") || file.type.includes("zip")) {
          onFileSelect(file);
        }
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFileSelect]
  );

  return (
    <div className="flex-1 flex items-center justify-center p-8 mac-content">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-4 w-full max-w-md p-12 rounded-2xl border-2 border-dashed mac-transition ${
          isDragOver
            ? "drop-zone-active border-[hsl(var(--mac-selection))]"
            : "border-[hsl(var(--mac-separator))]"
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-12 h-12 rounded-full border-2 border-[hsl(var(--mac-selection))] border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-[hsl(var(--mac-text-primary))]">
              Processing ZIP file...
            </p>
            <p className="text-xs text-[hsl(var(--mac-text-tertiary))]">
              Parsing entries and building file tree
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--mac-selection)/0.08)] flex items-center justify-center">
              <Upload className="w-8 h-8 text-[hsl(var(--mac-selection))]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[hsl(var(--mac-text-primary))] mb-1">
                Drop a ZIP file here
              </p>
              <p className="text-xs text-[hsl(var(--mac-text-tertiary))] mb-4">
                or click below to browse
              </p>
            </div>
            <label className="cursor-pointer mac-focus-ring rounded-lg">
              <input
                ref={inputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="sr-only"
                onChange={handleFileInput}
                aria-label="Select ZIP file"
              />
              <span className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-[hsl(var(--mac-selection))] text-[hsl(var(--mac-selection-text))] hover:opacity-90 mac-transition shadow-sm">
                Choose File
              </span>
            </label>
            <p className="text-[10px] text-[hsl(var(--mac-text-tertiary))]">
              Maximum file size: 500 MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
