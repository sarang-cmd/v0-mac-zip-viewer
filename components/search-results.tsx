"use client";

import type { TreeNode, FolderNode } from "@/lib/types";
import { getFileIcon } from "./mac-icons";
import { Search } from "./mac-icons";

interface SearchResultsProps {
  results: TreeNode[];
  query: string;
  selectedId: string | null;
  onSelect: (node: TreeNode) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function SearchResults({
  results,
  query,
  selectedId,
  onSelect,
  onContextMenu,
}: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 mac-content p-8">
        <Search className="w-10 h-10 text-[hsl(var(--mac-text-tertiary)/0.4)]" />
        <p className="text-sm font-medium text-[hsl(var(--mac-text-secondary))]">
          No results found
        </p>
        <p className="text-xs text-[hsl(var(--mac-text-tertiary))]">
          {'No items match "'}{query}{'"'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 mac-content overflow-auto mac-scrollbar p-2">
      <div className="px-2 py-1 mb-1">
        <span className="text-[10px] font-medium text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider">
          {results.length} result{results.length !== 1 ? "s" : ""}
        </span>
      </div>
      <ul role="listbox" aria-label="Search results">
        {results.map((node) => {
          const Icon = getFileIcon(node, false);
          const isSelected = selectedId === node.id;

          return (
            <li key={node.id} role="option" aria-selected={isSelected}>
              <button
                onClick={() => onSelect(node)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, node);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md mac-transition mac-focus-ring ${
                  isSelected
                    ? "mac-selected"
                    : "hover:bg-[hsl(var(--mac-hover))]"
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    node.type === "folder"
                      ? isSelected
                        ? "text-[hsl(var(--mac-selection-text))]"
                        : "text-[hsl(211,100%,50%)]"
                      : isSelected
                        ? "text-[hsl(var(--mac-selection-text)/0.8)]"
                        : "text-[hsl(var(--mac-text-tertiary))]"
                  }`}
                />
                <div className="flex-1 text-left min-w-0">
                  <div
                    className={`text-xs truncate ${
                      isSelected
                        ? "text-[hsl(var(--mac-selection-text))]"
                        : "text-[hsl(var(--mac-text-primary))]"
                    }`}
                  >
                    {highlightMatch(node.name, query)}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isSelected
                        ? "text-[hsl(var(--mac-selection-text)/0.6)]"
                        : "text-[hsl(var(--mac-text-tertiary))]"
                    }`}
                  >
                    {node.fullPath}
                  </div>
                </div>
                <span
                  className={`text-[10px] tabular-nums flex-shrink-0 ${
                    isSelected
                      ? "text-[hsl(var(--mac-selection-text)/0.6)]"
                      : "text-[hsl(var(--mac-text-tertiary))]"
                  }`}
                >
                  {formatBytes(node.size)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
