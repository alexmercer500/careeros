import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        muted: "border-border bg-muted text-muted-foreground",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
      },
    },
    defaultVariants: { variant: "muted" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
