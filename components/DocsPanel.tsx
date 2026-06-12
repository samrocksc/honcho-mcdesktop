"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { getDoc } from "@/lib/docs";

type Tab = "docs"

const TABS: readonly { readonly id: Tab; readonly label: string }[] = [
  { id: "docs", label: "docs" },
];

type Props = {
  readonly isOpen: boolean
  readonly onCloseAction: () => void
}

export default function DocsPanel({ isOpen, onCloseAction }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("docs");
  const pathname = usePathname();
  const doc = getDoc(pathname);

  if (!isOpen) return null;

  return (
    <div
      className="flex flex-col border-l border-base-200 overflow-hidden flex-shrink-0"
      style={{ width: 260, background: "#fafaf7" }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center border-b border-base-200 flex-shrink-0"
        style={{ background: "#f5f5f0" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-base-content border-b-2 border-neutral"
                : "text-base-content/50 hover:text-base-content/80"
            }`}
            style={{ marginBottom: activeTab === tab.id ? -1 : 0 }}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={onCloseAction}
          className="ml-auto px-3 py-2 text-base-content/40 hover:text-base-content/80 transition-colors text-sm"
          aria-label="Close docs panel"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="font-semibold text-base mb-3 text-base-content">{doc.title}</h3>
        {doc.content}
      </div>
    </div>
  );
}
