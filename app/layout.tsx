import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/app/components/LayoutShell";

export const metadata: Metadata = {
  title: "Honcho Helpdesk",
  description: "Read-only dashboard for self-hosted Honcho",
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className="bg-base-200 overflow-hidden h-screen">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
