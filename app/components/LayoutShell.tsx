"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import DocsPanel, { type DocPanelTab } from "@/components/DocsPanel";

const STORAGE_KEY = "honcho-docs-panel-open";

export default function LayoutShell({ children }: { readonly children: React.ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DocPanelTab>("docs");

  useEffect(() => {
    setIsPanelOpen(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  const togglePanel = () => {
    setIsPanelOpen((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  const closePanel = () => {
    localStorage.setItem(STORAGE_KEY, "false");
    setIsPanelOpen(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <nav className="navbar bg-base-100 shadow-sm px-4 flex-shrink-0">
        <Link href="/" className="btn btn-ghost text-xl font-bold">
          Honcho Helpdesk
        </Link>
        <div className="ml-auto flex gap-2 items-center">
          <Link href="/" className="btn btn-ghost btn-sm">Workspaces</Link>
          <Link href="/learn" className="btn btn-ghost btn-sm">Learn</Link>
          <Link href="/diagnose" className="btn btn-ghost btn-sm">Diagnose</Link>
          <Link href="/stats" className="btn btn-ghost btn-sm">Stats</Link>
          <button
            className={`btn btn-sm ${isPanelOpen ? "btn-neutral" : "btn-outline"}`}
            onClick={togglePanel}
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
        <DocsPanel
          isOpen={isPanelOpen}
          activeTab={activeTab}
          onTabChangeAction={setActiveTab}
          onCloseAction={closePanel}
        />
      </div>
    </div>
  );
}
