/**
 * Matchup Machine Page Skeleton
 *
 * Matches the exact layout of the matchup machine page.
 * Includes team selectors, simulation area, and results.
 */

"use client";

import { Skeleton, SkeletonCircle, SkeletonChart, SkeletonStatBox } from "@/components/ui/skeleton";

const SHIMMER_STYLES = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      #1a1f2e 25%,
      #242937 50%,
      #1a1f2e 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes stagger {
    0% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }

  .skeleton-row {
    animation: stagger 0.8s ease-in-out infinite alternate;
  }
`;

/**
 * MatchupSkeleton Component
 *
 * Full matchup machine page skeleton.
 */
export function MatchupSkeleton() {
  return (
    <>
      <style>{SHIMMER_STYLES}</style>
      <div className="min-h-screen bg-bg-primary">
        {/* Header */}
        <section className="relative overflow-hidden border-b border-bg-elevated">
          <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 rounded-lg" />
              <Skeleton className="h-6 w-96 rounded" />
            </div>
          </div>
        </section>

        {/* Matchup Selector Section */}
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Team 1 Selector */}
            <div className="space-y-4">
              <Skeleton className="h-5 w-20 rounded" />

              <div className="bg-bg-card border border-bg-elevated rounded-lg p-6 space-y-4">
                {/* Search input */}
                <Skeleton className="h-10 w-full rounded-md" />

                {/* Team list items */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="skeleton-row flex items-center gap-3 p-3 rounded-md hover:bg-bg-elevated/50 cursor-pointer transition-colors"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                      }}
                    >
                      <SkeletonCircle size="sm" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-24 rounded" />
                        <Skeleton className="h-2 w-16 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Team Info */}
              <div className="bg-bg-card border border-bg-elevated rounded-lg p-4 space-y-3">
                <Skeleton className="h-5 w-32 rounded" />
                <SkeletonStatBox />
                <SkeletonStatBox />
              </div>
            </div>

            {/* VS Badge and Simulate Button */}
            <div className="flex flex-col justify-center items-center gap-6">
              {/* VS Circle */}
              <div className="hidden lg:flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full border-2 border-accent-teal/30 flex items-center justify-center">
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>

              {/* Simulate Button */}
              <Skeleton className="h-12 w-32 rounded-md lg:w-full" />

              {/* Odds Badge */}
              <div className="w-full bg-bg-card border border-bg-elevated rounded-lg p-4 space-y-2">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-6 w-32 rounded" />
              </div>
            </div>

            {/* Team 2 Selector */}
            <div className="space-y-4">
              <Skeleton className="h-5 w-20 rounded" />

              <div className="bg-bg-card border border-bg-elevated rounded-lg p-6 space-y-4">
                {/* Search input */}
                <Skeleton className="h-10 w-full rounded-md" />

                {/* Team list items */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="skeleton-row flex items-center gap-3 p-3 rounded-md hover:bg-bg-elevated/50 cursor-pointer transition-colors"
                      style={{
                        animationDelay: `${(i + 1) * 0.1}s`,
                      }}
                    >
                      <SkeletonCircle size="sm" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-24 rounded" />
                        <Skeleton className="h-2 w-16 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Team Info */}
              <div className="bg-bg-card border border-bg-elevated rounded-lg p-4 space-y-3">
                <Skeleton className="h-5 w-32 rounded" />
                <SkeletonStatBox />
                <SkeletonStatBox />
              </div>
            </div>
          </div>
        </section>

        {/* Results Section (appears after simulation) */}
        <section className="max-w-7xl mx-auto px-4 py-12 border-t border-bg-elevated">
          <div className="space-y-8">
            {/* Win Probability */}
            <div className="bg-bg-card border border-bg-elevated rounded-lg p-6">
              <Skeleton className="h-6 w-40 mb-6 rounded" />

              <div className="space-y-4">
                {/* Team 1 Win % */}
                <div className="space-y-2">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-12 rounded" />
                  </div>
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>

                {/* Team 2 Win % */}
                <div className="space-y-2">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-12 rounded" />
                  </div>
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>
              </div>
            </div>

            {/* Score Distribution */}
            <div className="bg-bg-card border border-bg-elevated rounded-lg p-6">
              <Skeleton className="h-6 w-56 mb-6 rounded" />
              <SkeletonChart height="h-64" />
            </div>

            {/* Narrative Analysis */}
            <div className="bg-bg-card border border-bg-elevated rounded-lg p-6 space-y-4">
              <Skeleton className="h-6 w-40 rounded" />

              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-bg-elevated/50">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              </div>
            </div>

            {/* Key Matchups */}
            <div className="bg-bg-card border border-bg-elevated rounded-lg p-6">
              <Skeleton className="h-6 w-40 mb-6 rounded" />

              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="skeleton-row pb-4 border-b border-bg-elevated/50 last:border-b-0 last:pb-0"
                    style={{
                      animationDelay: `${i * 0.15}s`,
                    }}
                  >
                    <Skeleton className="h-4 w-48 mb-2 rounded" />
                    <div className="flex gap-4">
                      <Skeleton className="h-3 w-24 rounded flex-1" />
                      <Skeleton className="h-3 w-24 rounded flex-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/**
 * Matchup Selector Skeleton
 *
 * Just the team selector component.
 */
export function MatchupSelectorSkeleton() {
  return (
    <>
      <style>{SHIMMER_STYLES}</style>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team 1 */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>

        {/* VS */}
        <div className="flex items-center justify-center">
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>

        {/* Team 2 */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    </>
  );
}

/**
 * Simulation Results Skeleton
 *
 * Just the results area after simulation.
 */
export function MatchupResultsSkeleton() {
  return (
    <>
      <style>{SHIMMER_STYLES}</style>
      <div className="space-y-6">
        {/* Win Probability */}
        <div className="bg-bg-card border border-bg-elevated rounded-lg p-6">
          <Skeleton className="h-6 w-40 mb-4 rounded" />
          <Skeleton className="h-24 w-full rounded" />
        </div>

        {/* Score Distribution */}
        <div className="bg-bg-card border border-bg-elevated rounded-lg p-6">
          <Skeleton className="h-6 w-48 mb-4 rounded" />
          <SkeletonChart height="h-48" />
        </div>

        {/* Narrative */}
        <div className="bg-bg-card border border-bg-elevated rounded-lg p-6">
          <Skeleton className="h-6 w-32 mb-4 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
        </div>
      </div>
    </>
  );
}
