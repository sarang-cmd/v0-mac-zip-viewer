/**
 * Server-side ZIP parsing utilities.
 *
 * Uses `jszip` because it works entirely in-memory (no disk writes),
 * handles nested folders implied by paths, is well-maintained, and
 * runs on both Node.js and edge environments.
 */
import JSZip from "jszip";
import type { TreeNode, FolderNode, FileNode } from "./types";

// ── Security constants ───────────────────────────────────────────────

const MAX_ZIP_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_ENTRY_COUNT = 50_000;

// ── Path normalization ───────────────────────────────────────────────

export function normalizePath(rawPath: string): string {
  // Convert backslashes to forward slashes
  let p = rawPath.replace(/\\/g, "/");
  // Remove leading slashes
  p = p.replace(/^\/+/, "");
  // Collapse consecutive slashes
  p = p.replace(/\/+/g, "/");
  // Remove trailing slash (we detect folders differently)
  p = p.replace(/\/+$/, "");
  return p;
}

/** Guard against zip-slip / path traversal */
export function isSafePath(normalizedPath: string): boolean {
  const segments = normalizedPath.split("/");
  let depth = 0;
  for (const seg of segments) {
    if (seg === "..") depth--;
    else if (seg !== "." && seg !== "") depth++;
    if (depth < 0) return false;
  }
  return !normalizedPath.startsWith("/") && depth >= 0;
}

// ── Tree builder ─────────────────────────────────────────────────────

function getExtension(name: string): string {
  if (name.startsWith(".")) {
    // e.g. ".gitignore" -> "gitignore"
    const rest = name.slice(1);
    const idx = rest.lastIndexOf(".");
    return idx >= 0 ? rest.slice(idx + 1).toLowerCase() : rest.toLowerCase();
  }
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(idx + 1).toLowerCase() : "";
}

function makeId(path: string): string {
  return path || "root";
}

function createFolder(name: string, fullPath: string): FolderNode {
  return {
    id: makeId(fullPath),
    name,
    fullPath,
    type: "folder",
    size: 0,
    compressedSize: 0,
    lastModified: null,
    extension: "",
    children: [],
  };
}

function ensureFolderChain(
  root: FolderNode,
  segments: string[]
): FolderNode {
  let current = root;
  let pathSoFar = "";

  for (const seg of segments) {
    pathSoFar = pathSoFar ? `${pathSoFar}/${seg}` : seg;
    let child = current.children.find(
      (c) => c.type === "folder" && c.name === seg
    ) as FolderNode | undefined;

    if (!child) {
      child = createFolder(seg, pathSoFar);
      current.children.push(child);
    }
    current = child;
  }
  return current;
}

function sortChildren(node: TreeNode): void {
  if (node.type !== "folder") return;
  const folder = node as FolderNode;
  folder.children.sort((a, b) => {
    // Folders first
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  for (const child of folder.children) {
    sortChildren(child);
  }
}

function rollUpSizes(node: TreeNode): void {
  if (node.type !== "folder") return;
  const folder = node as FolderNode;
  let totalSize = 0;
  let totalCompressed = 0;
  let latestDate: string | null = null;

  for (const child of folder.children) {
    rollUpSizes(child);
    totalSize += child.size;
    totalCompressed += child.compressedSize;
    if (
      child.lastModified &&
      (!latestDate || child.lastModified > latestDate)
    ) {
      latestDate = child.lastModified;
    }
  }
  folder.size = totalSize;
  folder.compressedSize = totalCompressed;
  if (!folder.lastModified && latestDate) folder.lastModified = latestDate;
}

// ── Main parse function ──────────────────────────────────────────────

export interface ParseResult {
  tree: TreeNode;
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  totalCompressedSize: number;
  entryCount: number;
}

export async function parseZipBuffer(
  buffer: ArrayBuffer,
  fileName: string
): Promise<ParseResult> {
  if (buffer.byteLength > MAX_ZIP_SIZE) {
    throw new Error(
      `ZIP file exceeds the ${MAX_ZIP_SIZE / 1024 / 1024} MB size limit.`
    );
  }

  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files);

  if (entries.length > MAX_ENTRY_COUNT) {
    throw new Error(
      `ZIP contains ${entries.length} entries, exceeding the ${MAX_ENTRY_COUNT} limit.`
    );
  }

  // Root node represents the ZIP file itself
  const rootName = fileName.replace(/\.zip$/i, "");
  const root = createFolder(rootName, "");

  let totalFiles = 0;
  let totalFolders = 0;
  let totalSize = 0;
  let totalCompressedSize = 0;

  for (const entry of entries) {
    const normalized = normalizePath(entry.name);
    if (!normalized) continue; // skip root-only entries
    if (!isSafePath(normalized)) continue; // zip-slip protection

    const segments = normalized.split("/");
    const isDir = entry.dir;

    if (isDir) {
      ensureFolderChain(root, segments);
      totalFolders++;
    } else {
      const parentSegments = segments.slice(0, -1);
      const parent = parentSegments.length
        ? ensureFolderChain(root, parentSegments)
        : root;

      const name = segments[segments.length - 1];
      // Check for duplicates
      const exists = parent.children.find(
        (c) => c.name === name && c.type === "file"
      );
      if (exists) continue;

      const size = entry._data?.uncompressedSize ?? 0;
      const compressedSize = entry._data?.compressedSize ?? 0;
      const lastModified = entry.date ? entry.date.toISOString() : null;

      const fileNode: FileNode = {
        id: makeId(normalized),
        name,
        fullPath: normalized,
        type: "file",
        size,
        compressedSize,
        lastModified,
        extension: getExtension(name),
      };

      parent.children.push(fileNode);
      totalFiles++;
      totalSize += size;
      totalCompressedSize += compressedSize;
    }
  }

  // Count implicit folders that were created via ensureFolderChain
  function countFolders(node: TreeNode): number {
    if (node.type !== "folder") return 0;
    let c = 1; // count self
    for (const child of (node as FolderNode).children) {
      c += countFolders(child);
    }
    return c;
  }
  totalFolders = countFolders(root) - 1; // subtract root

  sortChildren(root);
  rollUpSizes(root);

  return {
    tree: root,
    totalFiles,
    totalFolders,
    totalSize,
    totalCompressedSize,
    entryCount: totalFiles + totalFolders,
  };
}
