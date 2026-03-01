"use client";

import { useEffect, useRef } from "react";
import type { TreeNode } from "@/lib/types";
import { Copy, Download, FolderTree, Pencil, RefreshCw, Star, StarOff } from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  node: TreeNode;
  onClose: () => void;
  onCopyPath: (path: string) => void;
  onExportSubtree: (node: TreeNode) => void;
  onRevealInTree: (node: TreeNode) => void;
  onAddFavorite?: (node: TreeNode) => void;
  onOpenInEditor?: (filePath: string) => void;
  onOpenConverter?: () => void;
  isFavorite?: boolean;
  onRemoveFavorite?: (path: string) => void;
  hasConversions?: boolean;
}

export function ContextMenu({
  x, y, node, onClose, onCopyPath, onExportSubtree, onRevealInTree,
  onAddFavorite, onOpenInEditor, onOpenConverter,
  isFavorite = false, onRemoveFavorite, hasConversions = false,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      if (x > maxX) menuRef.current.style.left = `${maxX}px`;
      if (y > maxY) menuRef.current.style.top = `${maxY}px`;
    }
  }, [x, y]);

  interface MenuItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
    separator?: boolean;
  }

  const items: MenuItem[] = [
    {
      label: "Copy Path",
      icon: Copy,
      action: () => { onCopyPath(node.fullPath); onClose(); },
    },
    {
      label: "Copy as POSIX Path",
      icon: Copy,
      action: () => { onCopyPath("/" + node.fullPath); onClose(); },
    },
  ];

  // Separator before actions
  if (onOpenInEditor && node.type === "file") {
    items.push({
      label: "Open in Editor",
      icon: Pencil,
      action: () => { onOpenInEditor(node.fullPath); onClose(); },
      separator: true,
    });
  }

  if (hasConversions && onOpenConverter && node.type === "file") {
    items.push({
      label: "Convert File...",
      icon: RefreshCw,
      action: () => { onOpenConverter(); onClose(); },
    });
  }

  items.push({
    label: "Export Subtree as JSON",
    icon: Download,
    action: () => { onExportSubtree(node); onClose(); },
    separator: !onOpenInEditor && !hasConversions,
  });

  items.push({
    label: "Reveal in Tree",
    icon: FolderTree,
    action: () => { onRevealInTree(node); onClose(); },
  });

  // Favorites
  if (isFavorite && onRemoveFavorite) {
    items.push({
      label: "Remove from Favorites",
      icon: StarOff,
      action: () => { onRemoveFavorite(node.fullPath); onClose(); },
      separator: true,
    });
  } else if (onAddFavorite) {
    items.push({
      label: "Add to Favorites",
      icon: Star,
      action: () => { onAddFavorite(node); onClose(); },
      separator: true,
    });
  }

  return (
    <div
      ref={menuRef}
      className="mac-context-menu fixed z-50 py-1 min-w-[200px]"
      style={{ left: x, top: y }}
      role="menu"
      aria-label="Context menu"
    >
      {items.map((item, idx) => (
        <div key={item.label}>
          {item.separator && idx > 0 && (
            <div className="my-1 border-t border-[hsl(var(--mac-separator))]" />
          )}
          <button
            onClick={item.action}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[hsl(var(--mac-text-primary))] hover:bg-[hsl(var(--mac-selection))] hover:text-[hsl(var(--mac-selection-text))] mac-transition mac-focus-ring rounded-sm mx-0.5"
            style={{ width: "calc(100% - 4px)" }}
            role="menuitem"
          >
            <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
