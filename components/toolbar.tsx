"use client";

import { useCallback, useRef, useState } from "react";
import {
  Search, Download, Upload, SidebarClose, SidebarOpen, Info,
  ListTree, List, X, ArrowDownToLine, FileBarChart, Eye,
  RefreshCw,
} from "./mac-icons";
import { ThemeToggle } from "./theme-toggle";

interface ToolbarProps {
  onFileSelect: (file: File) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onExport: (format: "tree" | "flat") => void;
  onExportManifest: () => void;
  onDownloadZip: () => void;
  hasData: boolean;
  hasSelection: boolean;
  hasDirtyTabs: boolean;
  entryCount: number;
  totalSize: number;
  isLoading: boolean;
  loadingProgress: number;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  previewOpen: boolean;
  onTogglePreview: () => void;
  converterOpen: boolean;
  onToggleConverter: () => void;
  zipFileName: string;
  parseMode: "client" | "server";
  onParseModeChange: (mode: "client" | "server") => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function Toolbar({
  onFileSelect, onSearch, searchQuery, onExport, onExportManifest,
  onDownloadZip, hasData, hasDirtyTabs, entryCount, totalSize,
  isLoading, loadingProgress, inspectorOpen, onToggleInspector,
  sidebarOpen, onToggleSidebar, previewOpen, onTogglePreview,
  zipFileName, parseMode, onParseModeChange,
}: ToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFileSelect]
  );

  return (
    <header className="mac-toolbar mac-noise flex items-center gap-2 px-3 py-2 select-none">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[hsl(var(--mac-hover))] mac-transition mac-focus-ring text-[hsl(var(--mac-text-secondary))]"
        aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      >
        {sidebarOpen ? <SidebarClose className="w-4 h-4" /> : <SidebarOpen className="w-4 h-4" />}
      </button>

      <div className="w-px h-5 bg-[hsl(var(--mac-separator))]" />

      {/* Open ZIP */}
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

      {/* Parse mode toggle */}
      <div className="flex items-center bg-[hsl(var(--mac-hover))] rounded-md p-0.5">
        <button
          onClick={() => onParseModeChange("client")}
          className={`text-[10px] px-2 py-0.5 rounded mac-transition ${
            parseMode === "client"
              ? "bg-[hsl(var(--mac-content))] shadow-sm text-[hsl(var(--mac-text-primary))] font-medium"
              : "text-[hsl(var(--mac-text-tertiary))]"
          }`}
          title="Parse in-browser (privacy-first, no upload)"
        >
          Local
        </button>
        <button
          onClick={() => onParseModeChange("server")}
          className={`text-[10px] px-2 py-0.5 rounded mac-transition ${
            parseMode === "server"
              ? "bg-[hsl(var(--mac-content))] shadow-sm text-[hsl(var(--mac-text-primary))] font-medium"
              : "text-[hsl(var(--mac-text-tertiary))]"
          }`}
          title="Parse on server (better for large files)"
        >
          Server
        </button>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xs ml-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--mac-text-tertiary))]" />
          <input
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

      <div className="flex-1" />

      {/* Loading progress */}
      {isLoading && (
        <div className="flex items-center gap-2">
          <div className="mac-progress w-20">
            <div className="mac-progress-bar" style={{ width: `${loadingProgress}%` }} />
          </div>
          <span className="text-[10px] text-[hsl(var(--mac-text-tertiary))] tabular-nums whitespace-nowrap">
            {loadingProgress}%
          </span>
        </div>
      )}

      {/* Status */}
      {hasData && !isLoading && (
        <span className="text-[10px] text-[hsl(var(--mac-text-tertiary))] tabular-nums whitespace-nowrap">
          {entryCount.toLocaleString()} items, {formatBytes(totalSize)}
        </span>
      )}

      {hasData && <div className="w-px h-5 bg-[hsl(var(--mac-separator))]" />}

      {/* Export / download */}
      {hasData && (
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md hover:bg-[hsl(var(--mac-hover))] mac-transition mac-focus-ring text-[hsl(var(--mac-text-secondary))]"
            title="Export options"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 mac-context-menu py-1 min-w-[200px]">
                <button onClick={() => { onExport("tree"); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[hsl(var(--mac-text-primary))] hover:bg-[hsl(var(--mac-selection))] hover:text-[hsl(var(--mac-selection-text))] mac-transition rounded-sm mx-0.5" style={{ width: "calc(100% - 4px)" }}>
                  <ListTree className="w-3.5 h-3.5" />
                  Export Tree JSON
                </button>
                <button onClick={() => { onExport("flat"); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[hsl(var(--mac-text-primary))] hover:bg-[hsl(var(--mac-selection))] hover:text-[hsl(var(--mac-selection-text))] mac-transition rounded-sm mx-0.5" style={{ width: "calc(100% - 4px)" }}>
                  <List className="w-3.5 h-3.5" />
                  Export Flat JSON
                </button>
                <button onClick={() => { onExportManifest(); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[hsl(var(--mac-text-primary))] hover:bg-[hsl(var(--mac-selection))] hover:text-[hsl(var(--mac-selection-text))] mac-transition rounded-sm mx-0.5" style={{ width: "calc(100% - 4px)" }}>
                  <FileBarChart className="w-3.5 h-3.5" />
                  Export Manifest
                </button>
                <div className="my-1 border-t border-[hsl(var(--mac-separator))]" />
                <button onClick={() => { onDownloadZip(); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[hsl(var(--mac-text-primary))] hover:bg-[hsl(var(--mac-selection))] hover:text-[hsl(var(--mac-selection-text))] mac-transition rounded-sm mx-0.5 font-medium" style={{ width: "calc(100% - 4px)" }}>
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  Download Updated ZIP{hasDirtyTabs ? " *" : ""}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {hasData && <div className="w-px h-5 bg-[hsl(var(--mac-separator))]" />}

      {/* Preview toggle */}
      {hasData && (
        <button
          onClick={onTogglePreview}
          className={`flex items-center justify-center w-7 h-7 rounded-md mac-transition mac-focus-ring ${
            previewOpen
              ? "bg-[hsl(var(--mac-selection)/0.12)] text-[hsl(var(--mac-selection))]"
              : "hover:bg-[hsl(var(--mac-hover))] text-[hsl(var(--mac-text-secondary))]"
          }`}
          aria-label={previewOpen ? "Hide preview" : "Show preview"}
          title={previewOpen ? "Hide Quick Look" : "Show Quick Look"}
        >
          <Eye className="w-4 h-4" />
        </button>
      )}

      {/* Inspector toggle */}
      {hasData && (
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
      )}

      <div className="w-px h-5 bg-[hsl(var(--mac-separator))]" />

      {/* Theme toggle */}
      <ThemeToggle />
    </header>
  );
}
