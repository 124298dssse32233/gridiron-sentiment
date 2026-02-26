/**
 * Rankings Table Skeleton
 *
 * Matches the exact layout of the rankings table page.
 * Includes header, filters, and staggered table rows.
 */

"use client";

import { Skeleton, SkeletonCircle, SkeletonBadge } from "@/components/ui/skeleton";

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
 * RankingsSkeleton Component
 *
 * Full rankings page skeleton with header, filters, and table.
 */
export function RankingsSkeleton() {
  return (
    <>
      <style>{SHIMMER_STYLES}</style>
      <div className="min-h-screen bg-bg-primary">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-bg-elevated">
          <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              {/* Title and Subtitle */}
              <div className="space-y-4">
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-12 w-96 rounded-lg" />
                <Skeleton className="h-6 w-full max-w-2xl rounded-lg" />
              </div>

              {/* Stats Preview */}
              <div className="flex gap-8">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-20 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="max-w-7xl mx-auto px-4 py-6 border-b border-bg-elevated">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search Bar */}
            <Skeleton className="h-10 flex-1 rounded-md max-w-xs" />

            {/* Filter Dropdowns */}
            <div className="flex gap-3 flex-wrap">
              <Skeleton className="h-10 w-32 rounded-md" />
              <Skeleton className="h-10 w-28 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </div>
        </section>

        {/* Rankings Table */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-bg-card border border-bg-elevated rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-bg-elevated bg-bg-elevated/50">
              <Skeleton className="h-4 col-span-1 rounded" />
              <Skeleton className="h-4 col-span-2 rounded" />
              <Skeleton className="h-4 col-span-1 rounded" />
              <Skeleton className="h-4 col-span-2 rounded" />
              <Skeleton className="h-4 col-span-2 rounded" />
              <Skeleton className="h-4 col-span-2 rounded" />
              <Skeleton className="h-4 col-span-1 rounded" />
            </div>

            {/* Table Rows with Stagger */}
            <div className="divide-y divide-bg-elevated">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton-row grid grid-cols-12 gap-3 px-4 py-4 hover:bg-bg-elevated/30 transition-colors"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center">
                    <Skeleton className="h-5 w-8 rounded" />
                  </div>

                  {/* Logo + Team Name */}
                  <div className="col-span-2 flex items-center gap-3">
                    <SkeletonCircle size="sm" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-2 w-2/3 rounded" />
                    </div>
                  </div>

                  {/* Conference */}
                  <div className="col-span-1 flex items-center">
                    <SkeletonBadge />
                  </div>

                  {/* Record */}
                  <div className="col-span-2 flex items-center">
                    <Skeleton className="h-4 w-16 rounded font-mono" />
                  </div>

                  {/* Rating */}
                  <div className="col-span-2 flex items-center">
                    <Skeleton className="h-4 w-20 rounded font-mono" />
                  </div>

                  {/* Sparkline Chart */}
                  <div className="col-span-2 flex items-center">
                    <Skeleton className="h-8 w-full rounded" />
                  </div>

                  {/* Change */}
                  <div className="col-span-1 flex items-center">
                    <SkeletonBadge />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination or Load More */}
          <div className="mt-6 flex justify-center">
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </section>

        {/* Features Preview Section */}
        <section className="max-w-7xl mx-auto px-4 py-12 border-t border-bg-elevated">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 rounded-lg mb-2" />
            <Skeleton className="h-5 w-96 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border bg-bg-card border-bg-elevated space-y-3"
              >
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

/**
 * Mini Rankings Skeleton
 *
 * For use in sidebars or smaller contexts.
 */
export function MiniRankingsSkeleton() {
  return (
    <>
      <style>{SHIMMER_STYLES}</style>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="skeleton-row flex items-center gap-3 p-3 rounded-lg bg-bg-card border border-bg-elevated"
            style={{
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <Skeleton className="h-5 w-6 rounded" />
            <SkeletonCircle size="sm" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-2 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-12 rounded font-mono" />
          </div>
        ))}
      </div>
    </>
  );
}
