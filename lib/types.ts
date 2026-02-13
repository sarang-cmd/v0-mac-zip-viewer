// ── Schema & Data Model ──────────────────────────────────────────────

export const SCHEMA_VERSION = 1;

export type NodeType = "file" | "folder";

export interface TreeNodeBase {
  id: string;
  name: string;
  fullPath: string;
  type: NodeType;
  size: number; // uncompressed
  compressedSize: number;
  lastModified: string | null; // ISO string
}

export interface FileNode extends TreeNodeBase {
  type: "file";
  extension: string;
}

export interface FolderNode extends TreeNodeBase {
  type: "folder";
  children: TreeNode[];
  extension: "";
}

export type TreeNode = FileNode | FolderNode;

// ── Flat export entry ────────────────────────────────────────────────

export interface FlatEntry {
  name: string;
  fullPath: string;
  type: NodeType;
  size: number;
  compressedSize: number;
  lastModified: string | null;
  extension: string;
  depth: number;
}

// ── Export payloads ──────────────────────────────────────────────────

export interface TreeExport {
  schemaVersion: number;
  format: "tree";
  generatedAt: string;
  zipFileName: string;
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  root: TreeNode;
}

export interface FlatExport {
  schemaVersion: number;
  format: "flat";
  generatedAt: string;
  zipFileName: string;
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  entries: FlatEntry[];
}

export type ExportPayload = TreeExport | FlatExport;

// ── API responses ────────────────────────────────────────────────────

export interface ParseResponse {
  success: true;
  tree: TreeNode;
  metadata: {
    zipFileName: string;
    totalFiles: number;
    totalFolders: number;
    totalSize: number;
    totalCompressedSize: number;
    entryCount: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
}

// ── Filter types ─────────────────────────────────────────────────────

export type FilterType =
  | "all"
  | "folders"
  | "files"
  | "images"
  | "code"
  | "documents"
  | "archives";

export const FILE_CATEGORIES: Record<
  Exclude<FilterType, "all" | "folders" | "files">,
  string[]
> = {
  images: [
    "png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp", "tiff", "avif",
  ],
  code: [
    "js", "jsx", "ts", "tsx", "py", "rb", "go", "rs", "java", "c", "cpp",
    "h", "hpp", "cs", "swift", "kt", "scala", "sh", "bash", "zsh", "ps1",
    "html", "css", "scss", "less", "json", "yaml", "yml", "xml", "toml",
    "ini", "cfg", "sql", "graphql", "proto", "vue", "svelte", "astro",
    "php", "lua", "r", "m", "mm", "zig", "nim", "ex", "exs", "erl",
    "clj", "cljs", "hs", "ml", "fs", "dart",
  ],
  documents: [
    "md", "txt", "pdf", "doc", "docx", "rtf", "odt", "csv", "xls", "xlsx",
    "ppt", "pptx", "tex", "log", "readme",
  ],
  archives: ["zip", "tar", "gz", "bz2", "xz", "7z", "rar", "war", "jar"],
};
