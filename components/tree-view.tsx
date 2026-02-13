"use client";

import { useCallback, useRef, useEffect } from "react";
import type { TreeNode, FolderNode } from "@/lib/types";
import { getFileIcon, ChevronRight, ChevronDown } from "./mac-icons";

interface TreeViewProps {
  root: TreeNode;
  expandedIds: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (node: TreeNode) => void;
  searchQuery: string;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  expandedIds: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (node: TreeNode) => void;
  searchQuery: string;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  treeRef: React.RefObject<HTMLDivElement | null>;
}

function TreeItem({
  node,
  depth,
  expandedIds,
  selectedId,
  onToggle,
  onSelect,
  searchQuery,
  onContextMenu,
  treeRef,
}: TreeItemProps) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const Icon = getFileIcon(node, isExpanded);

  const handleClick = useCallback(() => {
    onSelect(node);
  }, [node, onSelect]);

  const handleDoubleClick = useCallback(() => {
    if (isFolder) {
      onToggle(node.id);
    }
  }, [isFolder, node.id, onToggle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          onSelect(node);
          if (isFolder) onToggle(node.id);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (isFolder && !isExpanded) onToggle(node.id);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (isFolder && isExpanded) onToggle(node.id);
          break;
      }
    },
    [isFolder, isExpanded, node, onSelect, onToggle]
  );

  const handleContextMenuEvent = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu(e, node);
    },
    [node, onContextMenu]
  );

  const iconColor = isFolder
    ? isSelected
      ? "text-[hsl(var(--mac-selection-text))]"
      : "text-[hsl(211,100%,50%)]"
    : isSelected
      ? "text-[hsl(var(--mac-selection-text)/0.8)]"
      : "text-[hsl(var(--mac-text-tertiary))]";

  return (
    <li role="treeitem" aria-expanded={isFolder ? isExpanded : undefined} aria-selected={isSelected}>
      <div
        className={`flex items-center gap-1 py-[3px] pr-2 rounded-md cursor-default mac-transition mac-focus-ring group ${
          isSelected
            ? "mac-selected"
            : "hover:bg-[hsl(var(--mac-hover))]"
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenuEvent}
        tabIndex={0}
        role="button"
        aria-label={`${node.type === "folder" ? "Folder" : "File"}: ${node.name}`}
      >
        {/* Disclosure triangle */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isFolder ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(node.id);
              }}
              className="mac-focus-ring rounded"
              tabIndex={-1}
              aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
            >
              {isExpanded ? (
                <ChevronDown className={`w-3 h-3 ${isSelected ? "text-[hsl(var(--mac-selection-text))]" : "text-[hsl(var(--mac-text-tertiary))]"}`} />
              ) : (
                <ChevronRight className={`w-3 h-3 ${isSelected ? "text-[hsl(var(--mac-selection-text))]" : "text-[hsl(var(--mac-text-tertiary))]"}`} />
              )}
            </button>
          ) : null}
        </span>

        {/* Icon */}
        <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />

        {/* Name */}
        <span
          className={`text-xs flex-1 truncate ${
            isSelected
              ? "text-[hsl(var(--mac-selection-text))]"
              : "text-[hsl(var(--mac-text-primary))]"
          }`}
        >
          {highlightMatch(node.name, searchQuery)}
        </span>

        {/* Size badge (folders show child count) */}
        <span
          className={`text-[10px] tabular-nums flex-shrink-0 ${
            isSelected
              ? "text-[hsl(var(--mac-selection-text)/0.6)]"
              : "text-[hsl(var(--mac-text-tertiary))] opacity-0 group-hover:opacity-100 mac-transition"
          }`}
        >
          {isFolder
            ? `${(node as FolderNode).children.length}`
            : formatBytes(node.size)}
        </span>
      </div>

      {/* Children */}
      {isFolder && isExpanded && (node as FolderNode).children.length > 0 && (
        <ul role="group">
          {(node as FolderNode).children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
              searchQuery={searchQuery}
              onContextMenu={onContextMenu}
              treeRef={treeRef}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TreeView({
  root,
  expandedIds,
  selectedId,
  onToggle,
  onSelect,
  searchQuery,
  onContextMenu,
}: TreeViewProps) {
  const treeRef = useRef<HTMLDivElement>(null);

  if (root.type !== "folder") return null;
  const folder = root as FolderNode;

  return (
    <div
      ref={treeRef}
      className="mac-content flex-1 overflow-auto mac-scrollbar p-2"
      role="tree"
      aria-label="File tree"
    >
      <ul role="group">
        {/* Root item */}
        <TreeItem
          node={root}
          depth={0}
          expandedIds={expandedIds}
          selectedId={selectedId}
          onToggle={onToggle}
          onSelect={onSelect}
          searchQuery={searchQuery}
          onContextMenu={onContextMenu}
          treeRef={treeRef}
        />
      </ul>
    </div>
  );
}
