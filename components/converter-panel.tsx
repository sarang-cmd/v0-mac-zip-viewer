"use client";

import { useState, useCallback, useEffect } from "react";
import type { TreeNode } from "@/lib/types";
import { getAvailableConversions, convertFile, type ConversionOption } from "@/lib/file-converter";
import { getZipEngine } from "@/lib/zip-engine";
import { ArrowDownToLine, X, RefreshCw } from "lucide-react";

interface ConverterPanelProps {
  node: TreeNode | null;
  isOpen: boolean;
  onClose: () => void;
  onConversionComplete?: (newPath: string) => void;
}

export function ConverterPanel({ node, isOpen, onClose, onConversionComplete }: ConverterPanelProps) {
  const [conversions, setConversions] = useState<ConversionOption[]>([]);
  const [selectedConversion, setSelectedConversion] = useState<ConversionOption | null>(null);
  const [converting, setConverting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (node && node.type === "file") {
      const available = getAvailableConversions(node.extension);
      setConversions(available);
      setSelectedConversion(available[0] ?? null);
      setPreview(null);
      setError(null);
      setSuccess(null);
    } else {
      setConversions([]);
      setSelectedConversion(null);
    }
  }, [node]);

  const handlePreview = useCallback(async () => {
    if (!node || !selectedConversion) return;
    setError(null);
    setConverting(true);
    try {
      const engine = getZipEngine();
      const isImage = ["png", "jpg", "jpeg", "webp"].includes(node.extension);
      const content = isImage
        ? await engine.getFileAsArrayBuffer(node.fullPath)
        : await engine.getFileAsText(node.fullPath);
      const result = await convertFile(content, selectedConversion.from, selectedConversion.to);
      if (typeof result.content === "string") {
        setPreview(result.content.slice(0, 5000) + (result.content.length > 5000 ? "\n...(truncated)" : ""));
      } else {
        setPreview(`[Binary ${selectedConversion.to.toUpperCase()} - ${(result.content.size / 1024).toFixed(1)} KB]`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
      setPreview(null);
    } finally {
      setConverting(false);
    }
  }, [node, selectedConversion]);

  const handleConvert = useCallback(async () => {
    if (!node || !selectedConversion) return;
    setError(null);
    setSuccess(null);
    setConverting(true);
    try {
      const engine = getZipEngine();
      const isImage = ["png", "jpg", "jpeg", "webp"].includes(node.extension);
      const content = isImage
        ? await engine.getFileAsArrayBuffer(node.fullPath)
        : await engine.getFileAsText(node.fullPath);
      const result = await convertFile(content, selectedConversion.from, selectedConversion.to);

      // Create new file in ZIP
      const baseName = node.name.replace(/\.[^.]+$/, "");
      const newFileName = `${baseName}.${result.extension}`;
      const pathParts = node.fullPath.split("/");
      pathParts[pathParts.length - 1] = newFileName;
      const newPath = pathParts.join("/");

      if (typeof result.content === "string") {
        engine.createFile(newPath, result.content);
      } else {
        const buf = await result.content.arrayBuffer();
        engine.updateFile(newPath, buf);
      }

      setSuccess(`Converted to ${newFileName}`);
      onConversionComplete?.(newPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setConverting(false);
    }
  }, [node, selectedConversion, onConversionComplete]);

  const handleDownload = useCallback(async () => {
    if (!node || !selectedConversion) return;
    setError(null);
    setConverting(true);
    try {
      const engine = getZipEngine();
      const isImage = ["png", "jpg", "jpeg", "webp"].includes(node.extension);
      const content = isImage
        ? await engine.getFileAsArrayBuffer(node.fullPath)
        : await engine.getFileAsText(node.fullPath);
      const result = await convertFile(content, selectedConversion.from, selectedConversion.to);

      const baseName = node.name.replace(/\.[^.]+$/, "");
      const downloadName = `${baseName}.${result.extension}`;

      const blob = typeof result.content === "string"
        ? new Blob([result.content], { type: result.mimeType })
        : result.content;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setConverting(false);
    }
  }, [node, selectedConversion]);

  if (!isOpen) return null;

  return (
    <div className="mac-inspector w-72 flex-shrink-0 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.3)]">
        <span className="text-[10px] font-semibold text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider">
          File Converter
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[hsl(var(--mac-hover))] mac-transition"
          aria-label="Close converter"
        >
          <X className="w-3.5 h-3.5 text-[hsl(var(--mac-text-tertiary))]" />
        </button>
      </div>

      <div className="flex-1 overflow-auto mac-scrollbar p-3">
        {!node || node.type !== "file" ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-[hsl(var(--mac-text-tertiary))] text-center">
              Select a file to convert
            </p>
          </div>
        ) : conversions.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-[hsl(var(--mac-text-tertiary))] text-center leading-relaxed">
              No conversions available for .{node.extension} files
            </p>
          </div>
        ) : (
          <>
            {/* Source file */}
            <div className="mb-3">
              <label className="text-[10px] font-medium text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider block mb-1">
                Source
              </label>
              <div className="px-3 py-2 rounded-md bg-[hsl(var(--mac-hover)/0.5)] border border-[hsl(var(--mac-separator))]">
                <p className="text-xs text-[hsl(var(--mac-text-primary))] truncate font-medium">{node.name}</p>
                <p className="text-[10px] text-[hsl(var(--mac-text-tertiary))]">.{node.extension} file</p>
              </div>
            </div>

            {/* Conversion selector */}
            <div className="mb-3">
              <label className="text-[10px] font-medium text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider block mb-1">
                Convert To
              </label>
              <select
                value={selectedConversion?.to ?? ""}
                onChange={(e) => {
                  const conv = conversions.find((c) => c.to === e.target.value);
                  if (conv) setSelectedConversion(conv);
                }}
                className="w-full px-3 py-2 text-xs rounded-md bg-[hsl(var(--mac-content))] border border-[hsl(var(--mac-separator))] text-[hsl(var(--mac-text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mac-selection)/0.4)]"
              >
                {conversions.map((conv) => (
                  <option key={conv.to} value={conv.to}>
                    {conv.label} (.{conv.to})
                  </option>
                ))}
              </select>
            </div>

            {/* Category badge */}
            {selectedConversion && (
              <div className="mb-3">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[hsl(var(--mac-selection)/0.12)] text-[hsl(var(--mac-selection))] font-medium uppercase tracking-wider">
                  {selectedConversion.category}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 mb-3">
              <button
                onClick={handlePreview}
                disabled={converting || !selectedConversion}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-[hsl(var(--mac-hover))] border border-[hsl(var(--mac-separator))] hover:bg-[hsl(var(--mac-separator))] mac-transition mac-focus-ring text-[hsl(var(--mac-text-primary))] disabled:opacity-50"
              >
                {converting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Preview Result
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleConvert}
                  disabled={converting || !selectedConversion}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-[hsl(var(--mac-selection))] text-[hsl(var(--mac-selection-text))] hover:opacity-90 mac-transition mac-focus-ring disabled:opacity-50"
                >
                  Save to ZIP
                </button>
                <button
                  onClick={handleDownload}
                  disabled={converting || !selectedConversion}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-[hsl(var(--mac-content))] border border-[hsl(var(--mac-separator))] hover:bg-[hsl(var(--mac-hover))] mac-transition mac-focus-ring text-[hsl(var(--mac-text-primary))] disabled:opacity-50"
                  title="Download converted file"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Status messages */}
            {error && (
              <div className="mb-3 px-3 py-2 rounded-md bg-[hsl(0,60%,50%,0.1)] border border-[hsl(0,60%,50%,0.2)]">
                <p className="text-[10px] text-[hsl(0,60%,50%)]">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-3 px-3 py-2 rounded-md bg-[hsl(120,60%,40%,0.1)] border border-[hsl(120,60%,40%,0.2)]">
                <p className="text-[10px] text-[hsl(120,60%,40%)]">{success}</p>
              </div>
            )}

            {/* Preview output */}
            {preview && (
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider block mb-1">
                  Preview
                </label>
                <pre className="p-3 text-[10px] font-mono leading-relaxed rounded-md bg-[hsl(var(--mac-hover)/0.5)] border border-[hsl(var(--mac-separator))] overflow-auto mac-scrollbar max-h-64 text-[hsl(var(--mac-text-primary))] whitespace-pre-wrap break-all">
                  {preview}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
