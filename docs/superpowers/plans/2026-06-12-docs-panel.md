# Docs Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible right-side docs panel to the Honcho Helpdesk that shows context-sensitive documentation for the current page, opened via a "? docs" button in the navbar.

**Architecture:** A static route map in `lib/docs.tsx` maps URL patterns to doc content. A `LayoutShell` client component (in `app/components/`) owns the open/closed toggle state and renders the navbar plus a flex row containing `{children}` and `<DocsPanel>`. `app/layout.tsx` becomes a thin server shell that delegates everything to `LayoutShell`.

**Tech Stack:** Next.js App Router, React (useState, client components), Tailwind CSS / DaisyUI, `next/navigation` (usePathname)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `lib/docs.tsx` | Static route map + `getDoc(pathname)` |
| Create | `components/DocsPanel.tsx` | Panel UI — tabs, content, close button |
| Create | `app/components/LayoutShell.tsx` | Toggle state + navbar + flex layout |
| Modify | `app/layout.tsx` | Delegate to LayoutShell |
| Create | `tests/lib/honcho/docs.test.ts` | Unit tests for `getDoc` routing |

---

## Task 1: `lib/docs.tsx` — route map and lookup function

**Files:**
- Create: `lib/docs.tsx`
- Test: `tests/lib/docs.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/docs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getDoc } from "@/lib/docs";

describe("getDoc", () => {
  it("matches /stats", () => {
    expect(getDoc("/stats").title).toBe("Stats");
  });

  it("matches /diagnose", () => {
    expect(getDoc("/diagnose").title).toBe("Diagnose");
  });

  it("matches workspace list /", () => {
    expect(getDoc("/").title).toBe("Workspaces");
  });

  it("matches workspace detail", () => {
    expect(getDoc("/workspaces/the-sewer").title).toBe("Workspace");
  });

  it("matches peer detail before workspace detail", () => {
    expect(getDoc("/workspaces/the-sewer/peers/sam").title).toBe("Peer");
  });

  it("matches session detail before workspace detail", () => {
    expect(getDoc("/workspaces/the-sewer/sessions/sess-1").title).toBe("Session");
  });

  it("returns fallback for unknown routes", () => {
    expect(getDoc("/unknown/route").title).toBe("Honcho Helpdesk");
  });
});
```

- [ ] **Step 2: Run tests — expect them to fail**

```bash
npx vitest run tests/lib/docs.test.ts
```

Expected: `Cannot find module '@/lib/docs'`

- [ ] **Step 3: Create `lib/docs.tsx`**

```tsx
import React from "react";

export type DocEntry = {
  readonly title: string
  readonly content: React.ReactNode
}

const statsDoc: DocEntry = {
  title: "Stats",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>This page shows how much stuff Honcho has been saving, and when.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Time window</h4>
        <p className="text-base-content/70">How far back you want to look. Pick 7d for the last week, 30d for the last month, and so on.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">What to count</h4>
        <ul className="space-y-1 text-base-content/70">
          <li><strong className="text-base-content">conclusions</strong> — facts Honcho has written down about people</li>
          <li><strong className="text-base-content">messages</strong> — individual chat messages</li>
          <li><strong className="text-base-content">both</strong> — conclusions + messages added together</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">The chart</h4>
        <p className="text-base-content/70">Each line is one workspace. Hover over any day to see the exact numbers.</p>
      </div>
    </div>
  ),
};

const diagnoseDoc: DocEntry = {
  title: "Diagnose",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>Ask a question and see exactly what Honcho knows — before you trust it with anything important.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Observer</h4>
        <p className="text-base-content/70">Who is asking the question. Honcho answers from this person's point of view.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Target</h4>
        <p className="text-base-content/70">Who the question is <em>about</em>. Usually the same as the observer. Tick the checkbox to ask about someone else.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Reasoning level</h4>
        <p className="text-base-content/70">How hard Honcho thinks before answering. <strong className="text-base-content">low</strong> is quick. <strong className="text-base-content">max</strong> is slow but thorough.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">What you get back</h4>
        <ul className="space-y-1 text-base-content/70">
          <li><strong className="text-base-content">Honcho answer</strong> — the actual answer an AI would receive</li>
          <li><strong className="text-base-content">Peer card</strong> — a short list of facts about this person</li>
          <li><strong className="text-base-content">Context</strong> — everything combined that the AI would see</li>
          <li><strong className="text-base-content">Message recall</strong> — old messages that matched your question</li>
        </ul>
      </div>
    </div>
  ),
};

const peerDetailDoc: DocEntry = {
  title: "Peer",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>A peer is a person (or AI) that Honcho has been learning about. This page shows everything it knows.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Representation</h4>
        <p className="text-base-content/70">A written summary of what Honcho has figured out about this person over time. It updates as more conversations happen.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Context</h4>
        <p className="text-base-content/70">What an AI assistant would actually be told about this person when they ask a question.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Sessions</h4>
        <p className="text-base-content/70">Past conversations this person was part of. Click one to read the full chat.</p>
      </div>
    </div>
  ),
};

const sessionDetailDoc: DocEntry = {
  title: "Session",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>A session is one conversation. This page shows every message in it, oldest first.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Messages</h4>
        <p className="text-base-content/70">Each bubble shows who sent it, whether they were the human or the AI, and what they said. Honcho reads these to learn about people over time.</p>
      </div>
    </div>
  ),
};

const workspaceDetailDoc: DocEntry = {
  title: "Workspace",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>A workspace is like a folder. Everything inside it — people, chats, and facts — belongs together.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Peers tab</h4>
        <p className="text-base-content/70">The people (or AIs) Honcho knows about in this workspace. Click someone to see what Honcho has learned about them.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Sessions tab</h4>
        <p className="text-base-content/70">Past conversations. Click one to read the full chat from start to finish.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Conclusions tab</h4>
        <p className="text-base-content/70">Facts Honcho has written down. You can search them — just pick who is asking and who it's about first.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">Ask tab</h4>
        <p className="text-base-content/70"><strong className="text-base-content">Peer Chat</strong> — ask a person a question and get an answer based on what Honcho knows. <strong className="text-base-content">Workspace Search</strong> — search through all the messages in this workspace.</p>
      </div>
    </div>
  ),
};

const workspacesListDoc: DocEntry = {
  title: "Workspaces",
  content: (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>These are all the workspaces in your Honcho instance. Click any card to open it.</p>
      <div>
        <h4 className="font-semibold text-base-content mb-1">What is a workspace?</h4>
        <p className="text-base-content/70">Think of it like a project folder. The people, chats, and facts inside one workspace are kept separate from those in another.</p>
      </div>
      <div>
        <h4 className="font-semibold text-base-content mb-1">What can I do inside?</h4>
        <p className="text-base-content/70">Browse the people Honcho knows, read past conversations, search facts, or ask a question directly.</p>
      </div>
    </div>
  ),
};

const fallbackDoc: DocEntry = {
  title: "Honcho Helpdesk",
  content: (
    <div className="text-sm text-base-content/60 leading-relaxed">
      <p>No documentation for this page yet.</p>
    </div>
  ),
};

export function getDoc(pathname: string): DocEntry {
  if (pathname.includes("/peers/")) return peerDetailDoc;
  if (pathname.includes("/sessions/")) return sessionDetailDoc;
  if (pathname.startsWith("/workspaces/")) return workspaceDetailDoc;
  if (pathname.startsWith("/stats")) return statsDoc;
  if (pathname.startsWith("/diagnose")) return diagnoseDoc;
  if (pathname === "/") return workspacesListDoc;
  return fallbackDoc;
}
```

- [ ] **Step 4: Run tests — expect them all to pass**

```bash
npx vitest run tests/lib/docs.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/docs.tsx tests/lib/docs.test.ts
git commit -m "feat: add docs route map and getDoc lookup"
```

---

## Task 2: `components/DocsPanel.tsx` — panel UI

**Files:**
- Create: `components/DocsPanel.tsx`

- [ ] **Step 1: Create `components/DocsPanel.tsx`**

```tsx
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
  readonly onClose: () => void
}

export default function DocsPanel({ isOpen, onClose }: Props) {
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
          onClick={onClose}
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
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

```bash
npm test
```

Expected: all previously-passing tests still pass (DocsPanel has no unit tests — it wraps `getDoc` which is already tested).

- [ ] **Step 3: Commit**

```bash
git add components/DocsPanel.tsx
git commit -m "feat: add DocsPanel client component"
```

---

## Task 3: `app/components/LayoutShell.tsx` — toggle state and layout

**Files:**
- Create: `app/components/LayoutShell.tsx`

- [ ] **Step 1: Create `app/components/LayoutShell.tsx`**

```tsx
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
        <DocsPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/LayoutShell.tsx
git commit -m "feat: add LayoutShell with docs panel toggle"
```

---

## Task 4: Wire `app/layout.tsx` to use `LayoutShell`

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace the layout body**

The current `app/layout.tsx` is:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Honcho Helpdesk",
  description: "Read-only dashboard for self-hosted Honcho",
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className="min-h-screen bg-base-200">
        <nav className="navbar bg-base-100 shadow-sm px-4">
          <a href="/" className="btn btn-ghost text-xl font-bold">
            Honcho Helpdesk
          </a>
          <div className="ml-auto flex gap-2">
            <a href="/" className="btn btn-ghost btn-sm">Workspaces</a>
            <a href="/diagnose" className="btn btn-ghost btn-sm">Diagnose</a>
            <a href="/stats" className="btn btn-ghost btn-sm">Stats</a>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-6 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  );
}
```

Replace it entirely with:

```tsx
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
```

Note: `overflow-hidden h-screen` on body prevents double scrollbars — the scroll now lives on the inner `overflow-y-auto` div inside `LayoutShell`.

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Start the dev server and verify manually**

```bash
npm run dev:clean
```

Check each of the following:
1. `http://localhost:3000/` — "? docs" button visible in navbar; click it → panel opens showing **Workspaces** docs
2. Navigate to any workspace → panel (if open) switches to **Workspace** docs
3. Navigate to a peer detail page → panel shows **Peer** docs
4. Navigate to `/stats` → panel shows **Stats** docs with time window / what-to-count / chart sections
5. Navigate to `/diagnose` → panel shows **Diagnose** docs
6. Click ✕ inside the panel → panel closes; main content expands back to full width
7. Click "? docs" again → panel reopens on the same page, correct content

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: wire LayoutShell into root layout — docs panel live"
```
