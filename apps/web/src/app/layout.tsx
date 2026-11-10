import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CareerOS",
    template: "%s · CareerOS",
  },
  description: "Personal career management platform.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
