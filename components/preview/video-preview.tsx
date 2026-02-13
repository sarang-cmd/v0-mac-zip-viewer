"use client";

import { useState, useEffect, useRef } from "react";
import { getZipEngine } from "@/lib/zip-engine";

interface VideoPreviewProps {
  filePath: string;
  extension: string;
  fileName: string;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
    mkv: "video/x-matroska", webm: "video/webm", flv: "video/x-flv",
  };
  return map[ext] || "video/mp4";
}

export function VideoPreview({ filePath, extension, fileName }: VideoPreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const engine = getZipEngine();
    const mime = getMimeType(extension);

    engine
      .getFileAsBlob(filePath, mime)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setObjectUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [filePath, extension]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 rounded-full border-2 border-[hsl(var(--mac-selection))] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-xs text-[hsl(var(--destructive))]">{error || "Failed to load video"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-3 py-1.5 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.5)]">
        <span className="text-[10px] text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider">
          {extension.toUpperCase()} Video
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center bg-[hsl(var(--foreground)/0.03)] overflow-hidden">
        <video
          src={objectUrl}
          controls
          className="max-w-full max-h-full"
          style={{ outline: "none" }}
        >
          <track kind="captions" />
        </video>
      </div>
    </div>
  );
}
