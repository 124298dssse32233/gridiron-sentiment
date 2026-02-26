"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

// =============================================================================
// TYPES
// =============================================================================

interface TooltipProps {
  /** Content to display in tooltip */
  content: React.ReactNode;

  /** Trigger element (must be a single element) */
  children: React.ReactElement;

  /** Position relative to trigger */
  position?: "top" | "bottom" | "left" | "right";

  /** Delay before showing (ms) */
  delay?: number;

  /** Additional CSS class */
  className?: string;
}

interface StatTooltipProps {
  /** Stat name (bold header) */
  stat: string;

  /** Explanation text */
  explanation: string;

  /** Optional formula in monospace */
  formula?: string;

  /** Trigger element */
  children: React.ReactElement;
}

interface InfoTipProps {
  /** Content text */
  content: string;

  /** Icon size in pixels */
  size?: number;
}

// =============================================================================
// TOOLTIP COMPONENT
// =============================================================================

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
  className = "",
}: TooltipProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const delayTimerRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    delayTimerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    setIsVisible(false);
  };

  // Calculate position based on trigger element and preference
  useEffect(() => {
    if (!isVisible || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const padding = 8;

    let x = 0;
    let y = 0;

    switch (position) {
      case "top":
        x = rect.left + rect.width / 2;
        y = rect.top - padding;
        break;
      case "bottom":
        x = rect.left + rect.width / 2;
        y = rect.bottom + padding;
        break;
      case "left":
        x = rect.left - padding;
        y = rect.top + rect.height / 2;
        break;
      case "right":
        x = rect.right + padding;
        y = rect.top + rect.height / 2;
        break;
    }

    // Clamp to viewport bounds
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? 280;
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 100;
    const maxX = window.innerWidth - tooltipWidth - 12;
    const maxY = window.innerHeight - tooltipHeight - 12;

    x = Math.max(12, Math.min(x, maxX));
    y = Math.max(12, Math.min(y, maxY));

    setCoords({ x, y });
  }, [isVisible, position]);

  // Dismiss on scroll
  useEffect(() => {
    const handleScroll = () => setIsVisible(false);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex"
      >
        {React.cloneElement(children, {
          className: `${children.props.className ?? ""} cursor-help`,
        })}
      </div>

      {isVisible &&
        coords &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`
              fixed pointer-events-none
              bg-bg-elevated border border-bg-secondary rounded-lg px-3 py-2
              text-text-primary text-sm max-w-xs z-50
              shadow-lg
              animate-in fade-in duration-150
              ${className}
            `}
            style={{
              left: `${coords.x}px`,
              top: `${coords.y}px`,
              transform:
                position === "top"
                  ? "translate(-50%, -100%)"
                  : position === "bottom"
                    ? "translate(-50%, 0)"
                    : position === "left"
                      ? "translate(-100%, -50%)"
                      : "translate(0, -50%)",
            }}
          >
            {/* Arrow */}
            <div
              className="absolute w-2 h-2 bg-bg-elevated border border-bg-secondary rotate-45"
              style={{
                left:
                  position === "left"
                    ? "100%"
                    : position === "right"
                      ? "-5px"
                      : "50%",
                top:
                  position === "top"
                    ? "100%"
                    : position === "bottom"
                      ? "-5px"
                      : "50%",
                transform:
                  position === "top"
                    ? "translate(-50%, -50%)"
                    : position === "bottom"
                      ? "translate(-50%, -50%)"
                      : position === "left"
                        ? "translate(-50%, -50%)"
                        : "translate(-50%, -50%)",
              }}
            />

            <div className="relative z-10">{content}</div>
          </div>,
          document.body
        )}
    </>
  );
}

// =============================================================================
// STAT TOOLTIP COMPONENT
// =============================================================================

export function StatTooltip({
  stat,
  explanation,
  formula,
  children,
}: StatTooltipProps): JSX.Element {
  const content = (
    <div className="space-y-2">
      <div className="font-semibold text-accent-primary">{stat}</div>
      <p className="text-text-secondary text-xs leading-relaxed">{explanation}</p>
      {formula && (
        <div className="mt-2 pt-2 border-t border-bg-secondary">
          <p className="text-xs text-text-muted mb-1">Formula:</p>
          <code className="block bg-bg-primary rounded px-2 py-1 text-xs text-accent-primary font-mono whitespace-pre-wrap break-words">
            {formula}
          </code>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={content} position="top">
      {children}
    </Tooltip>
  );
}

// =============================================================================
// INFO TIP COMPONENT (Icon + Tooltip)
// =============================================================================

export function InfoTip({ content, size = 14 }: InfoTipProps): JSX.Element {
  return (
    <Tooltip content={content} position="top" delay={200}>
      <div
        className="inline-flex items-center justify-center rounded-full bg-bg-secondary text-text-muted hover:text-accent-primary transition flex-shrink-0"
        style={{ width: size, height: size }}
      >
        {/* SVG info icon */}
        <svg
          width={size - 4}
          height={size - 4}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="8" cy="8" r="7" />
          <line x1="8" y1="5" x2="8" y2="8" />
          <line x1="8" y1="10" x2="8.01" y2="10" />
        </svg>
      </div>
    </Tooltip>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { TooltipProps, StatTooltipProps, InfoTipProps };
