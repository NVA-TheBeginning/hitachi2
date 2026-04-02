import { it } from "bun:test";
import { chromium, type Page } from "playwright";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3001";

async function withBrowser(fn: (page: Page) => Promise<void>): Promise<void> {
  const browser = await chromium.launch({ headless: !!process.env.CI });
  const page = await browser.newPage();
  page.setDefaultTimeout(30_000);
  try {
    await fn(page);
  } finally {
    await browser.close();
  }
}

it(
  "Quick Login page shows its heading",
  async () => {
    await withBrowser(async (page) => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "Quick Login" }).waitFor({ state: "visible" });
    });
  },
  { timeout: 60_000 },
);
