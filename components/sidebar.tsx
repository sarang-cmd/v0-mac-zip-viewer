"use client";

import type { FilterType, FavoriteItem } from "@/lib/types";
import {
  HardDrive, Folder, File, ImageIcon, Code2, FileText,
  FileArchive, FolderTree, FileAudio, FileVideo, Star, StarOff, Clock,
} from "./mac-icons";
import type { LucideProps } from "lucide-react";

interface SidebarProps {
  zipFileName: string | null;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  fileCounts: Record<FilterType, number>;
  isOpen: boolean;
  favorites: FavoriteItem[];
  recentPaths: string[];
  onFavoriteSelect: (path: string) => void;
  onRemoveFavorite: (path: string) => void;
  onRecentSelect: (path: string) => void;
}

const FILTER_ITEMS: {
  key: FilterType;
  label: string;
  emoji: string;
  icon: React.ComponentType<LucideProps>;
}[] = [
  { key: "all", label: "All Items", emoji: "", icon: FolderTree },
  { key: "folders", label: "Folders", emoji: "", icon: Folder },
  { key: "files", label: "Files", emoji: "", icon: File },
  { key: "images", label: "Images", emoji: "", icon: ImageIcon },
  { key: "code", label: "Code", emoji: "", icon: Code2 },
  { key: "documents", label: "Documents", emoji: "", icon: FileText },
  { key: "audio", label: "Audio", emoji: "", icon: FileAudio },
  { key: "video", label: "Video", emoji: "", icon: FileVideo },
  { key: "archives", label: "Archives", emoji: "", icon: FileArchive },
];

export function Sidebar({
  zipFileName, activeFilter, onFilterChange, fileCounts, isOpen,
  favorites, recentPaths, onFavoriteSelect, onRemoveFavorite, onRecentSelect,
}: SidebarProps) {
  if (!isOpen) return null;

  return (
    <aside className="mac-sidebar mac-noise w-52 flex-shrink-0 flex flex-col h-full select-none overflow-hidden">
      <div className="flex-1 overflow-auto mac-scrollbar">
        {/* Locations */}
        {zipFileName && (
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--mac-text-tertiary))] mb-2">
              Locations
            </h3>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[hsl(var(--mac-selection)/0.12)]">
              <HardDrive className="w-4 h-4 text-[hsl(var(--mac-selection))] flex-shrink-0" />
              <span className="text-xs font-medium text-[hsl(var(--mac-text-primary))] truncate">
                {zipFileName}
              </span>
            </div>
          </div>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--mac-text-tertiary))] mb-2">
              Favorites
            </h3>
            {favorites.map((fav) => (
              <div
                key={fav.path}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[hsl(var(--mac-hover))] mac-transition cursor-default group mb-0.5"
              >
                <Star className="w-3.5 h-3.5 text-[hsl(48,100%,50%)] flex-shrink-0" />
                <button
                  onClick={() => onFavoriteSelect(fav.path)}
                  className="text-xs text-[hsl(var(--mac-text-secondary))] truncate flex-1 text-left mac-focus-ring rounded"
                >
                  {fav.name}
                </button>
                <button
                  onClick={() => onRemoveFavorite(fav.path)}
                  className="opacity-0 group-hover:opacity-100 mac-transition mac-focus-ring rounded"
                  aria-label={`Remove ${fav.name} from favorites`}
                >
                  <StarOff className="w-3 h-3 text-[hsl(var(--mac-text-tertiary))]" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Recents */}
        {recentPaths.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--mac-text-tertiary))] mb-2">
              Recents
            </h3>
            {recentPaths.slice(0, 5).map((path) => {
              const name = path.split("/").pop() || path;
              return (
                <button
                  key={path}
                  onClick={() => onRecentSelect(path)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[hsl(var(--mac-hover))] mac-transition text-left mb-0.5 mac-focus-ring"
                >
                  <Clock className="w-3.5 h-3.5 text-[hsl(var(--mac-text-tertiary))] flex-shrink-0" />
                  <span className="text-xs text-[hsl(var(--mac-text-secondary))] truncate">{name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="px-4 pt-3 pb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--mac-text-tertiary))] mb-2">
            Filters
          </h3>
          <nav role="list" aria-label="File type filters">
            {FILTER_ITEMS.map(({ key, label, icon: Icon }) => {
              const count = fileCounts[key] ?? 0;
              const isActive = activeFilter === key;
              return (
                <button
                  key={key}
                  role="listitem"
                  onClick={() => onFilterChange(key)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs mac-transition mac-focus-ring mb-0.5 ${
                    isActive
                      ? "mac-selected font-medium"
                      : "hover:bg-[hsl(var(--mac-hover))] text-[hsl(var(--mac-text-secondary))]"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive
                        ? "text-[hsl(var(--mac-selection-text))]"
                        : key === "folders" ? "text-[hsl(211,100%,50%)]" : ""
                    }`}
                  />
                  <span className="flex-1 text-left">{label}</span>
                  {zipFileName && (
                    <span
                      className={`text-[10px] tabular-nums ${
                        isActive ? "text-[hsl(var(--mac-selection-text)/0.7)]" : "text-[hsl(var(--mac-text-tertiary))]"
                      }`}
                    >
                      {count.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Privacy note */}
      {(favorites.length > 0 || recentPaths.length > 0) && (
        <div className="px-4 pb-3 pt-1 border-t border-[hsl(var(--mac-separator))]">
          <p className="text-[9px] text-[hsl(var(--mac-text-tertiary))] leading-relaxed">
            Favorites and recents are stored locally in your browser and never leave your device.
          </p>
        </div>
      )}

      {!zipFileName && (
        <div className="px-4 pb-4">
          <p className="text-[10px] text-[hsl(var(--mac-text-tertiary))] text-center leading-relaxed">
            Open a ZIP file to browse its contents
          </p>
        </div>
      )}
    </aside>
  );
}
