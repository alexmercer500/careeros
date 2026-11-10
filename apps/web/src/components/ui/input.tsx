import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
