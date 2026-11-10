import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
