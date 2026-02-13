"use client";

import { useState, useEffect } from "react";
import { getZipEngine } from "@/lib/zip-engine";
import { FileQuestion } from "lucide-react";

interface HexPreviewProps {
  filePath: string;
  fileName: string;
  fileSize: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function HexPreview({ filePath, fileName, fileSize }: HexPreviewProps) {
  const [hexData, setHexData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHex, setShowHex] = useState(false);

  useEffect(() => {
    setHexData(null);
    setShowHex(false);
    setError(null);
  }, [filePath]);

  const loadHex = async () => {
    setLoading(true);
    setError(null);
    try {
      const engine = getZipEngine();
      const data = await engine.getHexPreview(filePath, 512);
      setHexData(data);
      setShowHex(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hex data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--mac-hover))] flex items-center justify-center">
        <FileQuestion className="w-8 h-8 text-[hsl(var(--mac-text-tertiary))]" />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-[hsl(var(--mac-text-primary))] text-balance">{fileName}</p>
        <p className="text-xs text-[hsl(var(--mac-text-tertiary))] mt-1">
          No preview available - {formatBytes(fileSize)}
        </p>
      </div>

      {!showHex && (
        <button
          onClick={loadHex}
          disabled={loading}
          className="text-xs font-medium px-4 py-2 rounded-lg bg-[hsl(var(--mac-hover))] hover:bg-[hsl(var(--mac-separator))] mac-transition mac-focus-ring text-[hsl(var(--mac-text-secondary))] disabled:opacity-50"
        >
          {loading ? "Loading..." : "Show Hex Preview (first 512 bytes)"}
        </button>
      )}

      {error && (
        <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>
      )}

      {showHex && hexData && (
        <pre className="w-full max-w-lg overflow-auto mac-scrollbar text-[10px] font-mono leading-relaxed bg-[hsl(var(--mac-hover))] p-3 rounded-lg text-[hsl(var(--mac-text-secondary))]">
          {hexData}
        </pre>
      )}
    </div>
  );
}
