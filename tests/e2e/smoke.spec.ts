import { test, expect } from "@playwright/test";

test("home page loads and shows Honcho Helpdesk nav", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Honcho Helpdesk")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workspaces" })).toBeVisible();
});

test("shows workspace cards or error/empty state", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator("a[href^=\"/workspaces/\"]");
  const alert = page.locator(".alert");
  const count = await cards.count() + await alert.count();
  expect(count).toBeGreaterThan(0);
});

test("workspace detail renders tabs when a workspace exists", async ({ page }) => {
  await page.goto("/");
  const firstLink = page.locator("a[href^=\"/workspaces/\"]").first();
  if (await firstLink.count() === 0) {
    test.skip();
    return;
  }
  await firstLink.click();
  await expect(page.getByRole("tab", { name: /peers/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /sessions/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /ask/i })).toBeVisible();
});

test("Ask tab shows mode toggle buttons", async ({ page }) => {
  await page.goto("/");
  const firstLink = page.locator("a[href^=\"/workspaces/\"]").first();
  if (await firstLink.count() === 0) { test.skip(); return; }
  await firstLink.click();
  await page.getByRole("tab", { name: /ask/i }).click();
  await expect(page.getByRole("button", { name: "Peer Chat" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Workspace Search" })).toBeVisible();
});

// Regression guard for the Turbopack stale route-table issue (0003):
// deep routes (3+ path segments) can 404 on a hot-restart if .next is
// not cleared. This test navigates to a real peer detail page to confirm
// those routes are reachable after the server starts.
test("deep peer route (3+ segments) resolves without 404", async ({ page }) => {
  await page.goto("/");
  const workspaceLink = page.locator("a[href^=\"/workspaces/\"]").first();
  if (await workspaceLink.count() === 0) { test.skip(); return; }
  await workspaceLink.click();

  const peerLink = page.locator("a[href*=\"/peers/\"]").first();
  if (await peerLink.count() === 0) { test.skip(); return; }

  const href = await peerLink.getAttribute("href");
  const response = await page.goto(href!);
  expect(response?.status()).not.toBe(404);
  await expect(page.locator("body")).not.toContainText("404");
});
