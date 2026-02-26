/**
 * cn (classnames) utility
 *
 * Merges Tailwind CSS classes using clsx and tailwind-merge
 * From shadcn/ui conventions
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
