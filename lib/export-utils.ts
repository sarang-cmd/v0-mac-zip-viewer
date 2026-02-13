import type {
  TreeNode,
  FolderNode,
  FlatEntry,
  TreeExport,
  FlatExport,
  ExportPayload,
} from "./types";
import { SCHEMA_VERSION } from "./types";

function flattenTree(
  node: TreeNode,
  depth: number,
  entries: FlatEntry[]
): void {
  entries.push({
    name: node.name,
    fullPath: node.fullPath,
    type: node.type,
    size: node.size,
    compressedSize: node.compressedSize,
    lastModified: node.lastModified,
    extension: node.type === "file" ? node.extension : "",
    depth,
  });
  if (node.type === "folder") {
    for (const child of (node as FolderNode).children) {
      flattenTree(child, depth + 1, entries);
    }
  }
}

function countNodes(node: TreeNode): { files: number; folders: number } {
  if (node.type === "file") return { files: 1, folders: 0 };
  let files = 0;
  let folders = 1;
  for (const child of (node as FolderNode).children) {
    const c = countNodes(child);
    files += c.files;
    folders += c.folders;
  }
  return { files, folders };
}

export function buildExport(
  root: TreeNode,
  zipFileName: string,
  format: "tree" | "flat",
  scope: TreeNode | null
): ExportPayload {
  const target = scope ?? root;
  const counts = countNodes(target);

  if (format === "flat") {
    const entries: FlatEntry[] = [];
    flattenTree(target, 0, entries);
    return {
      schemaVersion: SCHEMA_VERSION,
      format: "flat",
      generatedAt: new Date().toISOString(),
      zipFileName,
      totalFiles: counts.files,
      totalFolders: counts.folders - (target.type === "folder" ? 1 : 0),
      totalSize: target.size,
      entries,
    } satisfies FlatExport;
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    format: "tree",
    generatedAt: new Date().toISOString(),
    zipFileName,
    totalFiles: counts.files,
    totalFolders: counts.folders - (target.type === "folder" ? 1 : 0),
    totalSize: target.size,
    root: target,
  } satisfies TreeExport;
}

export function downloadJson(data: ExportPayload, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
