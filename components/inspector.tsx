"use client";

import type { TreeNode, FolderNode } from "@/lib/types";
import { getFileIcon } from "./mac-icons";

interface InspectorProps {
  node: TreeNode | null;
  isOpen: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[hsl(var(--mac-separator)/0.5)] last:border-b-0">
      <span className="text-[10px] font-medium text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wider w-20 flex-shrink-0 pt-px">
        {label}
      </span>
      <span className="text-xs text-[hsl(var(--mac-text-primary))] break-all flex-1">
        {value}
      </span>
    </div>
  );
}

export function Inspector({ node, isOpen }: InspectorProps) {
  if (!isOpen) return null;

  return (
    <div className="mac-inspector w-60 flex-shrink-0 flex flex-col h-full overflow-hidden">
      {!node ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-[hsl(var(--mac-text-tertiary))] text-center leading-relaxed">
            Select a file or folder to view its details
          </p>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-auto mac-scrollbar">
          {/* Icon + Name header */}
          <div className="flex flex-col items-center gap-2 px-4 py-6 border-b border-[hsl(var(--mac-separator))]">
            {(() => {
              const Icon = getFileIcon(node, false);
              return (
                <Icon
                  className={`w-12 h-12 ${
                    node.type === "folder"
                      ? "text-[hsl(211,100%,50%)]"
                      : "text-[hsl(var(--mac-text-tertiary))]"
                  }`}
                />
              );
            })()}
            <h3 className="text-sm font-semibold text-[hsl(var(--mac-text-primary))] text-center break-all text-balance">
              {node.name}
            </h3>
            <span className="text-[10px] text-[hsl(var(--mac-text-tertiary))] uppercase tracking-wide">
              {node.type === "folder" ? "Folder" : node.extension.toUpperCase() || "File"}
            </span>
          </div>

          {/* Metadata */}
          <div className="px-4 py-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--mac-text-tertiary))] mb-2">
              Information
            </h4>
            <InfoRow label="Kind" value={node.type === "folder" ? "Folder" : `${node.extension.toUpperCase() || "Unknown"} File`} />
            <InfoRow label="Path" value={node.fullPath || "/"} />
            <InfoRow label="Size" value={formatBytes(node.size)} />
            {node.compressedSize > 0 && (
              <InfoRow label="Compressed" value={formatBytes(node.compressedSize)} />
            )}
            {node.compressedSize > 0 && node.size > 0 && (
              <InfoRow
                label="Ratio"
                value={`${((1 - node.compressedSize / node.size) * 100).toFixed(1)}%`}
              />
            )}
            <InfoRow label="Modified" value={formatDate(node.lastModified)} />
            {node.type === "folder" && (
              <InfoRow
                label="Contents"
                value={`${(node as FolderNode).children.length} item${(node as FolderNode).children.length !== 1 ? "s" : ""}`}
              />
            )}
            {node.type === "file" && node.extension && (
              <InfoRow label="Extension" value={`.${node.extension}`} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
