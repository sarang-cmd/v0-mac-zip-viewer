"use client";

import { ChevronRight } from "./mac-icons";

interface BreadcrumbsProps {
  path: string;
  rootName: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumbs({ path, rootName, onNavigate }: BreadcrumbsProps) {
  if (!path && !rootName) return null;

  const segments = path ? path.split("/") : [];
  const crumbs = [
    { label: rootName || "Root", path: "" },
    ...segments.map((seg, i) => ({
      label: seg,
      path: segments.slice(0, i + 1).join("/"),
    })),
  ];

  return (
    <nav
      className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[hsl(var(--mac-separator))] bg-[hsl(var(--mac-content))] overflow-x-auto"
      aria-label="Breadcrumb"
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.path} className="flex items-center gap-0.5 flex-shrink-0">
            {i > 0 && (
              <ChevronRight className="w-3 h-3 text-[hsl(var(--mac-text-tertiary))] flex-shrink-0" />
            )}
            {isLast ? (
              <span className="text-[11px] font-medium text-[hsl(var(--mac-text-primary))] px-1">
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(crumb.path)}
                className="text-[11px] text-[hsl(var(--mac-text-secondary))] hover:text-[hsl(var(--mac-selection))] px-1 rounded mac-focus-ring mac-transition"
              >
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
