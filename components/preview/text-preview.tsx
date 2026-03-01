"use client";

import { useState, useEffect, useMemo } from "react";
import { getZipEngine } from "@/lib/zip-engine";
import { getLanguageFromExtension } from "@/lib/types";
import { tokenizeLine, TOKEN_COLORS } from "@/lib/syntax-highlight";

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
  const lines = useMemo(() => content?.split("\n") ?? [], [content]);

  // Pre-tokenize all lines for syntax highlighting
  const highlightedLines = useMemo(() => {
    if (!content) return [];
    return lines.map((line) => tokenizeLine(line, lang));
  }, [lines, lang, content]);

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
          {lang} - {lines.length} lines
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
      <pre className="flex-1 overflow-auto mac-scrollbar p-0 text-xs leading-[1.65] font-mono">
        <table className="w-full border-collapse">
          <tbody>
            {highlightedLines.map((tokens, i) => (
              <tr key={i} className="hover:bg-[hsl(var(--mac-hover)/0.4)]">
                <td className="text-[hsl(var(--mac-text-tertiary)/0.6)] select-none w-12 text-right pr-3 pl-3 align-top tabular-nums border-r border-[hsl(var(--mac-separator)/0.3)] bg-[hsl(var(--mac-hover)/0.2)]">
                  {i + 1}
                </td>
                <td className="pl-4 pr-3 whitespace-pre-wrap break-words">
                  {tokens.length === 0 ? (
                    <span>{"\u00A0"}</span>
                  ) : (
                    tokens.map((token, j) => (
                      <span key={j} className={TOKEN_COLORS[token.type]}>
                        {token.value}
                      </span>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </pre>
    </div>
  );
}
