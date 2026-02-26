"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface Column<T> {
  /** Unique identifier for the column */
  key: string;

  /** Display header text */
  header: string;

  /** Function to render cell content */
  render: (row: T, index: number) => React.ReactNode;

  /** CSS width (e.g., "120px", "15%") */
  width?: string;

  /** Text alignment */
  align?: "left" | "center" | "right";

  /** Can this column be sorted */
  sortable?: boolean;

  /** Display priority (1=always, 2=hide on tablet, 3=hide on mobile) */
  priority: number;

  /** Keep column visible on horizontal scroll */
  sticky?: boolean;
}

interface DataTableProps<T> {
  /** Array of data rows */
  data: T[];

  /** Column definitions */
  columns: Column<T>[];

  /** Extract unique key from row */
  keyExtractor: (row: T) => string;

  /** Row click handler */
  onRowClick?: (row: T) => void;

  /** Sort handler */
  onSort?: (key: string, direction: "asc" | "desc") => void;

  /** Current sort key */
  sortKey?: string;

  /** Current sort direction */
  sortDirection?: "asc" | "desc";

  /** Highlight row predicate */
  highlightRow?: (row: T) => boolean;

  /** Pin header to top */
  stickyHeader?: boolean;

  /** Alternate row background colors */
  striped?: boolean;

  /** Compact row padding */
  compact?: boolean;

  /** Show loading skeleton */
  loading?: boolean;

  /** Empty state message */
  emptyMessage?: string;

  /** Additional class for table wrapper */
  className?: string;

  /** Enable j/k keyboard navigation */
  enableKeyboardNav?: boolean;

  /** Keyboard selection handler */
  onKeyboardSelect?: (row: T) => void;

  /** Mobile card renderer (renders row as card below breakpoint) */
  mobileCardRenderer?: (row: T) => React.ReactNode;

  /** Mobile breakpoint in pixels (default 640) */
  mobileBreakpoint?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  onSort,
  sortKey,
  sortDirection = "asc",
  highlightRow,
  stickyHeader = true,
  striped = true,
  compact = false,
  loading = false,
  emptyMessage = "No data available",
  className = "",
  enableKeyboardNav = false,
  onKeyboardSelect,
  mobileCardRenderer,
  mobileBreakpoint = 640,
}: DataTableProps<T>): JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter columns by priority and screen size
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      if (isMobile && col.priority === 2) return false;
      if (isMobile && col.priority >= 3) return false;
      if (!isMobile && col.priority === 3) return false;
      return true;
    });
  }, [columns, isMobile]);

  // Track mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileBreakpoint]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNav) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, data.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        onKeyboardSelect?.(data[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboardNav, data, selectedIndex, onKeyboardSelect]);

  // Render loading skeleton
  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-bg-secondary rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  // Render empty state
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <p className="text-text-muted text-sm">{emptyMessage}</p>
      </div>
    );
  }

  // Mobile card mode
  if (isMobile && mobileCardRenderer) {
    return (
      <div className={`space-y-3 ${className}`}>
        {data.map((row, index) => (
          <div
            key={keyExtractor(row)}
            className="bg-bg-card rounded-lg border border-bg-elevated p-4 cursor-pointer transition hover:bg-bg-elevated"
            onClick={() => {
              setSelectedIndex(index);
              onRowClick?.(row);
            }}
          >
            {mobileCardRenderer(row)}
          </div>
        ))}
      </div>
    );
  }

  // Desktop table mode
  return (
    <div ref={containerRef} className={`overflow-x-auto rounded-lg border border-bg-elevated ${className}`}>
      <table
        ref={tableRef}
        className="w-full border-collapse text-sm"
        role="table"
        aria-label="Data table"
      >
        {/* Header */}
        <thead className={stickyHeader ? "sticky top-0 z-10" : ""}>
          <tr className="bg-bg-secondary border-b border-bg-elevated">
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                className={`
                  px-4 py-3
                  font-semibold text-xs uppercase text-text-muted
                  bg-bg-secondary
                  ${col.sticky ? "sticky left-0 z-20 bg-bg-secondary" : ""}
                  ${col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"}
                  ${col.width ? "" : "flex-1"}
                `}
                style={{ width: col.width }}
              >
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
                  if (col.sortable && onSort) {
                    const newDirection = sortKey === col.key && sortDirection === "asc" ? "desc" : "asc";
                    onSort(col.key, newDirection);
                  }
                }}>
                  <span>{col.header}</span>
                  {col.sortable && (
                    <div className="flex items-center">
                      {sortKey === col.key ? (
                        sortDirection === "asc" ? (
                          <ChevronUp size={14} className="text-accent-primary" />
                        ) : (
                          <ChevronDown size={14} className="text-accent-primary" />
                        )
                      ) : (
                        <div className="w-4 h-4 flex items-center justify-center opacity-40">
                          <div className="w-1 h-1 rounded-full bg-text-secondary" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {data.map((row, index) => {
            const isHighlighted = highlightRow?.(row) ?? false;
            const isSelected = enableKeyboardNav && selectedIndex === index;

            return (
              <tr
                key={keyExtractor(row)}
                className={`
                  border-b border-bg-elevated transition
                  ${striped && index % 2 === 1 ? "bg-bg-card" : ""}
                  ${isHighlighted ? "bg-bg-elevated border-l-4 border-l-accent-primary" : ""}
                  ${isSelected ? "bg-bg-elevated ring-2 ring-accent-primary ring-inset" : ""}
                  ${onRowClick ? "cursor-pointer hover:bg-bg-elevated" : ""}
                `}
                onClick={() => {
                  setSelectedIndex(index);
                  onRowClick?.(row);
                }}
                role="row"
              >
                {visibleColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`
                      px-4 py-3
                      text-text-primary
                      ${col.sticky ? "sticky left-0 z-10 bg-inherit" : ""}
                      ${col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"}
                    `}
                    style={{ width: col.width }}
                  >
                    <div className="truncate">
                      {col.render(row, index)}
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// EXPORT FOR CONVENIENCE
// =============================================================================

export type { Column, DataTableProps };
