"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getZipEngine } from "@/lib/zip-engine";
import type { AnnotationTool, AnnotationStroke } from "@/lib/types";
import {
  Pen, Highlighter, Eraser, Square, Circle, Minus, ArrowRight,
  Type, Undo2, Redo2, Trash2, Save, Download,
} from "lucide-react";

interface AnnotationEditorProps {
  filePath: string;
  extension: string;
  onSaveAsNew?: (newPath: string) => void;
  onOverwrite?: () => void;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
  };
  return map[ext] || "image/png";
}

const COLORS = [
  "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#007AFF",
  "#5856D6", "#AF52DE", "#000000", "#FFFFFF",
];

const TOOLS: { tool: AnnotationTool; icon: typeof Pen; label: string }[] = [
  { tool: "pen", icon: Pen, label: "Pen" },
  { tool: "highlighter", icon: Highlighter, label: "Highlighter" },
  { tool: "eraser", icon: Eraser, label: "Eraser" },
  { tool: "rectangle", icon: Square, label: "Rectangle" },
  { tool: "circle", icon: Circle, label: "Circle" },
  { tool: "line", icon: Minus, label: "Line" },
  { tool: "arrow", icon: ArrowRight, label: "Arrow" },
  { tool: "text", icon: Type, label: "Text" },
];

export function AnnotationEditor({ filePath, extension, onSaveAsNew, onOverwrite }: AnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTool, setActiveTool] = useState<AnnotationTool>("pen");
  const [activeColor, setActiveColor] = useState("#FF3B30");
  const [thickness, setThickness] = useState(3);
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<AnnotationStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStroke = useRef<AnnotationStroke | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");

  // Load image
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const engine = getZipEngine();
    const mime = getMimeType(extension);

    engine
      .getFileAsDataUrl(filePath, mime)
      .then((url) => {
        if (cancelled) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (!cancelled) {
            setImage(img);
            setLoading(false);
          }
        };
        img.onerror = () => {
          if (!cancelled) {
            setError("Failed to load image");
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

  // Render to canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !image) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);

    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }
    if (currentStroke.current) {
      drawStroke(ctx, currentStroke.current);
    }
  }, [image, strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: AnnotationStroke) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (stroke.tool === "pen" || stroke.tool === "highlighter") {
      ctx.globalAlpha = stroke.opacity;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      if (stroke.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    } else if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = stroke.thickness * 3;
      if (stroke.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
      // Redraw the image underneath
      ctx.globalCompositeOperation = "destination-over";
      if (image) ctx.drawImage(image, 0, 0);
    } else if (stroke.tool === "rectangle" && stroke.points.length >= 2) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (stroke.tool === "circle" && stroke.points.length >= 2) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if ((stroke.tool === "line" || stroke.tool === "arrow") && stroke.points.length >= 2) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      if (stroke.tool === "arrow") {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = stroke.thickness * 4;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    } else if (stroke.tool === "text" && stroke.text && stroke.points.length > 0) {
      ctx.fillStyle = stroke.color;
      ctx.font = `${stroke.fontSize || 16}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
    }

    ctx.restore();
  }

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === "text") {
      const pt = getCanvasPoint(e);
      setTextInput(pt);
      setTextValue("");
      return;
    }

    setIsDrawing(true);
    const pt = getCanvasPoint(e);
    currentStroke.current = {
      id: crypto.randomUUID(),
      tool: activeTool,
      points: [pt],
      color: activeColor,
      thickness,
      opacity: activeTool === "highlighter" ? 0.4 : 1,
    };
    setUndoneStrokes([]);
  }, [activeTool, activeColor, thickness, getCanvasPoint]);

  const handlePointerMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentStroke.current) return;
    const pt = getCanvasPoint(e);
    currentStroke.current.points.push(pt);
    redraw();
  }, [isDrawing, getCanvasPoint, redraw]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !currentStroke.current) return;
    setIsDrawing(false);
    setStrokes((prev) => [...prev, currentStroke.current!]);
    currentStroke.current = null;
    redraw();
  }, [isDrawing, redraw]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput || !textValue.trim()) {
      setTextInput(null);
      return;
    }
    const stroke: AnnotationStroke = {
      id: crypto.randomUUID(),
      tool: "text",
      points: [textInput],
      color: activeColor,
      thickness: 1,
      opacity: 1,
      text: textValue,
      fontSize: thickness * 6,
    };
    setStrokes((prev) => [...prev, stroke]);
    setTextInput(null);
    setTextValue("");
    setUndoneStrokes([]);
  }, [textInput, textValue, activeColor, thickness]);

  const handleUndo = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoneStrokes((u) => [...u, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setUndoneStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes((s) => [...s, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
    setUndoneStrokes([]);
  }, []);

  const handleSave = useCallback(async (overwrite: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    redraw();

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const engine = getZipEngine();
      const buf = await blob.arrayBuffer();

      if (overwrite) {
        engine.updateFile(filePath, new Uint8Array(buf));
        onOverwrite?.();
      } else {
        const ext = extension || "png";
        const baseName = filePath.replace(/\.[^.]+$/, "");
        const newPath = `${baseName}.annotated.${ext}`;
        engine.createFile(newPath, "");
        engine.updateFile(newPath, new Uint8Array(buf));
        onSaveAsNew?.(newPath);
      }
    }, getMimeType(extension));
  }, [filePath, extension, redraw, onOverwrite, onSaveAsNew]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 rounded-full border-2 border-[hsl(var(--mac-selection))] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-xs text-[hsl(var(--destructive))]">{error || "Failed to load image"}</p>
      </div>
    );
  }

  const cursorClass =
    activeTool === "eraser" ? "tool-eraser" :
    activeTool === "text" ? "tool-text" : "";

  return (
    <div className="flex flex-col h-full">
      {/* Tool bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.3)] overflow-x-auto">
        {TOOLS.map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            onClick={() => setActiveTool(tool)}
            className={`p-1.5 rounded mac-transition mac-focus-ring ${
              activeTool === tool
                ? "bg-[hsl(var(--mac-selection)/0.15)] text-[hsl(var(--mac-selection))]"
                : "text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))] hover:bg-[hsl(var(--mac-hover))]"
            }`}
            title={label}
            aria-label={label}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}

        <div className="w-px h-5 bg-[hsl(var(--mac-separator))]" />

        {/* Colors */}
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            className={`w-5 h-5 rounded-full border-2 mac-transition ${
              activeColor === color ? "border-[hsl(var(--mac-selection))] scale-110" : "border-transparent hover:scale-105"
            }`}
            style={{ background: color }}
            title={color}
            aria-label={`Color ${color}`}
          />
        ))}

        <div className="w-px h-5 bg-[hsl(var(--mac-separator))]" />

        {/* Thickness */}
        <input
          type="range"
          min={1}
          max={12}
          value={thickness}
          onChange={(e) => setThickness(Number(e.target.value))}
          className="w-16 accent-[hsl(var(--mac-selection))]"
          aria-label="Brush thickness"
        />
        <span className="text-[10px] tabular-nums text-[hsl(var(--mac-text-tertiary))] w-4">{thickness}</span>

        <div className="w-px h-5 bg-[hsl(var(--mac-separator))]" />

        <button onClick={handleUndo} disabled={strokes.length === 0} className="p-1.5 rounded mac-transition mac-focus-ring text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))] disabled:opacity-30" title="Undo" aria-label="Undo">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={handleRedo} disabled={undoneStrokes.length === 0} className="p-1.5 rounded mac-transition mac-focus-ring text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))] disabled:opacity-30" title="Redo" aria-label="Redo">
          <Redo2 className="w-4 h-4" />
        </button>
        <button onClick={handleClear} disabled={strokes.length === 0} className="p-1.5 rounded mac-transition mac-focus-ring text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))] disabled:opacity-30" title="Clear all" aria-label="Clear all">
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        <button
          onClick={() => handleSave(false)}
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-[hsl(var(--mac-hover))] hover:bg-[hsl(var(--mac-separator))] mac-transition text-[hsl(var(--mac-text-secondary))]"
          title="Save as new file"
        >
          <Download className="w-3 h-3" />
          Save As New
        </button>
        <button
          onClick={() => handleSave(true)}
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-[hsl(var(--mac-selection))] text-[hsl(var(--mac-selection-text))] hover:opacity-90 mac-transition"
          title="Overwrite original"
        >
          <Save className="w-3 h-3" />
          Overwrite
        </button>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto mac-scrollbar flex items-center justify-center bg-[repeating-conic-gradient(hsl(var(--mac-separator))_0%_25%,transparent_0%_50%)] bg-[size:16px_16px] relative"
      >
        <canvas
          ref={canvasRef}
          className={`annotation-canvas ${cursorClass} max-w-full max-h-full`}
          style={{ imageRendering: "auto" }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
        />

        {/* Text input overlay */}
        {textInput && (
          <div
            className="absolute"
            style={{
              left: `${(textInput.x / (image?.naturalWidth || 1)) * 100}%`,
              top: `${(textInput.y / (image?.naturalHeight || 1)) * 100}%`,
            }}
          >
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); if (e.key === "Escape") setTextInput(null); }}
              onBlur={handleTextSubmit}
              autoFocus
              className="px-1 py-0.5 text-sm bg-[hsl(var(--mac-content))] border border-[hsl(var(--mac-selection))] rounded text-[hsl(var(--mac-text-primary))] focus:outline-none min-w-[100px]"
              placeholder="Type text..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
