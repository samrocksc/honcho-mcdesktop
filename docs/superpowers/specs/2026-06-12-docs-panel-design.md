# Docs Panel — Design Spec

**Date:** 2026-06-12  
**Status:** approved

## Summary

Add a collapsible right-side docs panel to the Honcho Helpdesk UI. When open it pushes the main content left and shows context-sensitive documentation for the current page. The panel has a tab bar (single "docs" tab now, extensible later).

## Decisions

| Question | Decision |
|---|---|
| Layout behaviour | Push sidebar — main content shrinks, panel sits beside it at fixed width |
| Panel style | Tinted off-white background (`#fafaf7`) to feel like a distinct layer |
| Toggle location | Navbar top-right: `? docs` button |
| Docs source | Static route map in `lib/docs.ts` |
| Tabs | `docs` only for now; tab bar is extensible (e.g. future `controls` tab for stats knobs) |
| Open state persistence | Local component state — resets on page load, no localStorage |

## Components

### `lib/docs.ts`

Static map of route patterns to doc content:

```ts
type DocEntry = {
  title: string
  content: React.ReactNode
}

const DOCS: { pattern: string; entry: DocEntry }[] = [ ... ]

export function getDoc(pathname: string): DocEntry { ... }
```

Matched from most-specific to least-specific using `pathname.startsWith()`. Fallback entry for unmatched routes ("No docs for this page yet.").

**Pages covered:**
- `/stats`
- `/diagnose`
- `/workspaces/[id]/peers/[peerId]`
- `/workspaces/[id]/sessions/[sessionId]`
- `/workspaces/[id]`
- `/` (workspaces list)

### `components/DocsPanel.tsx`

Client component. Rendered by `LayoutShell`.

- Accepts `isOpen`, `onClose`, and `activeTab` / `onTabChange` props from `LayoutShell`
- Calls `usePathname()` internally to resolve the current doc entry
- Renders the 260px tinted panel with tab bar and scrollable content area
- Tab bar renders one button per tab; `docs` is the only tab initially

### `app/components/LayoutShell.tsx`

Client component wrapping the full page. Owns `isOpen: boolean` state.

Renders:
```
<div class="flex flex-col min-h-screen">
  <nav>  ← includes "? docs" toggle button
  <div class="flex flex-1">
    <main class="flex-1 ...">  ← {children}
    <DocsPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
  </div>
</div>
```

`layout.tsx` becomes a thin server shell that renders `<LayoutShell>{children}</LayoutShell>`.

## Styling

- Panel width: **260px** (fixed, not resizable)
- Panel background: `#fafaf7` (warm off-white)
- Tab bar background: `#f5f5f0`
- Active tab indicator: 2px bottom border, `#18181b`
- Toggle button in navbar: dark filled pill (`bg-neutral text-neutral-content`)
- No open/close animation — clean show/hide
- Panel does not render at all when closed (no hidden div)

## Tab extensibility

The tab bar accepts a `tabs: { id: string; label: string }[]` prop. Adding a future "controls" tab for the stats page is one array entry + a conditional render in `DocsPanel`.

## Tests

No new unit tests required — the `getDoc` lookup function is pure and trivial to test manually. E2E smoke test can assert the toggle button exists on any page load.
