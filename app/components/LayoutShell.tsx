"use client";
import { useState } from "react";
import DocsPanel from "@/components/DocsPanel";

export default function LayoutShell({ children }: { readonly children: React.ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <nav className="navbar bg-base-100 shadow-sm px-4 flex-shrink-0">
        <a href="/" className="btn btn-ghost text-xl font-bold">
          Honcho Helpdesk
        </a>
        <div className="ml-auto flex gap-2 items-center">
          <a href="/" className="btn btn-ghost btn-sm">Workspaces</a>
          <a href="/diagnose" className="btn btn-ghost btn-sm">Diagnose</a>
          <a href="/stats" className="btn btn-ghost btn-sm">Stats</a>
          <button
            className={`btn btn-sm ${isPanelOpen ? "btn-neutral" : "btn-outline"}`}
            onClick={() => setIsPanelOpen((prev) => !prev)}
            aria-label={isPanelOpen ? "Close docs panel" : "Open docs panel"}
          >
            ? docs
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 max-w-6xl">
            {children}
          </div>
        </div>
        <DocsPanel isOpen={isPanelOpen} onCloseAction={() => setIsPanelOpen(false)} />
      </div>
    </div>
  );
}
