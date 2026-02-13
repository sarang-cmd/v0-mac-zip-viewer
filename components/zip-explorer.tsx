"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  TreeNode,
  FolderNode,
  FilterType,
  ParseResponse,
} from "@/lib/types";
import { FILE_CATEGORIES } from "@/lib/types";
import { buildExport, downloadJson } from "@/lib/export-utils";
import { Toolbar } from "./toolbar";
import { Sidebar } from "./sidebar";
import { TreeView } from "./tree-view";
import { Inspector } from "./inspector";
import { Breadcrumbs } from "./breadcrumbs";
import { DropZone } from "./drop-zone";
import { ContextMenu } from "./context-menu";
import { SearchResults } from "./search-results";

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

// ── Main Component ───────────────────────────────────────────────────

export function ZipExplorer() {
  // Core state
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [zipFileName, setZipFileName] = useState<string>("");
  const [metadata, setMetadata] = useState<ParseResponse["metadata"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: TreeNode;
  } | null>(null);

  // Global drag-and-drop overlay
  const [isDragOverWindow, setIsDragOverWindow] = useState(false);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        setIsDragOverWindow(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragOverWindow(false);
      }
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
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
      all: 0,
      folders: 0,
      files: 0,
      images: 0,
      code: 0,
      documents: 0,
      archives: 0,
    };
    for (const node of allNodes) {
      if (node.id === tree?.id) continue; // skip root
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
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.fullPath.toLowerCase().includes(q)
      );
    }

    if (activeFilter !== "all") {
      results = results.filter((n) => matchesFilter(n, activeFilter));
    }

    return results;
  }, [allNodes, searchQuery, activeFilter, tree]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setTree(null);
    setSelectedId(null);
    setSearchQuery("");
    setActiveFilter("all");
    setExpandedIds(new Set());

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/zip/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to parse ZIP file.");
        return;
      }

      const response = data as ParseResponse;
      setTree(response.tree);
      setZipFileName(response.metadata.zipFileName);
      setMetadata(response.metadata);

      // Auto-expand root
      setExpandedIds(new Set([response.tree.id]));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const handleExportSelected = useCallback(
    (format: "tree" | "flat") => {
      if (!tree || !selectedNode) return;
      const payload = buildExport(tree, zipFileName, format, selectedNode);
      const filename = `${selectedNode.name}-${format}.json`;
      downloadJson(payload, filename);
    },
    [tree, zipFileName, selectedNode]
  );

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
      // Clear search to show tree
      setSearchQuery("");
      setActiveFilter("all");
      // Expand ancestors
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

  const handleBreadcrumbNavigate = useCallback(
    (path: string) => {
      if (!tree) return;
      const node = findNodeByPath(tree, path);
      if (node) {
        setSelectedId(node.id);
        // Expand ancestors
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

  const isShowingSearch = searchResults !== null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden relative">
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
        onExportSelected={handleExportSelected}
        hasData={tree !== null}
        hasSelection={selectedNode !== null}
        entryCount={metadata?.entryCount ?? 0}
        totalSize={metadata?.totalSize ?? 0}
        isLoading={isLoading}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((p) => !p)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((p) => !p)}
        zipFileName={zipFileName}
      />

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-[hsl(var(--destructive)/0.1)] border-b border-[hsl(var(--destructive)/0.2)]">
          <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          zipFileName={tree ? zipFileName : null}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          fileCounts={fileCounts}
          isOpen={sidebarOpen}
        />

        {/* Center: tree or drop zone */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Breadcrumbs */}
          {tree && selectedNode && !isShowingSearch && (
            <Breadcrumbs
              path={selectedNode.fullPath}
              rootName={tree.name}
              onNavigate={handleBreadcrumbNavigate}
            />
          )}

          {!tree && !isLoading ? (
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

        {/* Inspector panel */}
        <Inspector node={selectedNode} isOpen={inspectorOpen && tree !== null} />
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
        />
      )}
    </div>
  );
}
