"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  ChartColumn,
  FileText,
  House,
  Plug,
  Search,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: House },
  { href: "/career", label: "My Career", icon: User },
  { href: "/resume-studio", label: "Resume Studio", icon: FileText },
  { href: "/jobs", label: "Discover Jobs", icon: Search },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function SidebarNav({ layout = "vertical" }: { layout?: "vertical" | "horizontal" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "gap-1",
        layout === "vertical"
          ? "flex flex-col p-3"
          : "flex overflow-x-auto px-4 pb-2 [scrollbar-width:none]",
      )}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              layout === "horizontal" && "shrink-0 py-1.5",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
