"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  TreeNode,
  FolderNode,
  FilterType,
  FavoriteItem,
  EditorTab,
  PreviewMode,
  ParseResponse,
} from "@/lib/types";
import { FILE_CATEGORIES, getLanguageFromExtension, TEXT_EXTENSIONS } from "@/lib/types";
import { buildExport, buildManifest, downloadJson } from "@/lib/export-utils";
import { getZipEngine, resetZipEngine } from "@/lib/zip-engine";
import { Toolbar } from "./toolbar";
import { Sidebar } from "./sidebar";
import { TreeView } from "./tree-view";
import { Inspector } from "./inspector";
import { Breadcrumbs } from "./breadcrumbs";
import { DropZone } from "./drop-zone";
import { ContextMenu } from "./context-menu";
import { SearchResults } from "./search-results";
import { QuickLook } from "./preview/quick-look";
import { CodeEditor } from "./editor/code-editor";
import { ConverterPanel } from "./converter-panel";
import { getAvailableConversions } from "@/lib/file-converter";

// ── Helpers ──────────────────────────────────────────────────────────

function collectAllNodes(node: TreeNode): TreeNode[] {
  const nodes: TreeNode[] = [node];
  if (node.type === "folder") {
    for (const child of (node as FolderNode).children) {
      nodes.push(...collectAllNodes(child));
    }
  }
  return nodes;
}

function findNodeById(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root;
  if (root.type === "folder") {
    for (const child of (root as FolderNode).children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

function findNodeByPath(root: TreeNode, path: string): TreeNode | null {
  if (root.fullPath === path) return root;
  if (root.type === "folder") {
    for (const child of (root as FolderNode).children) {
      const found = findNodeByPath(child, path);
      if (found) return found;
    }
  }
  return null;
}

function getAncestorIds(root: TreeNode, targetId: string): string[] {
  const path: string[] = [];
  function dfs(node: TreeNode): boolean {
    if (node.id === targetId) return true;
    if (node.type === "folder") {
      for (const child of (node as FolderNode).children) {
        if (dfs(child)) {
          path.push(node.id);
          return true;
        }
      }
    }
    return false;
  }
  dfs(root);
  return path;
}

function matchesFilter(node: TreeNode, filter: FilterType): boolean {
  if (filter === "all") return true;
  if (filter === "folders") return node.type === "folder";
  if (filter === "files") return node.type === "file";
  if (node.type === "file") {
    const exts = FILE_CATEGORIES[filter as keyof typeof FILE_CATEGORIES];
    return exts ? exts.includes(node.extension) : false;
  }
  return false;
}

// ── Local storage helpers for favorites ──────────────────────────────

function loadFavorites(): FavoriteItem[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("zip-explorer-favorites") : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(items: FavoriteItem[]): void {
  try {
    localStorage.setItem("zip-explorer-favorites", JSON.stringify(items));
  } catch {
    // ignore
  }
}

// ── Main Component ───────────────────────────────────────────────────

export function ZipExplorer() {
  // Core state
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [zipFileName, setZipFileName] = useState<string>("");
  const [metadata, setMetadata] = useState<ParseResponse["metadata"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("preview");
  const [parseMode, setParseMode] = useState<"client" | "server">("client");

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: TreeNode;
  } | null>(null);

  // Favorites & recents
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);

  // Editor tabs
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Converter panel
  const [converterOpen, setConverterOpen] = useState(false);

  // Draggable divider state
  const [sidebarWidth, setSidebarWidth] = useState(208);
  const [previewWidth, setPreviewWidth] = useState(350);
  const sidebarResizeRef = useRef<{ startX: number; startW: number } | null>(null);
  const previewResizeRef = useRef<{ startX: number; startW: number } | null>(null);

  // Global drag-and-drop overlay
  const [isDragOverWindow, setIsDragOverWindow] = useState(false);
  const dragCounterRef = useRef(0);

  // Load favorites from localStorage on mount
  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  // Save favorites on change
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // Global drag & drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) setIsDragOverWindow(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) setIsDragOverWindow(false);
    };
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOverWindow(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.endsWith(".zip") || file.type.includes("zip")) {
          handleFileSelect(file);
        }
      }
    };
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sidebar divider dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sidebarResizeRef.current) {
        const delta = e.clientX - sidebarResizeRef.current.startX;
        const newWidth = Math.max(160, Math.min(400, sidebarResizeRef.current.startW + delta));
        setSidebarWidth(newWidth);
      }
      if (previewResizeRef.current) {
        const delta = previewResizeRef.current.startX - e.clientX;
        const newWidth = Math.max(250, Math.min(600, previewResizeRef.current.startW + delta));
        setPreviewWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      sidebarResizeRef.current = null;
      previewResizeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Selected node
  const selectedNode = useMemo(() => {
    if (!tree || !selectedId) return null;
    return findNodeById(tree, selectedId);
  }, [tree, selectedId]);

  // All flat nodes for search & filter counting
  const allNodes = useMemo(() => {
    if (!tree) return [];
    return collectAllNodes(tree);
  }, [tree]);

  // Filter counts
  const fileCounts = useMemo<Record<FilterType, number>>(() => {
    const counts: Record<FilterType, number> = {
      all: 0, folders: 0, files: 0, images: 0, code: 0,
      documents: 0, archives: 0, audio: 0, video: 0,
    };
    for (const node of allNodes) {
      if (node.id === tree?.id) continue;
      counts.all++;
      if (node.type === "folder") counts.folders++;
      else counts.files++;
      if (node.type === "file") {
        for (const cat of Object.keys(FILE_CATEGORIES) as Array<keyof typeof FILE_CATEGORIES>) {
          if (FILE_CATEGORIES[cat].includes(node.extension)) {
            counts[cat]++;
          }
        }
      }
    }
    return counts;
  }, [allNodes, tree]);

  // Search & filter results
  const searchResults = useMemo(() => {
    if (!searchQuery && activeFilter === "all") return null;
    let results = allNodes.filter((n) => n.id !== tree?.id);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (n) => n.name.toLowerCase().includes(q) || n.fullPath.toLowerCase().includes(q)
      );
    }
    if (activeFilter !== "all") {
      results = results.filter((n) => matchesFilter(n, activeFilter));
    }
    return results;
  }, [allNodes, searchQuery, activeFilter, tree]);

  const hasDirtyTabs = editorTabs.some((t) => t.isDirty);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setError(null);
    setTree(null);
    setSelectedId(null);
    setSearchQuery("");
    setActiveFilter("all");
    setExpandedIds(new Set());
    setEditorTabs([]);
    setActiveTabId(null);
    setShowEditor(false);

    try {
      if (parseMode === "client") {
        const engine = resetZipEngine();
        const buffer = await file.arrayBuffer();
        setLoadingProgress(20);
        const result = await engine.loadFromBuffer(buffer, file.name, (pct) => {
          setLoadingProgress(20 + Math.round(pct * 0.7));
        });
        setTree(result.tree);
        setZipFileName(file.name);
        setMetadata({
          zipFileName: file.name,
          totalFiles: result.totalFiles,
          totalFolders: result.totalFolders,
          totalSize: result.totalSize,
          totalCompressedSize: result.totalCompressedSize,
          entryCount: result.entryCount,
        });
        setExpandedIds(new Set([result.tree.id]));
        setLoadingProgress(100);
      } else {
        setLoadingProgress(10);
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/zip/parse", { method: "POST", body: formData });
        setLoadingProgress(80);
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Failed to parse ZIP file.");
          return;
        }
        const response = data as ParseResponse;
        setTree(response.tree);
        setZipFileName(response.metadata.zipFileName);
        setMetadata(response.metadata);
        setExpandedIds(new Set([response.tree.id]));
        setLoadingProgress(100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
      }, 300);
    }
  }, [parseMode]);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback((node: TreeNode) => {
    setSelectedId(node.id);
    // Add to recents
    setRecentPaths((prev) => {
      const filtered = prev.filter((p) => p !== node.fullPath);
      return [node.fullPath, ...filtered].slice(0, 10);
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleExport = useCallback(
    (format: "tree" | "flat") => {
      if (!tree) return;
      const payload = buildExport(tree, zipFileName, format, null);
      const filename = `${zipFileName.replace(/\.zip$/i, "")}-${format}.json`;
      downloadJson(payload, filename);
    },
    [tree, zipFileName]
  );

  const handleExportManifest = useCallback(() => {
    if (!tree || !metadata) return;
    const manifest = buildManifest(tree, zipFileName, metadata.totalCompressedSize);
    const filename = `${zipFileName.replace(/\.zip$/i, "")}-manifest.json`;
    downloadJson(manifest, filename);
  }, [tree, zipFileName, metadata]);

  const handleDownloadZip = useCallback(async () => {
    try {
      const engine = getZipEngine();
      if (!engine.isLoaded()) return;
      await engine.downloadZip();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download ZIP.");
    }
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: TreeNode) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, node });
    },
    []
  );

  const handleCopyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path).catch(() => {});
  }, []);

  const handleExportSubtree = useCallback(
    (node: TreeNode) => {
      if (!tree) return;
      const payload = buildExport(tree, zipFileName, "tree", node);
      const filename = `${node.name}-subtree.json`;
      downloadJson(payload, filename);
    },
    [tree, zipFileName]
  );

  const handleRevealInTree = useCallback(
    (node: TreeNode) => {
      if (!tree) return;
      setSearchQuery("");
      setActiveFilter("all");
      const ancestors = getAncestorIds(tree, node.id);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        for (const id of ancestors) next.add(id);
        return next;
      });
      setSelectedId(node.id);
    },
    [tree]
  );

  const handleAddFavorite = useCallback(
    (node: TreeNode) => {
      setFavorites((prev) => {
        if (prev.find((f) => f.path === node.fullPath)) return prev;
        return [
          ...prev,
          {
            path: node.fullPath,
            name: node.name,
            type: node.type,
            addedAt: new Date().toISOString(),
          },
        ];
      });
    },
    []
  );

  const handleRemoveFavorite = useCallback((path: string) => {
    setFavorites((prev) => prev.filter((f) => f.path !== path));
  }, []);

  const handleFavoriteSelect = useCallback(
    (path: string) => {
      if (!tree) return;
      const node = findNodeByPath(tree, path);
      if (node) {
        const ancestors = getAncestorIds(tree, node.id);
        setExpandedIds((prev) => {
          const next = new Set(prev);
          for (const id of ancestors) next.add(id);
          next.add(node.id);
          return next;
        });
        setSelectedId(node.id);
      }
    },
    [tree]
  );

  const handleRecentSelect = useCallback(
    (path: string) => {
      if (!tree) return;
      const node = findNodeByPath(tree, path);
      if (node) {
        const ancestors = getAncestorIds(tree, node.id);
        setExpandedIds((prev) => {
          const next = new Set(prev);
          for (const id of ancestors) next.add(id);
          return next;
        });
        setSelectedId(node.id);
      }
    },
    [tree]
  );

  const handleBreadcrumbNavigate = useCallback(
    (path: string) => {
      if (!tree) return;
      const node = findNodeByPath(tree, path);
      if (node) {
        setSelectedId(node.id);
        const ancestors = getAncestorIds(tree, node.id);
        setExpandedIds((prev) => {
          const next = new Set(prev);
          for (const id of ancestors) next.add(id);
          next.add(node.id);
          return next;
        });
      }
    },
    [tree]
  );

  // ── Editor handlers ──────────────────────────────────────────────

  const handleOpenInEditor = useCallback(
    async (filePath: string) => {
      const existing = editorTabs.find((t) => t.filePath === filePath);
      if (existing) {
        setActiveTabId(existing.id);
        setShowEditor(true);
        return;
      }

      try {
        const engine = getZipEngine();
        const content = await engine.getFileAsText(filePath);
        const fileName = filePath.split("/").pop() || filePath;
        const ext = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
        const tab: EditorTab = {
          id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          filePath,
          fileName,
          content,
          originalContent: content,
          language: getLanguageFromExtension(ext),
          isDirty: false,
        };
        setEditorTabs((prev) => [...prev, tab]);
        setActiveTabId(tab.id);
        setShowEditor(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to open file.");
      }
    },
    [editorTabs]
  );

  const handleTabChange = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const handleTabClose = useCallback(
    (id: string) => {
      setEditorTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        if (activeTabId === id) {
          setActiveTabId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
        }
        if (filtered.length === 0) setShowEditor(false);
        return filtered;
      });
    },
    [activeTabId]
  );

  const handleContentChange = useCallback((id: string, content: string) => {
    setEditorTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, content, isDirty: content !== t.originalContent } : t
      )
    );
  }, []);

  const handleSave = useCallback(
    (id: string) => {
      const tab = editorTabs.find((t) => t.id === id);
      if (!tab) return;
      try {
        const engine = getZipEngine();
        engine.updateFile(tab.filePath, tab.content);
        setEditorTabs((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, originalContent: t.content, isDirty: false } : t
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save file.");
      }
    },
    [editorTabs]
  );

  // ── Converter handlers ───────────────────────────────────────────

  const handleOpenConverter = useCallback(() => {
    setConverterOpen(true);
  }, []);

  const handleConversionComplete = useCallback(
    async (newPath: string) => {
      // Rebuild tree to show the new file
      try {
        const engine = getZipEngine();
        const result = await engine.rebuildTree();
        setTree(result.tree);
        setMetadata({
          zipFileName: zipFileName,
          totalFiles: result.totalFiles,
          totalFolders: result.totalFolders,
          totalSize: result.totalSize,
          totalCompressedSize: result.totalCompressedSize,
          entryCount: result.entryCount,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update tree after conversion.");
      }
    },
    [zipFileName]
  );

  // ── Divider drag ─────────────────────────────────────────────────

  const handleSidebarDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      sidebarResizeRef.current = { startX: e.clientX, startW: sidebarWidth };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth]
  );

  const handlePreviewDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      previewResizeRef.current = { startX: e.clientX, startW: previewWidth };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [previewWidth]
  );

  const isShowingSearch = searchResults !== null;
  const isFavorite = selectedNode ? favorites.some((f) => f.path === selectedNode.fullPath) : false;

  return (
    <div className="h-screen flex flex-col bg-[hsl(var(--mac-bg))] overflow-hidden relative">
      {/* Drag overlay */}
      {isDragOverWindow && tree && (
        <div className="absolute inset-0 z-40 bg-[hsl(var(--mac-selection)/0.08)] border-2 border-dashed border-[hsl(var(--mac-selection))] rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-[hsl(var(--mac-content))] rounded-xl px-8 py-6 shadow-lg text-center">
            <p className="text-sm font-medium text-[hsl(var(--mac-text-primary))]">
              Drop ZIP to replace current file
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        onFileSelect={handleFileSelect}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        onExport={handleExport}
        onExportManifest={handleExportManifest}
        onDownloadZip={handleDownloadZip}
        hasData={tree !== null}
        hasSelection={selectedNode !== null}
        hasDirtyTabs={hasDirtyTabs}
        entryCount={metadata?.entryCount ?? 0}
        totalSize={metadata?.totalSize ?? 0}
        isLoading={isLoading}
        loadingProgress={loadingProgress}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((p) => !p)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((p) => !p)}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((p) => !p)}
        zipFileName={zipFileName}
        parseMode={parseMode}
        onParseModeChange={setParseMode}
      />

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-[hsl(0,60%,50%,0.1)] border-b border-[hsl(0,60%,50%,0.2)]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[hsl(0,60%,50%)]">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-[hsl(0,60%,50%)] hover:underline mac-focus-ring rounded"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <>
            <div style={{ width: sidebarWidth }} className="flex-shrink-0">
              <Sidebar
                zipFileName={tree ? zipFileName : null}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                fileCounts={fileCounts}
                isOpen={sidebarOpen}
                favorites={favorites}
                recentPaths={recentPaths}
                onFavoriteSelect={handleFavoriteSelect}
                onRemoveFavorite={handleRemoveFavorite}
                onRecentSelect={handleRecentSelect}
              />
            </div>
            {/* Draggable divider */}
            <div
              className="w-1 flex-shrink-0 cursor-col-resize hover:bg-[hsl(var(--mac-selection)/0.3)] mac-transition relative group"
              onMouseDown={handleSidebarDividerMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>
          </>
        )}

        {/* Center: tree / drop zone / editor */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Breadcrumbs */}
          {tree && selectedNode && !isShowingSearch && !showEditor && (
            <Breadcrumbs
              path={selectedNode.fullPath}
              rootName={tree.name}
              onNavigate={handleBreadcrumbNavigate}
            />
          )}

          {/* Editor or tree view */}
          {showEditor && editorTabs.length > 0 ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.3)]">
                <span className="text-[10px] font-medium text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider">
                  Editor
                </span>
                <button
                  onClick={() => setShowEditor(false)}
                  className="text-[10px] px-2 py-0.5 rounded mac-transition mac-focus-ring text-[hsl(var(--mac-selection))] hover:bg-[hsl(var(--mac-selection)/0.1)]"
                >
                  Back to Tree
                </button>
              </div>
              <CodeEditor
                tabs={editorTabs}
                activeTabId={activeTabId}
                onTabChange={handleTabChange}
                onTabClose={handleTabClose}
                onContentChange={handleContentChange}
                onSave={handleSave}
              />
            </div>
          ) : !tree && !isLoading ? (
            <DropZone onFileSelect={handleFileSelect} isLoading={isLoading} />
          ) : isLoading && !tree ? (
            <DropZone onFileSelect={handleFileSelect} isLoading={isLoading} />
          ) : tree ? (
            isShowingSearch ? (
              <SearchResults
                results={searchResults}
                query={searchQuery}
                selectedId={selectedId}
                onSelect={handleSelect}
                onContextMenu={handleContextMenu}
              />
            ) : (
              <TreeView
                root={tree}
                expandedIds={expandedIds}
                selectedId={selectedId}
                onToggle={handleToggle}
                onSelect={handleSelect}
                searchQuery={searchQuery}
                onContextMenu={handleContextMenu}
              />
            )
          ) : null}
        </div>

        {/* Preview panel (Quick Look) */}
        {previewOpen && tree && (
          <>
            <div
              className="w-1 flex-shrink-0 cursor-col-resize hover:bg-[hsl(var(--mac-selection)/0.3)] mac-transition relative group"
              onMouseDown={handlePreviewDividerMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>
            <div
              style={{ width: previewWidth }}
              className="flex-shrink-0 mac-inspector flex flex-col h-full overflow-hidden"
            >
              <div className="px-3 py-1.5 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-hover)/0.3)]">
                <span className="text-[10px] font-medium text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider">
                  Quick Look
                </span>
              </div>
              <QuickLook
                node={selectedNode}
                mode={previewMode}
                onModeChange={setPreviewMode}
                onOpenInEditor={handleOpenInEditor}
              />
            </div>
          </>
        )}

        {/* Inspector panel */}
        <Inspector node={selectedNode} isOpen={inspectorOpen && tree !== null} />

        {/* Converter panel */}
        {converterOpen && tree && (
          <ConverterPanel
            node={selectedNode}
            isOpen={converterOpen}
            onClose={() => setConverterOpen(false)}
            onConversionComplete={handleConversionComplete}
          />
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onCopyPath={handleCopyPath}
          onExportSubtree={handleExportSubtree}
          onRevealInTree={handleRevealInTree}
          onAddFavorite={handleAddFavorite}
          onOpenInEditor={
            contextMenu.node.type === "file" &&
            TEXT_EXTENSIONS.has(contextMenu.node.extension)
              ? handleOpenInEditor
              : undefined
          }
          onOpenConverter={handleOpenConverter}
          hasConversions={
            contextMenu.node.type === "file" &&
            getAvailableConversions(contextMenu.node.extension).length > 0
          }
          isFavorite={favorites.some((f) => f.path === contextMenu.node.fullPath)}
          onRemoveFavorite={handleRemoveFavorite}
        />
      )}
    </div>
  );
}
