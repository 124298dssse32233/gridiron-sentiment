/**
 * Team Detail Page Skeleton
 *
 * Matches the exact layout of team detail pages.
 * Includes hero, stats, tabs, and game log.
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
 * TeamSkeleton Component
 *
 * Full team detail page skeleton.
 */
export function TeamSkeleton() {
  return (
    <>
      <style>{SHIMMER_STYLES}</style>
      <div className="min-h-screen bg-bg-primary">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-bg-elevated">
          <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
            <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-12">
              {/* Team Logo */}
              <div className="flex-shrink-0">
                <SkeletonCircle size="xl" />
              </div>

              {/* Team Info */}
              <div className="flex-1 space-y-4">
                {/* Team Name */}
                <Skeleton className="h-12 w-64 rounded-lg" />

                {/* Subtitle: Conference, Record */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <Skeleton className="h-5 w-40 rounded" />
                  <Skeleton className="h-5 w-32 rounded" />
                  <Skeleton className="h-5 w-24 rounded" />
                </div>

                {/* Quick Stats */}
                <div className="flex gap-6 pt-4">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-6 w-16 rounded font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16 rounded" />
                    <Skeleton className="h-6 w-20 rounded font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-6 w-24 rounded font-mono" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonStatBox key={i} />
            ))}
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="max-w-7xl mx-auto px-4 border-b border-bg-elevated">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-10 w-24 rounded-md flex-shrink-0"
              />
            ))}
          </div>
        </section>

        {/* Main Content Area */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Rating Chart */}
              <div className="bg-bg-card border border-bg-elevated rounded-lg p-6">
                <Skeleton className="h-6 w-40 mb-4 rounded" />
                <SkeletonChart height="h-80" />
              </div>

              {/* Game Log Table */}
              <div className="bg-bg-card border border-bg-elevated rounded-lg overflow-hidden">
                <div className="p-4 border-b border-bg-elevated">
                  <Skeleton className="h-6 w-32 rounded" />
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-6 gap-2 px-4 py-3 bg-bg-elevated/50 border-b border-bg-elevated text-xs font-medium">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-3 w-16 rounded" />
                  ))}
                </div>

                {/* Table Rows */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="skeleton-row grid grid-cols-6 gap-2 px-4 py-3 border-b border-bg-elevated/50 hover:bg-bg-elevated/30 transition-colors"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    {[...Array(6)].map((_, j) => (
                      <Skeleton key={j} className="h-3 w-full rounded" />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar - 1/3 width */}
            <div className="space-y-6">
              {/* Season Overview Card */}
              <div className="bg-bg-card border border-bg-elevated rounded-lg p-4 space-y-4">
                <Skeleton className="h-5 w-32 rounded" />
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-12 rounded" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                </div>
              </div>

              {/* Next Games Card */}
              <div className="bg-bg-card border border-bg-elevated rounded-lg p-4 space-y-4">
                <Skeleton className="h-5 w-28 rounded" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2 pb-3 border-b border-bg-elevated/50">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-3 w-3/4 rounded" />
                  </div>
                ))}
              </div>

              {/* Related Info Card */}
              <div className="bg-bg-card border border-bg-elevated rounded-lg p-4 space-y-3">
                <Skeleton className="h-5 w-20 rounded" />
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
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
 * Team Hero Skeleton
 *
 * Just the hero section for smaller contexts.
 */
export function TeamHeroSkeleton() {
  return (
    <>
      <style>{SHIMMER_STYLES}</style>
      <section className="relative overflow-hidden border-b border-bg-elevated">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-12">
            <SkeletonCircle size="xl" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-12 w-64 rounded-lg" />
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-5 w-32 rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Team Card Skeleton
 *
 * For team cards in grids.
 */
export function TeamCardSkeleton() {
  return (
    <>
      <style>{SHIMMER_STYLES}</style>
      <div className="bg-bg-card border border-bg-elevated rounded-lg overflow-hidden h-full flex flex-col">
        {/* Image/Logo area */}
        <div className="aspect-square bg-bg-elevated skeleton-shimmer" />

        {/* Content */}
        <div className="p-4 space-y-3 flex-1">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />

          {/* Footer */}
          <div className="flex gap-2 pt-4 border-t border-bg-elevated/50">
            <Skeleton className="h-8 w-16 rounded flex-1" />
            <Skeleton className="h-8 w-16 rounded flex-1" />
          </div>
        </div>
      </div>
    </>
  );
}
