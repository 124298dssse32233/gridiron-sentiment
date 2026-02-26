"use client";

import { useEffect } from "react";
import { AlertCircle, Home, Sword } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Rivalry page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-accent-negative/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-accent-negative" />
          </div>
        </div>

        <h1 className="font-display text-2xl text-text-primary">
          Rivalry not found
        </h1>

        <p className="text-text-secondary">
          {error.message || "We couldn't load the rivalry you're looking for."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-md bg-accent-teal text-bg-primary font-medium hover:bg-accent-teal/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/rivalries"
            className="px-4 py-2 rounded-md border border-bg-elevated bg-bg-card text-text-primary font-medium hover:bg-bg-elevated/50 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Sword className="w-4 h-4" />
            View all rivalries
          </Link>
        </div>
      </div>
    </div>
  );
}
