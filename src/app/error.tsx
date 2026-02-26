/**
 * Global Error Boundary
 *
 * Catches errors in the root layout and renders a fallback UI.
 * Updated version with enhanced error state component.
 */

"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Application error:", error);
      if (error.digest) {
        console.error("Error ID:", error.digest);
      }
    }
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      message={
        error.message || "An unexpected error occurred while loading this page."
      }
      code={error.digest}
      details={
        process.env.NODE_ENV === "development" ? error.stack : undefined
      }
      retry={reset}
      fullPage={true}
      homeLink={true}
      actionLabel="Try again"
    />
  );
}
