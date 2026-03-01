/**
 * Client-side ZIP engine: in-browser parsing, content extraction,
 * file mutation (create/rename/delete/move/update), and repack.
 * Uses JSZip entirely in-memory. No server upload needed.
 */
import JSZip from "jszip";
import type { TreeNode, FolderNode, FileNode } from "./types";

// ── Security ─────────────────────────────────────────────────────────

const MAX_ZIP_SIZE = 500 * 1024 * 1024;
const MAX_ENTRY_COUNT = 50_000;
const MAX_PREVIEW_SIZE = 10 * 1024 * 1024; // 10 MB per file for preview

function normalizePath(rawPath: string): string {
  let p = rawPath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/").replace(/\/+$/, "");
  return p;
}

function isSafePath(normalizedPath: string): boolean {
  const segments = normalizedPath.split("/");
  let depth = 0;
  for (const seg of segments) {
    if (seg === "..") depth--;
    else if (seg !== "." && seg !== "") depth++;
    if (depth < 0) return false;
  }
  return !normalizedPath.startsWith("/") && depth >= 0;
}

function getExtension(name: string): string {
  if (name.startsWith(".")) {
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

// ── Tree construction ────────────────────────────────────────────────

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

function ensureFolderChain(root: FolderNode, segments: string[]): FolderNode {
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
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  for (const child of folder.children) sortChildren(child);
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
    if (child.lastModified && (!latestDate || child.lastModified > latestDate)) {
      latestDate = child.lastModified;
    }
  }
  folder.size = totalSize;
  folder.compressedSize = totalCompressed;
  if (!folder.lastModified && latestDate) folder.lastModified = latestDate;
}

function countFolders(node: TreeNode): number {
  if (node.type !== "folder") return 0;
  let c = 1;
  for (const child of (node as FolderNode).children) c += countFolders(child);
  return c;
}

// ── Main class ───────────────────────────────────────────────────────

export interface ZipParseResult {
  tree: TreeNode;
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  totalCompressedSize: number;
  entryCount: number;
}

export class ZipEngine {
  private zip: JSZip | null = null;
  private fileName: string = "";

  async loadFromBuffer(buffer: ArrayBuffer, fileName: string, onProgress?: (pct: number) => void): Promise<ZipParseResult> {
    if (buffer.byteLength > MAX_ZIP_SIZE) {
      throw new Error(`ZIP file exceeds the ${MAX_ZIP_SIZE / 1024 / 1024} MB size limit.`);
    }

    onProgress?.(10);
    this.zip = await JSZip.loadAsync(buffer);
    this.fileName = fileName;
    onProgress?.(40);

    const entries = Object.values(this.zip.files);
    if (entries.length > MAX_ENTRY_COUNT) {
      throw new Error(`ZIP contains ${entries.length} entries, exceeding the ${MAX_ENTRY_COUNT} limit.`);
    }

    const rootName = fileName.replace(/\.zip$/i, "");
    const root = createFolder(rootName, "");
    let totalFiles = 0;
    let totalSize = 0;
    let totalCompressedSize = 0;

    for (const entry of entries) {
      const normalized = normalizePath(entry.name);
      if (!normalized || !isSafePath(normalized)) continue;
      const segments = normalized.split("/");

      if (entry.dir) {
        ensureFolderChain(root, segments);
      } else {
        const parentSegments = segments.slice(0, -1);
        const parent = parentSegments.length
          ? ensureFolderChain(root, parentSegments)
          : root;

        const name = segments[segments.length - 1];
        if (parent.children.find((c) => c.name === name && c.type === "file")) continue;

        const size = entry._data?.uncompressedSize ?? 0;
        const compressedSize = entry._data?.compressedSize ?? 0;
        const lastModified = entry.date ? entry.date.toISOString() : null;

        parent.children.push({
          id: makeId(normalized),
          name,
          fullPath: normalized,
          type: "file",
          size,
          compressedSize,
          lastModified,
          extension: getExtension(name),
        } as FileNode);

        totalFiles++;
        totalSize += size;
        totalCompressedSize += compressedSize;
      }
    }

    onProgress?.(80);
    const totalFolders = countFolders(root) - 1;
    sortChildren(root);
    rollUpSizes(root);
    onProgress?.(100);

    return {
      tree: root,
      totalFiles,
      totalFolders,
      totalSize,
      totalCompressedSize,
      entryCount: totalFiles + totalFolders,
    };
  }

  // ── File content extraction ──────────────────────────────────────

  async getFileAsText(path: string): Promise<string> {
    if (!this.zip) throw new Error("No ZIP loaded");
    const file = this.zip.file(path);
    if (!file) throw new Error(`File not found: ${path}`);
    const data = file._data;
    if (data && data.uncompressedSize > MAX_PREVIEW_SIZE) {
      throw new Error("File too large to preview");
    }
    return file.async("string");
  }

  async getFileAsArrayBuffer(path: string): Promise<ArrayBuffer> {
    if (!this.zip) throw new Error("No ZIP loaded");
    const file = this.zip.file(path);
    if (!file) throw new Error(`File not found: ${path}`);
    return file.async("arraybuffer");
  }

  async getFileAsBlob(path: string, mimeType?: string): Promise<Blob> {
    if (!this.zip) throw new Error("No ZIP loaded");
    const file = this.zip.file(path);
    if (!file) throw new Error(`File not found: ${path}`);
    const buf = await file.async("arraybuffer");
    return new Blob([buf], { type: mimeType || "application/octet-stream" });
  }

  async getFileAsDataUrl(path: string, mimeType: string): Promise<string> {
    const blob = await this.getFileAsBlob(path, mimeType);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async getHexPreview(path: string, maxBytes: number = 256): Promise<string> {
    if (!this.zip) throw new Error("No ZIP loaded");
    const file = this.zip.file(path);
    if (!file) throw new Error(`File not found: ${path}`);
    const buf = await file.async("arraybuffer");
    const bytes = new Uint8Array(buf.slice(0, maxBytes));
    const lines: string[] = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const hex = Array.from(bytes.slice(i, i + 16))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      const ascii = Array.from(bytes.slice(i, i + 16))
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
        .join("");
      lines.push(`${i.toString(16).padStart(8, "0")}  ${hex.padEnd(47)}  ${ascii}`);
    }
    return lines.join("\n");
  }

  // ── File mutations ───────────────────────────────────────────────

  updateFile(path: string, content: string | ArrayBuffer | Uint8Array): void {
    if (!this.zip) throw new Error("No ZIP loaded");
    this.zip.file(path, content);
  }

  createFile(path: string, content: string = ""): void {
    if (!this.zip) throw new Error("No ZIP loaded");
    if (!isSafePath(normalizePath(path))) throw new Error("Invalid path");
    this.zip.file(path, content);
  }

  createFolder(path: string): void {
    if (!this.zip) throw new Error("No ZIP loaded");
    if (!isSafePath(normalizePath(path))) throw new Error("Invalid path");
    this.zip.folder(path);
  }

  deleteEntry(path: string): void {
    if (!this.zip) throw new Error("No ZIP loaded");
    this.zip.remove(path);
  }

  renameEntry(oldPath: string, newPath: string): void {
    if (!this.zip) throw new Error("No ZIP loaded");
    if (!isSafePath(normalizePath(newPath))) throw new Error("Invalid new path");

    const file = this.zip.file(oldPath);
    if (file) {
      file.async("arraybuffer").then((buf) => {
        this.zip!.file(newPath, buf);
        this.zip!.remove(oldPath);
      });
      return;
    }

    // It's a folder - move all children
    const prefix = oldPath.endsWith("/") ? oldPath : oldPath + "/";
    const newPrefix = newPath.endsWith("/") ? newPath : newPath + "/";
    const filesToMove: { name: string; data: JSZip.JSZipObject }[] = [];

    this.zip.forEach((relativePath, zipEntry) => {
      if (relativePath.startsWith(prefix) || relativePath === oldPath) {
        filesToMove.push({ name: relativePath, data: zipEntry });
      }
    });

    for (const { name, data } of filesToMove) {
      const newName = newPrefix + name.slice(prefix.length);
      if (!data.dir) {
        data.async("arraybuffer").then((buf) => {
          this.zip!.file(newName, buf);
        });
      } else {
        this.zip.folder(newName);
      }
      this.zip.remove(name);
    }
  }

  // ── Rebuild tree from current ZIP state ──────────────────────────

  async rebuildTree(): Promise<ZipParseResult> {
    if (!this.zip) throw new Error("No ZIP loaded");
    const buf = await this.zip.generateAsync({ type: "arraybuffer" });
    return this.loadFromBuffer(buf, this.fileName);
  }

  // ── Repack / Download ────────────────────────────────────────────

  async generateZipBlob(onProgress?: (pct: number) => void): Promise<Blob> {
    if (!this.zip) throw new Error("No ZIP loaded");
    return this.zip.generateAsync(
      { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
      (meta) => onProgress?.(Math.round(meta.percent))
    );
  }

  async downloadZip(filename?: string): Promise<void> {
    const blob = await this.generateZipBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || this.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getFileName(): string {
    return this.fileName;
  }

  isLoaded(): boolean {
    return this.zip !== null;
  }
}

// Singleton for the app
let engineInstance: ZipEngine | null = null;

export function getZipEngine(): ZipEngine {
  if (!engineInstance) {
    engineInstance = new ZipEngine();
  }
  return engineInstance;
}

export function resetZipEngine(): ZipEngine {
  engineInstance = new ZipEngine();
  return engineInstance;
}
