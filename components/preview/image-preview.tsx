"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getZipEngine } from "@/lib/zip-engine";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
} from "lucide-react";

interface ImagePreviewProps {
  filePath: string;
  extension: string;
  onAnnotate?: () => void;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
    ico: "image/x-icon", avif: "image/avif", svg: "image/svg+xml",
  };
  return map[ext] || "image/png";
}

export function ImagePreview({ filePath, extension, onAnnotate }: ImagePreviewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDataUrl(null);
    setZoom(1);
    setRotation(0);
    setDimensions(null);

    const engine = getZipEngine();
    const mime = getMimeType(extension);

    engine
      .getFileAsDataUrl(filePath, mime)
      .then((url) => {
        if (cancelled) return;
        setDataUrl(url);
        setFileSize(Math.round((url.length * 3) / 4));

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (!cancelled) {
            setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
            setLoading(false);
          }
        };
        img.onerror = () => {
          if (!cancelled) {
            setLoading(false);
          }
        };
        img.src = url;
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [filePath, extension]);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z * 1.25, 5)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z / 1.25, 0.1)), []);
  const handleRotate = useCallback(() => setRotation((r) => (r + 90) % 360), []);
  const handleFit = useCallback(() => { setZoom(1); setRotation(0); }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.max(0.1, Math.min(5, z * delta)));
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 rounded-full border-2 border-[hsl(var(--mac-selection))] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !dataUrl) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-xs text-[hsl(var(--destructive))]">{error || "Failed to load image"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.5)]">
        <span className="text-[10px] text-[hsl(var(--mac-text-tertiary))]">
          {dimensions ? `${dimensions.w} x ${dimensions.h}` : ""} - {Math.round(zoom * 100)}%
        </span>
        <div className="flex items-center gap-1">
          <button onClick={handleZoomOut} className="p-1 rounded hover:bg-[hsl(var(--mac-hover))] mac-transition mac-focus-ring" aria-label="Zoom out" title="Zoom out">
            <ZoomOut className="w-3.5 h-3.5 text-[hsl(var(--mac-text-secondary))]" />
          </button>
          <button onClick={handleZoomIn} className="p-1 rounded hover:bg-[hsl(var(--mac-hover))] mac-transition mac-focus-ring" aria-label="Zoom in" title="Zoom in">
            <ZoomIn className="w-3.5 h-3.5 text-[hsl(var(--mac-text-secondary))]" />
          </button>
          <button onClick={handleRotate} className="p-1 rounded hover:bg-[hsl(var(--mac-hover))] mac-transition mac-focus-ring" aria-label="Rotate" title="Rotate 90 degrees">
            <RotateCw className="w-3.5 h-3.5 text-[hsl(var(--mac-text-secondary))]" />
          </button>
          <button onClick={handleFit} className="p-1 rounded hover:bg-[hsl(var(--mac-hover))] mac-transition mac-focus-ring" aria-label="Fit" title="Fit to screen">
            <Maximize2 className="w-3.5 h-3.5 text-[hsl(var(--mac-text-secondary))]" />
          </button>
          {onAnnotate && (
            <>
              <div className="w-px h-4 bg-[hsl(var(--mac-separator))]" />
              <button
                onClick={onAnnotate}
                className="text-[10px] font-medium text-[hsl(var(--mac-selection))] hover:underline mac-focus-ring rounded px-1.5 py-0.5"
              >
                Annotate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Image canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto mac-scrollbar flex items-center justify-center bg-[repeating-conic-gradient(hsl(var(--mac-separator))_0%_25%,transparent_0%_50%)] bg-[size:16px_16px]"
        onWheel={handleWheel}
      >
        <img
          src={dataUrl}
          alt="Preview"
          className="max-w-none mac-transition"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: "center",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
