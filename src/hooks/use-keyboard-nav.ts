"use client";

/**
 * Keyboard navigation hook for lists, tables, and other list-based UIs.
 *
 * Provides a "power user" experience with vim-style keybindings:
 * - j/k or arrow keys to navigate
 * - Enter/Space to select
 * - Escape to deselect
 * - / to search
 * - gg to go to start, G to go to end
 * - PageUp/PageDown for quick navigation
 *
 * Automatically scrolls focused items into view and provides accessibility
 * attributes (ARIA, tabIndex, etc.).
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Configuration options for keyboard navigation.
 */
export interface KeyboardNavOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Callback when Enter/Space is pressed on an item */
  onSelect?: (index: number) => void;
  /** Callback when right arrow or Enter is pressed */
  onExpand?: (index: number) => void;
  /** Callback when left arrow or Escape is pressed */
  onCollapse?: (index: number) => void;
  /** Callback when / key is pressed (focus search) */
  onSearch?: () => void;
  /** Enable vim-style j/k navigation (default: true) */
  vimMode?: boolean;
  /** Enable wrap-around from last to first (default: true) */
  wrap?: boolean;
  /** Items per page for PageUp/PageDown (default: 20) */
  pageSize?: number;
  /** Whether navigation is active (default: true) */
  enabled?: boolean;
  /** Container element to attach listeners to (default: document) */
  containerRef?: React.RefObject<HTMLElement>;
}

/**
 * Props to spread on individual list item elements.
 */
export interface ItemProps {
  "data-index": number;
  "aria-selected": boolean;
  tabIndex: number;
  role: string;
  onMouseEnter: () => void;
}

/**
 * Return value from useKeyboardNav hook.
 */
export interface KeyboardNavReturn {
  /** Currently focused item index (-1 if none) */
  activeIndex: number;
  /** Programmatically set the active index */
  setActiveIndex: (index: number) => void;
  /** Whether any item is currently focused */
  isNavigating: boolean;
  /** Props to spread on each list item for accessibility and interaction */
  getItemProps: (index: number) => ItemProps;
  /** Reset navigation state */
  reset: () => void;
}

/**
 * Keyboard shortcut configuration.
 */
export interface ShortcutConfig {
  /** Key combination (e.g., "ctrl+k", "shift+/", "escape") */
  key: string;
  /** Handler function to call when shortcut is pressed */
  handler: () => void;
  /** Human-readable description of the shortcut */
  description: string;
  /** Don't capture when typing in input/textarea/select (default: true) */
  ignoreInputs?: boolean;
}

/**
 * Hook for keyboard navigation in lists and tables.
 *
 * Manages focus state, provides ARIA attributes, and handles keyboard events.
 * Call getItemProps(index) on each list item to enable navigation.
 *
 * @param options - Keyboard navigation configuration
 * @returns Navigation state and prop getters
 *
 * @example
 * ```tsx
 * const { activeIndex, getItemProps } = useKeyboardNav({
 *   itemCount: teams.length,
 *   onSelect: (index) => router.push(`/team/${teams[index].slug}`),
 * });
 *
 * return (
 *   <ul>
 *     {teams.map((team, i) => (
 *       <li key={team.id} {...getItemProps(i)}>
 *         {team.name}
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useKeyboardNav(options: KeyboardNavOptions): KeyboardNavReturn {
  const {
    itemCount,
    onSelect,
    onExpand,
    onCollapse,
    onSearch,
    vimMode = true,
    wrap = true,
    pageSize = 20,
    enabled = true,
    containerRef,
  } = options;

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isNavigating, setIsNavigating] = useState(false);
  const ggTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ggPressedRef = useRef(false);

  /**
   * Move focus to a new index, with optional wrapping.
   */
  const moveToIndex = useCallback(
    (newIndex: number) => {
      let finalIndex = newIndex;

      // Handle wrapping
      if (wrap) {
        if (finalIndex < 0) {
          finalIndex = itemCount - 1;
        } else if (finalIndex >= itemCount) {
          finalIndex = 0;
        }
      } else {
        finalIndex = Math.max(0, Math.min(finalIndex, itemCount - 1));
      }

      setActiveIndex(finalIndex);
      setIsNavigating(true);

      // Scroll into view
      setTimeout(() => {
        const element = document.querySelector(
          `[data-index="${finalIndex}"]`
        );
        if (element instanceof HTMLElement) {
          element.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }, 0);
    },
    [itemCount, wrap]
  );

  /**
   * Handle keyboard events for navigation.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || itemCount === 0) return;

      // Don't capture keys when typing in input fields
      const target = event.target as HTMLElement;
      const isInputLike =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      let handled = false;

      switch (event.key) {
        // Navigation: down
        case "ArrowDown":
          if (!isInputLike) {
            event.preventDefault();
            moveToIndex(activeIndex + 1);
            handled = true;
          }
          break;

        // Navigation: up
        case "ArrowUp":
          if (!isInputLike) {
            event.preventDefault();
            moveToIndex(activeIndex - 1);
            handled = true;
          }
          break;

        // Vim-style navigation: down
        case "j":
          if (vimMode && !isInputLike) {
            event.preventDefault();
            moveToIndex(activeIndex + 1);
            handled = true;
          }
          break;

        // Vim-style navigation: up
        case "k":
          if (vimMode && !isInputLike) {
            event.preventDefault();
            moveToIndex(activeIndex - 1);
            handled = true;
          }
          break;

        // Select/expand: Enter
        case "Enter":
          if (activeIndex >= 0 && !isInputLike) {
            event.preventDefault();
            if (onExpand) {
              onExpand(activeIndex);
            } else if (onSelect) {
              onSelect(activeIndex);
            }
            handled = true;
          }
          break;

        // Select/expand: Space
        case " ":
          if (activeIndex >= 0 && !isInputLike) {
            event.preventDefault();
            if (onSelect) {
              onSelect(activeIndex);
            }
            handled = true;
          }
          break;

        // Collapse/deselect: Escape
        case "Escape":
          if (activeIndex >= 0) {
            event.preventDefault();
            if (onCollapse) {
              onCollapse(activeIndex);
            }
            setActiveIndex(-1);
            setIsNavigating(false);
            handled = true;
          }
          break;

        // Search: /
        case "/":
          if (!isInputLike) {
            event.preventDefault();
            if (onSearch) {
              onSearch();
            }
            handled = true;
          }
          break;

        // PageDown: jump by pageSize
        case "PageDown":
          if (!isInputLike) {
            event.preventDefault();
            moveToIndex(activeIndex + pageSize);
            handled = true;
          }
          break;

        // PageUp: jump by pageSize
        case "PageUp":
          if (!isInputLike) {
            event.preventDefault();
            moveToIndex(activeIndex - pageSize);
            handled = true;
          }
          break;

        // Home: go to first
        case "Home":
          if (!isInputLike) {
            event.preventDefault();
            moveToIndex(0);
            handled = true;
          }
          break;

        // End: go to last
        case "End":
          if (!isInputLike) {
            event.preventDefault();
            moveToIndex(itemCount - 1);
            handled = true;
          }
          break;

        // Vim-style: g (for gg combo)
        case "g":
          if (vimMode && !isInputLike) {
            event.preventDefault();

            // Check if g is pressed twice within 300ms
            if (ggPressedRef.current) {
              // gg pressed - go to first
              moveToIndex(0);
              ggPressedRef.current = false;
            } else {
              // First g
              ggPressedRef.current = true;

              // Clear previous timeout
              if (ggTimeoutRef.current) {
                clearTimeout(ggTimeoutRef.current);
              }

              // Reset flag after 300ms
              ggTimeoutRef.current = setTimeout(() => {
                ggPressedRef.current = false;
              }, 300);
            }
            handled = true;
          }
          break;

        // Vim-style: G (for go to last)
        case "G":
          if (vimMode && !isInputLike && event.shiftKey) {
            event.preventDefault();
            moveToIndex(itemCount - 1);
            handled = true;
          }
          break;

        default:
          break;
      }

      if (handled) {
        setIsNavigating(true);
      }
    },
    [
      enabled,
      itemCount,
      activeIndex,
      vimMode,
      moveToIndex,
      pageSize,
      onSelect,
      onExpand,
      onCollapse,
      onSearch,
    ]
  );

  /**
   * Attach keyboard event listeners.
   */
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef?.current || document;
    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (ggTimeoutRef.current) {
        clearTimeout(ggTimeoutRef.current);
      }
    };
  }, [enabled, handleKeyDown, containerRef]);

  /**
   * Get props to spread on a list item element.
   */
  const getItemProps = useCallback(
    (index: number): ItemProps => ({
      "data-index": index,
      "aria-selected": activeIndex === index,
      tabIndex: activeIndex === index ? 0 : -1,
      role: "option",
      onMouseEnter: () => {
        setActiveIndex(index);
        setIsNavigating(true);
      },
    }),
    [activeIndex]
  );

  /**
   * Reset navigation state.
   */
  const reset = useCallback(() => {
    setActiveIndex(-1);
    setIsNavigating(false);
    ggPressedRef.current = false;
    if (ggTimeoutRef.current) {
      clearTimeout(ggTimeoutRef.current);
    }
  }, []);

  return {
    activeIndex,
    setActiveIndex,
    isNavigating,
    getItemProps,
    reset,
  };
}

/**
 * General-purpose keyboard shortcuts hook.
 *
 * Registers keyboard shortcuts with a global listener.
 * Automatically skips capturing when typing in input fields (unless ignoreInputs is false).
 *
 * @param shortcuts - Array of shortcut configurations
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: "ctrl+k",
 *     handler: () => setSearchOpen(true),
 *     description: "Open search",
 *   },
 *   {
 *     key: "shift+?",
 *     handler: () => setHelpOpen(true),
 *     description: "Show help",
 *   },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputLike =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      shortcuts.forEach((shortcut) => {
        // Check if we should ignore this key when in input
        if (
          isInputLike &&
          (shortcut.ignoreInputs === undefined || shortcut.ignoreInputs)
        ) {
          return;
        }

        // Parse shortcut key combination
        const keys = shortcut.key.toLowerCase().split("+");
        const isCtrlDown =
          keys.includes("ctrl") && (event.ctrlKey || event.metaKey);
        const isShiftDown = keys.includes("shift") && event.shiftKey;
        const isAltDown = keys.includes("alt") && event.altKey;

        const mainKey = keys[keys.length - 1];
        const eventKey = event.key.toLowerCase();

        // Check if this shortcut matches
        const keyMatches = eventKey === mainKey;
        const ctrlMatch = keys.includes("ctrl") ? isCtrlDown : !event.ctrlKey;
        const shiftMatch = keys.includes("shift")
          ? isShiftDown
          : !event.shiftKey;
        const altMatch = keys.includes("alt") ? isAltDown : !event.altKey;

        if (keyMatches && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.handler();
        }
      });
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Centralized keyboard shortcut registry for the entire app.
 * Use this to get a list of all available shortcuts with descriptions.
 *
 * @returns Array of all registered shortcuts with metadata
 */
export const KEYBOARD_SHORTCUTS: ShortcutConfig[] = [
  {
    key: "ArrowDown",
    handler: () => {}, // Handled by useKeyboardNav
    description: "Move to next item",
    ignoreInputs: false,
  },
  {
    key: "ArrowUp",
    handler: () => {},
    description: "Move to previous item",
    ignoreInputs: false,
  },
  {
    key: "j",
    handler: () => {},
    description: "Move to next item (vim)",
    ignoreInputs: false,
  },
  {
    key: "k",
    handler: () => {},
    description: "Move to previous item (vim)",
    ignoreInputs: false,
  },
  {
    key: "Enter",
    handler: () => {},
    description: "Select or expand current item",
    ignoreInputs: false,
  },
  {
    key: " ",
    handler: () => {},
    description: "Select current item",
    ignoreInputs: false,
  },
  {
    key: "Escape",
    handler: () => {},
    description: "Collapse current item or deselect",
    ignoreInputs: false,
  },
  {
    key: "/",
    handler: () => {},
    description: "Focus search",
    ignoreInputs: false,
  },
  {
    key: "PageDown",
    handler: () => {},
    description: "Jump down by page",
    ignoreInputs: false,
  },
  {
    key: "PageUp",
    handler: () => {},
    description: "Jump up by page",
    ignoreInputs: false,
  },
  {
    key: "Home",
    handler: () => {},
    description: "Jump to first item",
    ignoreInputs: false,
  },
  {
    key: "End",
    handler: () => {},
    description: "Jump to last item",
    ignoreInputs: false,
  },
  {
    key: "g+g",
    handler: () => {},
    description: "Jump to first item (vim)",
    ignoreInputs: false,
  },
  {
    key: "shift+g",
    handler: () => {},
    description: "Jump to last item (vim)",
    ignoreInputs: false,
  },
];
