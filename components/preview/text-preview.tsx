"use client";

import { useState, useEffect } from "react";
import { getZipEngine } from "@/lib/zip-engine";
import { getLanguageFromExtension } from "@/lib/types";

interface TextPreviewProps {
  filePath: string;
  extension: string;
  onEdit?: () => void;
}

export function TextPreview({ filePath, extension, onEdit }: TextPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);

    const engine = getZipEngine();
    engine
      .getFileAsText(filePath)
      .then((text) => {
        if (!cancelled) {
          setContent(text);
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

  const lang = getLanguageFromExtension(extension);
  const lineCount = content?.split("\n").length ?? 0;

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.5)]">
        <span className="text-[10px] text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider">
          {lang} - {lineCount} lines
        </span>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-[10px] font-medium text-[hsl(var(--mac-selection))] hover:underline mac-focus-ring rounded px-1"
          >
            Edit
          </button>
        )}
      </div>
      <pre className="flex-1 overflow-auto mac-scrollbar p-3 text-xs leading-relaxed font-mono text-[hsl(var(--mac-text-primary))] whitespace-pre-wrap break-words">
        {content?.split("\n").map((line, i) => (
          <div key={i} className="flex">
            <span className="text-[hsl(var(--mac-text-tertiary))] select-none w-10 text-right pr-3 flex-shrink-0 tabular-nums">
              {i + 1}
            </span>
            <span className="flex-1 min-w-0">{line || "\u00A0"}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
