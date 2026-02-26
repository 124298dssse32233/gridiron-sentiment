/**
 * Page Loading Skeleton
 *
 * Consistent loading state across all pages
 */

export function PageLoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-bg-card rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-bg-elevated rounded animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-bg-card border border-bg-elevated rounded-lg p-4">
              <div className="h-4 w-3/4 bg-bg-elevated rounded animate-pulse mb-3" />
              <div className="h-3 w-1/2 bg-bg-elevated rounded animate-pulse mb-4" />
              <div className="flex gap-4">
                <div className="h-8 w-20 bg-bg-elevated rounded animate-pulse" />
                <div className="h-8 w-20 bg-bg-elevated rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-bg-card border border-bg-elevated rounded-lg p-4">
              <div className="h-4 w-1/2 bg-bg-elevated rounded animate-pulse mb-3" />
              <div className="h-3 w-full bg-bg-elevated rounded animate-pulse mb-2" />
              <div className="h-3 w-3/4 bg-bg-elevated rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TableLoadingSkeleton() {
  return (
    <div className="bg-bg-card border border-bg-elevated rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-bg-elevated">
        <div className="h-6 w-32 bg-bg-elevated rounded animate-pulse" />
      </div>

      {/* Table rows */}
      <div className="divide-y divide-bg-elevated">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-bg-elevated rounded animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-bg-elevated rounded animate-pulse" />
              <div className="h-3 w-32 bg-bg-elevated rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
