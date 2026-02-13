"use client";

import type { TreeNode, PreviewMode } from "@/lib/types";
import { TEXT_EXTENSIONS, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from "@/lib/types";
import { TextPreview } from "./text-preview";
import { ImagePreview } from "./image-preview";
import { AudioPreview } from "./audio-preview";
import { VideoPreview } from "./video-preview";
import { HexPreview } from "./hex-preview";
import { MarkdownPreview } from "../editor/markdown-preview";
import { Eye, FileText, Pencil } from "lucide-react";

interface QuickLookProps {
  node: TreeNode | null;
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  onOpenInEditor?: (filePath: string) => void;
}

function getPreviewType(node: TreeNode): "text" | "image" | "audio" | "video" | "markdown" | "binary" {
  if (node.type !== "file") return "binary";
  const ext = node.extension;
  if (ext === "md") return "markdown";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return "binary";
}

export function QuickLook({ node, mode, onModeChange, onOpenInEditor }: QuickLookProps) {
  if (!node) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <Eye className="w-10 h-10 text-[hsl(var(--mac-text-tertiary)/0.3)]" />
        <p className="text-xs text-[hsl(var(--mac-text-tertiary))]">
          Select a file to preview
        </p>
      </div>
    );
  }

  if (node.type === "folder") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <FileText className="w-10 h-10 text-[hsl(var(--mac-text-tertiary)/0.3)]" />
        <p className="text-sm font-medium text-[hsl(var(--mac-text-primary))]">{node.name}</p>
        <p className="text-xs text-[hsl(var(--mac-text-tertiary))]">
          Folder - select a file to preview
        </p>
      </div>
    );
  }

  const previewType = getPreviewType(node);

  // Mode selector for applicable types
  const showModeSelector = previewType === "markdown" || previewType === "text" || previewType === "image";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mode selector bar */}
      {showModeSelector && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.3)]">
          <button
            onClick={() => onModeChange("preview")}
            className={`text-[10px] px-2 py-0.5 rounded mac-transition mac-focus-ring ${
              mode === "preview"
                ? "bg-[hsl(var(--mac-selection)/0.12)] text-[hsl(var(--mac-selection))] font-medium"
                : "text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))]"
            }`}
          >
            Preview
          </button>
          {previewType === "markdown" && (
            <button
              onClick={() => onModeChange("split")}
              className={`text-[10px] px-2 py-0.5 rounded mac-transition mac-focus-ring ${
                mode === "split"
                  ? "bg-[hsl(var(--mac-selection)/0.12)] text-[hsl(var(--mac-selection))] font-medium"
                  : "text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))]"
              }`}
            >
              Split
            </button>
          )}
          {(previewType === "text" || previewType === "markdown") && onOpenInEditor && (
            <button
              onClick={() => onOpenInEditor(node.fullPath)}
              className="text-[10px] px-2 py-0.5 rounded mac-transition mac-focus-ring text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))] flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
          {previewType === "image" && (
            <button
              onClick={() => onModeChange("annotate")}
              className={`text-[10px] px-2 py-0.5 rounded mac-transition mac-focus-ring ${
                mode === "annotate"
                  ? "bg-[hsl(var(--mac-selection)/0.12)] text-[hsl(var(--mac-selection))] font-medium"
                  : "text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))]"
              }`}
            >
              Annotate
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {previewType === "text" && (
          <TextPreview
            filePath={node.fullPath}
            extension={node.extension}
            onEdit={onOpenInEditor ? () => onOpenInEditor(node.fullPath) : undefined}
          />
        )}
        {previewType === "markdown" && (
          <MarkdownPreview
            filePath={node.fullPath}
            mode={mode === "split" ? "split" : "preview"}
            onOpenInEditor={onOpenInEditor ? () => onOpenInEditor(node.fullPath) : undefined}
          />
        )}
        {previewType === "image" && (
          <ImagePreview
            filePath={node.fullPath}
            extension={node.extension}
            onAnnotate={mode === "annotate" ? undefined : () => onModeChange("annotate")}
          />
        )}
        {previewType === "audio" && (
          <AudioPreview
            filePath={node.fullPath}
            extension={node.extension}
            fileName={node.name}
          />
        )}
        {previewType === "video" && (
          <VideoPreview
            filePath={node.fullPath}
            extension={node.extension}
            fileName={node.name}
          />
        )}
        {previewType === "binary" && (
          <HexPreview
            filePath={node.fullPath}
            fileName={node.name}
            fileSize={node.size}
          />
        )}
      </div>
    </div>
  );
}
