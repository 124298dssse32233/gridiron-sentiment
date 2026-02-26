/**
 * Global Not Found Page
 *
 * Shown when a route doesn't exist.
 * Updated to use new error state component.
 */

import { NotFoundError } from "@/components/ui/error-state";

export default function NotFound() {
  return (
    <NotFoundError
      fullPage={true}
      homeLink={true}
    />
  );
}
