/**
 * macOS-inspired icons using Lucide React (MIT license).
 * Maps file extensions to appropriate icons for a Finder-like experience.
 */
import {
  Folder, FolderOpen, File, FileText, FileCode2, FileImage,
  FileJson, FileArchive, FileSpreadsheet, FileVideo, FileAudio,
  FileType2, FileCog, FileKey, ChevronRight, ChevronDown,
  Search, Download, Upload, FolderTree, Filter, SidebarClose,
  SidebarOpen, Info, Copy, ListTree, List, X, HardDrive, Code2,
  Image as ImageIcon, FileStack, Sun, Moon, Monitor, Star,
  StarOff, Clock, Eye, Pencil, Plus, FolderPlus, FilePlus,
  Trash2, GripVertical, ArrowDownToLine, FileBarChart,
  type LucideProps,
} from "lucide-react";
import type { TreeNode } from "@/lib/types";

const IMAGE_EXTS = new Set(["png","jpg","jpeg","gif","svg","webp","ico","bmp","tiff","avif"]);
const CODE_EXTS = new Set(["js","jsx","ts","tsx","py","rb","go","rs","java","c","cpp","h","hpp","cs","swift","kt","sh","bash","html","css","scss","less","vue","svelte","astro","php","lua","r","zig","dart","sql","graphql","proto"]);
const DOC_EXTS = new Set(["md","txt","pdf","doc","docx","rtf","odt","tex","log","readme"]);
const DATA_EXTS = new Set(["json","yaml","yml","xml","toml","ini","cfg","csv"]);
const SPREADSHEET_EXTS = new Set(["xls","xlsx","csv"]);
const VIDEO_EXTS = new Set(["mp4","mov","avi","mkv","webm","flv"]);
const AUDIO_EXTS = new Set(["mp3","wav","ogg","flac","aac","m4a"]);
const ARCHIVE_EXTS = new Set(["zip","tar","gz","bz2","xz","7z","rar"]);
const CONFIG_EXTS = new Set(["config","env","lock","editorconfig"]);
const FONT_EXTS = new Set(["ttf","otf","woff","woff2","eot"]);
const KEY_EXTS = new Set(["pem","key","cert","crt","p12"]);

export function getFileIcon(node: TreeNode, isExpanded?: boolean): React.ComponentType<LucideProps> {
  if (node.type === "folder") return isExpanded ? FolderOpen : Folder;
  const ext = node.type === "file" ? node.extension : "";
  const name = node.name.toLowerCase();
  if (name === "package.json" || name === "tsconfig.json" || name === "composer.json") return FileJson;
  if (name === "dockerfile" || name === "makefile" || name === ".gitignore") return FileCog;
  if (name === "license" || name === "licence") return FileText;
  if (IMAGE_EXTS.has(ext)) return FileImage;
  if (CODE_EXTS.has(ext)) return FileCode2;
  if (DOC_EXTS.has(ext)) return FileText;
  if (DATA_EXTS.has(ext)) return FileJson;
  if (SPREADSHEET_EXTS.has(ext)) return FileSpreadsheet;
  if (VIDEO_EXTS.has(ext)) return FileVideo;
  if (AUDIO_EXTS.has(ext)) return FileAudio;
  if (ARCHIVE_EXTS.has(ext)) return FileArchive;
  if (CONFIG_EXTS.has(ext)) return FileCog;
  if (FONT_EXTS.has(ext)) return FileType2;
  if (KEY_EXTS.has(ext)) return FileKey;
  return File;
}

export {
  ChevronRight, ChevronDown, Search, Download, Upload, FolderTree,
  Filter, SidebarClose, SidebarOpen, Info, Copy, ListTree, List,
  X, HardDrive, Folder, FolderOpen, File, Code2, ImageIcon,
  FileStack, FileText, FileArchive, FileAudio, FileVideo, Sun,
  Moon, Monitor, Star, StarOff, Clock, Eye, Pencil, Plus,
  FolderPlus, FilePlus, Trash2, GripVertical, ArrowDownToLine,
  FileBarChart,
};
