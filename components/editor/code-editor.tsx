"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { EditorTab } from "@/lib/types";
import { getLanguageFromExtension } from "@/lib/types";
import { getZipEngine } from "@/lib/zip-engine";
import { tokenizeLine, TOKEN_COLORS } from "@/lib/syntax-highlight";
import { X, Search, WrapText, Braces } from "lucide-react";

interface CodeEditorProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
  onSave: (id: string) => void;
}

export function CodeEditor({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onContentChange,
  onSave,
}: CodeEditorProps) {
  const [wordWrap, setWordWrap] = useState(true);
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (activeTabId) onSave(activeTabId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowFind(true);
        setTimeout(() => findInputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") {
        setShowFind(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, onSave]);

  const handleFormatJson = useCallback(() => {
    if (!activeTab || activeTab.language !== "json") return;
    try {
      const parsed = JSON.parse(activeTab.content);
      const formatted = JSON.stringify(parsed, null, 2);
      onContentChange(activeTab.id, formatted);
    } catch {
      // Invalid JSON, can't format
    }
  }, [activeTab, onContentChange]);

  const handleFindReplace = useCallback(() => {
    if (!activeTab || !findQuery) return;
    const newContent = activeTab.content.replaceAll(findQuery, replaceQuery);
    onContentChange(activeTab.id, newContent);
  }, [activeTab, findQuery, replaceQuery, onContentChange]);

  const lineCount = activeTab?.content.split("\n").length ?? 0;

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-xs text-[hsl(var(--mac-text-tertiary))]">
          Open a text file to edit
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.3)] overflow-x-auto mac-scrollbar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`mac-tab ${tab.id === activeTabId ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={tab.id === activeTabId}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") onTabChange(tab.id); }}
          >
            {tab.isDirty && <span className="unsaved-dot" />}
            <span className="text-[hsl(var(--mac-text-primary))] truncate flex-1 min-w-0">
              {tab.fileName}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-[hsl(var(--mac-separator))] mac-transition"
              aria-label={`Close ${tab.fileName}`}
            >
              <X className="w-3 h-3 text-[hsl(var(--mac-text-tertiary))]" />
            </button>
          </div>
        ))}
      </div>

      {/* Find/Replace bar */}
      {showFind && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.5)]">
          <Search className="w-3 h-3 text-[hsl(var(--mac-text-tertiary))] flex-shrink-0" />
          <input
            ref={findInputRef}
            type="text"
            placeholder="Find"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            className="flex-1 max-w-[160px] text-xs px-2 py-1 rounded bg-[hsl(var(--mac-content))] border border-[hsl(var(--mac-separator))] text-[hsl(var(--mac-text-primary))] placeholder:text-[hsl(var(--mac-text-tertiary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--mac-selection)/0.4)]"
          />
          <input
            type="text"
            placeholder="Replace"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            className="flex-1 max-w-[160px] text-xs px-2 py-1 rounded bg-[hsl(var(--mac-content))] border border-[hsl(var(--mac-separator))] text-[hsl(var(--mac-text-primary))] placeholder:text-[hsl(var(--mac-text-tertiary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--mac-selection)/0.4)]"
          />
          <button
            onClick={handleFindReplace}
            className="text-[10px] px-2 py-1 rounded bg-[hsl(var(--mac-hover))] hover:bg-[hsl(var(--mac-separator))] mac-transition text-[hsl(var(--mac-text-secondary))]"
          >
            Replace All
          </button>
          <button
            onClick={() => setShowFind(false)}
            className="p-1 rounded hover:bg-[hsl(var(--mac-hover))] mac-transition"
            aria-label="Close find"
          >
            <X className="w-3 h-3 text-[hsl(var(--mac-text-tertiary))]" />
          </button>
        </div>
      )}

      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.3)]">
        <span className="text-[10px] text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider">
          {activeTab?.language ?? "text"} - {lineCount} lines
          {activeTab?.isDirty && " (modified)"}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWordWrap((w) => !w)}
            className={`p-1 rounded mac-transition mac-focus-ring ${
              wordWrap
                ? "bg-[hsl(var(--mac-selection)/0.12)] text-[hsl(var(--mac-selection))]"
                : "text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))]"
            }`}
            title="Word wrap"
            aria-label="Toggle word wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>
          {activeTab?.language === "json" && (
            <button
              onClick={handleFormatJson}
              className="p-1 rounded mac-transition mac-focus-ring text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))]"
              title="Format JSON"
              aria-label="Format JSON"
            >
              <Braces className="w-3.5 h-3.5" />
            </button>
          )}
          {activeTab?.isDirty && (
            <button
              onClick={() => { if (activeTabId) onSave(activeTabId); }}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-[hsl(var(--mac-selection))] text-[hsl(var(--mac-selection-text))] hover:opacity-90 mac-transition mac-focus-ring"
            >
              Save
            </button>
          )}
        </div>
      </div>

      {/* Editor content */}
      {activeTab && (
        <div className="flex-1 overflow-auto mac-scrollbar relative">
          <div className="flex min-h-full">
            {/* Line numbers */}
            <div className="flex flex-col items-end py-3 pl-3 pr-2 bg-[hsl(var(--mac-hover)/0.3)] select-none flex-shrink-0 border-r border-[hsl(var(--mac-separator)/0.5)]">
              {activeTab.content.split("\n").map((_, i) => (
                <span
                  key={i}
                  className="text-[11px] leading-[1.6] tabular-nums text-[hsl(var(--mac-text-tertiary)/0.6)] h-[17.6px]"
                >
                  {i + 1}
                </span>
              ))}
            </div>

            {/* Text area */}
            <textarea
              ref={textareaRef}
              value={activeTab.content}
              onChange={(e) => onContentChange(activeTab.id, e.target.value)}
              className={`flex-1 p-3 text-[11px] leading-[1.6] font-mono bg-transparent text-[hsl(var(--mac-text-primary))] resize-none focus:outline-none ${
                wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
              }`}
              spellCheck={false}
              aria-label={`Editor for ${activeTab.fileName}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
