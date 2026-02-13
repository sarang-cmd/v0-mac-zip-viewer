"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getZipEngine } from "@/lib/zip-engine";

interface MarkdownPreviewProps {
  filePath: string;
  mode: "preview" | "split";
  onOpenInEditor?: () => void;
}

export function MarkdownPreview({ filePath, mode, onOpenInEditor }: MarkdownPreviewProps) {
  const [content, setContent] = useState<string>("");
  const [editContent, setEditContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const engine = getZipEngine();
    engine
      .getFileAsText(filePath)
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setEditContent(text);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [filePath]);

  const handleSave = useCallback(() => {
    const engine = getZipEngine();
    engine.updateFile(filePath, editContent);
    setContent(editContent);
  }, [filePath, editContent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 rounded-full border-2 border-[hsl(var(--mac-selection))] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>
      </div>
    );
  }

  if (mode === "split") {
    const isDirty = editContent !== content;

    return (
      <div className="flex h-full">
        {/* Editor pane */}
        <div className="flex-1 flex flex-col border-r border-[hsl(var(--mac-separator))]">
          <div className="flex items-center justify-between px-3 py-1 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.3)]">
            <span className="text-[10px] text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider">
              Editor {isDirty && "(modified)"}
            </span>
            {isDirty && (
              <button
                onClick={handleSave}
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-[hsl(var(--mac-selection))] text-[hsl(var(--mac-selection-text))] hover:opacity-90 mac-transition"
              >
                Save
              </button>
            )}
          </div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="flex-1 p-3 text-xs leading-relaxed font-mono bg-transparent text-[hsl(var(--mac-text-primary))] resize-none focus:outline-none whitespace-pre-wrap"
            spellCheck={false}
          />
        </div>

        {/* Preview pane */}
        <div className="flex-1 flex flex-col">
          <div className="px-3 py-1 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.3)]">
            <span className="text-[10px] text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider">
              Preview
            </span>
          </div>
          <div className="flex-1 overflow-auto mac-scrollbar p-4">
            <div className="markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {editContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Preview only
  return (
    <div className="flex-1 overflow-auto mac-scrollbar p-6">
      <div className="max-w-2xl mx-auto markdown-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
