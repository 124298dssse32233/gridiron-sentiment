/**
 * Error State Component
 *
 * Branded error UI for various error scenarios.
 * Can be used as full page or inline component.
 */

"use client";

import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
  code?: string | number;
  fullPage?: boolean;
  details?: string;
  actionLabel?: string;
  homeLink?: boolean;
  className?: string;
}

/**
 * Error State Component
 *
 * Displays a branded error message with optional retry and home link.
 */
export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  retry,
  code,
  fullPage = true,
  details,
  actionLabel = "Try again",
  homeLink = true,
  className,
}: ErrorStateProps) {
  const containerClasses = fullPage
    ? "min-h-screen flex items-center justify-center px-4"
    : "py-12 px-4";

  return (
    <div className={cn(containerClasses, className)}>
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-accent-negative/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-accent-negative" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="font-display text-2xl text-text-primary">
            {title}
          </h1>

          {code && (
            <p className="text-xs font-mono text-text-muted">
              Code: {code}
            </p>
          )}
        </div>

        {/* Message */}
        <p className="text-text-secondary">
          {message}
        </p>

        {/* Details (if provided) */}
        {details && (
          <div className="bg-accent-negative/5 border border-accent-negative/20 rounded-lg p-3">
            <p className="text-sm text-text-secondary font-mono break-words">
              {details}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          {retry && (
            <button
              onClick={retry}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-accent-teal text-bg-primary font-medium hover:bg-accent-teal/90 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {actionLabel}
            </button>
          )}

          {homeLink && (
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-bg-elevated bg-bg-card text-text-primary font-medium hover:bg-bg-elevated/50 transition-colors"
            >
              <Home className="w-4 h-4" />
              Go home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Not Found Error State
 *
 * Specialized error for 404 pages.
 */
export interface NotFoundErrorProps
  extends Omit<ErrorStateProps, "code" | "title" | "message"> {}

export function NotFoundError({
  retry,
  fullPage = true,
  homeLink = true,
  className,
  ...props
}: NotFoundErrorProps) {
  return (
    <ErrorState
      title="Page not found"
      message="The page you're looking for doesn't exist or has been moved."
      code="404"
      retry={retry}
      fullPage={fullPage}
      homeLink={homeLink}
      className={className}
      actionLabel="Go back"
      {...props}
    />
  );
}

/**
 * Network Error State
 *
 * Specialized error for network/server failures.
 */
export interface NetworkErrorProps
  extends Omit<ErrorStateProps, "code" | "title" | "message"> {}

export function NetworkError({
  retry,
  fullPage = true,
  homeLink = true,
  className,
  ...props
}: NetworkErrorProps) {
  return (
    <ErrorState
      title="Connection failed"
      message="We couldn't connect to the server. Please check your internet connection and try again."
      code="503"
      retry={retry}
      fullPage={fullPage}
      homeLink={homeLink}
      className={className}
      actionLabel="Retry"
      {...props}
    />
  );
}

/**
 * Inline Error Message
 *
 * Smaller error display for inline usage.
 */
export interface InlineErrorProps {
  message: string;
  icon?: React.ReactNode;
  className?: string;
}

export function InlineError({
  message,
  icon = <AlertTriangle className="w-4 h-4" />,
  className,
}: InlineErrorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md bg-accent-negative/10 border border-accent-negative/20 text-accent-negative text-sm",
        className
      )}
    >
      {icon}
      <p>{message}</p>
    </div>
  );
}

/**
 * Error Boundary Fallback
 *
 * For use with React Error Boundaries.
 */
export interface ErrorBoundaryFallbackProps {
  error: Error;
  reset: () => void;
  isDevelopment?: boolean;
}

export function ErrorBoundaryFallback({
  error,
  reset,
  isDevelopment = process.env.NODE_ENV === "development",
}: ErrorBoundaryFallbackProps) {
  return (
    <ErrorState
      title="Error rendering this page"
      message="Something went wrong while loading this content."
      retry={reset}
      details={isDevelopment ? error.message : undefined}
      fullPage={false}
      homeLink={false}
      actionLabel="Reload"
    />
  );
}
