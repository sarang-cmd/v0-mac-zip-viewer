"use client";

import type { FilterType } from "@/lib/types";
import {
  HardDrive,
  Folder,
  File,
  ImageIcon,
  Code2,
  FileText,
  FileArchive,
  FolderTree,
} from "./mac-icons";
import type { LucideProps } from "lucide-react";

interface SidebarProps {
  zipFileName: string | null;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  fileCounts: Record<FilterType, number>;
  isOpen: boolean;
}

const FILTER_ITEMS: {
  key: FilterType;
  label: string;
  icon: React.ComponentType<LucideProps>;
}[] = [
  { key: "all", label: "All Items", icon: FolderTree },
  { key: "folders", label: "Folders", icon: Folder },
  { key: "files", label: "Files", icon: File },
  { key: "images", label: "Images", icon: ImageIcon },
  { key: "code", label: "Code", icon: Code2 },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "archives", label: "Archives", icon: FileArchive },
];

export function Sidebar({
  zipFileName,
  activeFilter,
  onFilterChange,
  fileCounts,
  isOpen,
}: SidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="mac-sidebar w-52 flex-shrink-0 flex flex-col h-full select-none">
      {/* Locations section */}
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

      {/* Quick Filters */}
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
                      : key === "folders"
                        ? "text-[hsl(211,100%,50%)]"
                        : ""
                  }`}
                />
                <span className="flex-1 text-left">{label}</span>
                {zipFileName && (
                  <span
                    className={`text-[10px] tabular-nums ${
                      isActive
                        ? "text-[hsl(var(--mac-selection-text)/0.7)]"
                        : "text-[hsl(var(--mac-text-tertiary))]"
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

      {/* Bottom spacer */}
      <div className="flex-1" />

      {!zipFileName && (
        <div className="px-4 pb-4">
          <p className="text-[10px] text-[hsl(var(--mac-text-tertiary))] text-center leading-relaxed">
            Open a ZIP file to browse its contents
          </p>
        </div>
      )}
    </div>
  );
}
