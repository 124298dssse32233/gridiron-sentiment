/**
 * Global Loading State
 *
 * Shows the RankingsSkeleton since homepage is the rankings table.
 * Updated to use new skeleton components.
 */

import { RankingsSkeleton } from "@/components/skeletons/rankings-skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen">
      <RankingsSkeleton />
    </div>
  );
}
