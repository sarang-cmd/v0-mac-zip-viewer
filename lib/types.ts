// ── Schema & Data Model ──────────────────────────────────────────────

export const SCHEMA_VERSION = 1;

export type NodeType = "file" | "folder";

export interface TreeNodeBase {
  id: string;
  name: string;
  fullPath: string;
  type: NodeType;
  size: number;
  compressedSize: number;
  lastModified: string | null;
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

// ── Manifest export ──────────────────────────────────────────────────

export interface ManifestExport {
  schemaVersion: number;
  format: "manifest";
  generatedAt: string;
  zipFileName: string;
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  totalCompressedSize: number;
  extensionHistogram: Record<string, { count: number; totalSize: number }>;
  typeBreakdown: {
    images: number;
    code: number;
    documents: number;
    archives: number;
    audio: number;
    video: number;
    other: number;
  };
}

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
  | "archives"
  | "audio"
  | "video";

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
    "md", "txt", "pdf", "doc", "docx", "rtf", "odt", "tex", "log", "readme",
  ],
  archives: ["zip", "tar", "gz", "bz2", "xz", "7z", "rar", "war", "jar"],
  audio: ["mp3", "wav", "ogg", "flac", "aac", "m4a", "wma"],
  video: ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv"],
};

// ── Text file detection ──────────────────────────────────────────────

export const TEXT_EXTENSIONS = new Set([
  "txt", "md", "json", "js", "jsx", "ts", "tsx", "py", "rb", "go", "rs",
  "java", "c", "cpp", "h", "hpp", "cs", "swift", "kt", "scala", "sh",
  "bash", "zsh", "ps1", "html", "css", "scss", "less", "yaml", "yml",
  "xml", "toml", "ini", "cfg", "sql", "graphql", "proto", "vue", "svelte",
  "astro", "php", "lua", "r", "m", "mm", "zig", "nim", "ex", "exs",
  "erl", "clj", "cljs", "hs", "ml", "fs", "dart", "log", "env",
  "gitignore", "dockerignore", "editorconfig", "prettierrc", "eslintrc",
  "babelrc", "makefile", "cmake", "gradle", "pom", "csv", "tsv", "tex",
  "rtf", "readme", "license", "licence", "changelog", "todo",
]);

export const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif",
]);

export const AUDIO_EXTENSIONS = new Set([
  "mp3", "wav", "ogg", "flac", "aac", "m4a",
]);

export const VIDEO_EXTENSIONS = new Set([
  "mp4", "mov", "avi", "mkv", "webm", "flv",
]);

// ── Editor tab ───────────────────────────────────────────────────────

export interface EditorTab {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  originalContent: string;
  language: string;
  isDirty: boolean;
}

// ── Annotation types ─────────────────────────────────────────────────

export type AnnotationTool =
  | "pen"
  | "highlighter"
  | "eraser"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "text";

export interface AnnotationStroke {
  id: string;
  tool: AnnotationTool;
  points: { x: number; y: number }[];
  color: string;
  thickness: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  width?: number;
  height?: number;
}

// ── Preview mode ─────────────────────────────────────────────────────

export type PreviewMode = "preview" | "edit" | "annotate" | "split";

// ── Favorites ────────────────────────────────────────────────────────

export interface FavoriteItem {
  path: string;
  name: string;
  type: NodeType;
  addedAt: string;
}

// ── Language detection ───────────────────────────────────────────────

export function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    c: "c", cpp: "cpp", h: "c", hpp: "cpp", cs: "csharp",
    swift: "swift", kt: "kotlin", scala: "scala",
    sh: "shell", bash: "shell", zsh: "shell", ps1: "powershell",
    html: "html", css: "css", scss: "scss", less: "less",
    json: "json", yaml: "yaml", yml: "yaml", xml: "xml",
    toml: "toml", ini: "ini", cfg: "ini",
    sql: "sql", graphql: "graphql", proto: "protobuf",
    vue: "vue", svelte: "svelte", astro: "astro",
    php: "php", lua: "lua", r: "r", dart: "dart",
    md: "markdown", txt: "plaintext", log: "plaintext",
    csv: "plaintext", tsv: "plaintext", tex: "latex",
    makefile: "makefile", dockerfile: "dockerfile",
  };
  return map[ext.toLowerCase()] || "plaintext";
}
