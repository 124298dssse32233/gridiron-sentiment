/**
 * Badge Component
 *
 * A small status indicator component
 */

import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-bg-card text-text-secondary border border-bg-elevated",
        primary: "bg-accent-teal/10 text-accent-teal border border-accent-teal/20",
        secondary: "bg-accent-purple/10 text-accent-purple border border-accent-purple/20",
        chaos: "bg-accent-chaos/10 text-accent-chaos border border-accent-chaos/20",
        positive: "bg-accent-positive/10 text-accent-positive border border-accent-positive/20",
        negative: "bg-accent-negative/10 text-accent-negative border border-accent-negative/20",
        warning: "bg-accent-warning/10 text-accent-warning border border-accent-warning/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
