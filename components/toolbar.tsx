"use client";

import { useCallback, useRef } from "react";
import {
  Search,
  Download,
  Upload,
  SidebarClose,
  SidebarOpen,
  Info,
  ListTree,
  List,
  X,
} from "./mac-icons";

interface ToolbarProps {
  onFileSelect: (file: File) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onExport: (format: "tree" | "flat") => void;
  onExportSelected: (format: "tree" | "flat") => void;
  hasData: boolean;
  hasSelection: boolean;
  entryCount: number;
  totalSize: number;
  isLoading: boolean;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  zipFileName: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function Toolbar({
  onFileSelect,
  onSearch,
  searchQuery,
  onExport,
  onExportSelected,
  hasData,
  hasSelection,
  entryCount,
  totalSize,
  isLoading,
  inspectorOpen,
  onToggleInspector,
  sidebarOpen,
  onToggleSidebar,
  zipFileName,
}: ToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      // Reset so the same file can be selected again
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFileSelect]
  );

  return (
    <div className="mac-toolbar flex items-center gap-2 px-3 py-2 select-none">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[hsl(var(--mac-hover))] mac-transition mac-focus-ring text-[hsl(var(--mac-text-secondary))]"
        aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      >
        {sidebarOpen ? (
          <SidebarClose className="w-4 h-4" />
        ) : (
          <SidebarOpen className="w-4 h-4" />
        )}
      </button>

      {/* Separator */}
      <div className="w-px h-5 bg-[hsl(var(--mac-separator))]" />

      {/* Open ZIP button */}
      <label className="mac-focus-ring rounded-md">
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="sr-only"
          onChange={handleFileChange}
          aria-label="Open ZIP file"
        />
        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[hsl(var(--mac-content))] border border-[hsl(var(--mac-separator))] hover:bg-[hsl(var(--mac-hover))] mac-transition cursor-pointer text-[hsl(var(--mac-text-primary))] shadow-sm">
          <Upload className="w-3.5 h-3.5" />
          Open ZIP...
        </span>
      </label>

      {/* Search */}
      <div className="flex-1 max-w-xs ml-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--mac-text-tertiary))]" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-md bg-[hsl(var(--mac-content))] border border-[hsl(var(--mac-separator))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mac-selection)/0.4)] mac-transition text-[hsl(var(--mac-text-primary))] placeholder:text-[hsl(var(--mac-text-tertiary))]"
            aria-label="Search files"
            disabled={!hasData}
          />
          {searchQuery && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))]"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status */}
      {hasData && !isLoading && (
        <span className="text-[10px] text-[hsl(var(--mac-text-tertiary))] tabular-nums whitespace-nowrap">
          {entryCount.toLocaleString()} items, {formatBytes(totalSize)}
        </span>
      )}

      {isLoading && (
        <span className="text-[10px] text-[hsl(var(--mac-text-tertiary))] whitespace-nowrap animate-pulse">
          Processing...
        </span>
      )}

      {/* Separator */}
      {hasData && <div className="w-px h-5 bg-[hsl(var(--mac-separator))]" />}

      {/* Export buttons */}
      {hasData && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onExport("tree")}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md hover:bg-[hsl(var(--mac-hover))] mac-transition mac-focus-ring text-[hsl(var(--mac-text-secondary))]"
            title="Export as nested tree JSON"
            aria-label="Export as nested tree JSON"
          >
            <ListTree className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tree</span>
          </button>
          <button
            onClick={() => onExport("flat")}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md hover:bg-[hsl(var(--mac-hover))] mac-transition mac-focus-ring text-[hsl(var(--mac-text-secondary))]"
            title="Export as flat list JSON"
            aria-label="Export as flat list JSON"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flat</span>
          </button>
          {hasSelection && (
            <>
              <div className="w-px h-4 bg-[hsl(var(--mac-separator))]" />
              <button
                onClick={() => onExportSelected("tree")}
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-md hover:bg-[hsl(var(--mac-hover))] mac-transition mac-focus-ring text-[hsl(var(--mac-text-tertiary))]"
                title="Export selected subtree"
                aria-label="Export selected subtree"
              >
                <Download className="w-3 h-3" />
                Selected
              </button>
            </>
          )}
        </div>
      )}

      {/* Inspector toggle */}
      {hasData && (
        <>
          <div className="w-px h-5 bg-[hsl(var(--mac-separator))]" />
          <button
            onClick={onToggleInspector}
            className={`flex items-center justify-center w-7 h-7 rounded-md mac-transition mac-focus-ring ${
              inspectorOpen
                ? "bg-[hsl(var(--mac-selection)/0.12)] text-[hsl(var(--mac-selection))]"
                : "hover:bg-[hsl(var(--mac-hover))] text-[hsl(var(--mac-text-secondary))]"
            }`}
            aria-label={inspectorOpen ? "Hide inspector" : "Show inspector"}
            title={inspectorOpen ? "Hide inspector" : "Show inspector"}
          >
            <Info className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
