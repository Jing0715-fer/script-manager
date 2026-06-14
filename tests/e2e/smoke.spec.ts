import { test, expect, APIRequestContext } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────
async function getScripts(request: APIRequestContext) {
  const res = await request.get('/api/scripts?excludeContent=true');
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  return data.scripts ?? data;
}

async function getFirstPythonScript(request: APIRequestContext) {
  const scripts = await getScripts(request);
  return scripts.find((s: any) => s.language === 'python');
}

async function getExecutions(scriptId: string, request: APIRequestContext) {
  const res = await request.get(`/api/scripts/${scriptId}/executions`);
  expect(res.ok()).toBeTruthy();
  return res.json();
}

// ─── Code Review: API shape validation ─────────────────────────────
test.describe('Code review: API contracts', () => {
  test('GET /api/scripts returns params/inputFiles/outputFiles as arrays', async ({ request }) => {
    const scripts = await getScripts(request);
    const withData = scripts.filter((s: any) => s.params && s.params.length > 0);
    expect(withData.length).toBeGreaterThan(0);

    for (const s of withData.slice(0, 3)) {
      expect(Array.isArray(s.params)).toBeTruthy();
      expect(Array.isArray(s.inputFiles)).toBeTruthy();
      expect(Array.isArray(s.outputFiles)).toBeTruthy();
      if (s.params[0]) {
        expect(s.params[0]).toHaveProperty('name');
      }
    }
  });

  test('GET /api/scripts/[id]/executions returns resultFiles field', async ({ request }) => {
    const script = await getFirstPythonScript(request);
    if (!script) { test.skip(); return; }
    const data = await getExecutions(script.id, request);
    expect(data).toHaveProperty('executions');
    if (data.executions.length > 0) {
      expect(data.executions[0]).toHaveProperty('resultFiles');
    }
  });

  test('DELETE /api/executions?id= returns 200 or 404', async ({ request }) => {
    const res = await request.delete('/api/executions?id=nonexistent-id-xyz');
    expect([200, 404]).toContain(res.status());
  });

  test('GET /api/files/download returns 400 without path', async ({ request }) => {
    const res = await request.get('/api/files/download');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('GET /api/files/download returns 404 for missing file', async ({ request }) => {
    const res = await request.get('/api/files/download?path=nonexistent.txt');
    expect(res.status()).toBe(404);
  });
});

// ─── E2E: Frontend UI ─────────────────────────────────────────────
test.describe('E2E: UI flows', () => {
  test('Page loads and shows script list', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=ScriptHub', { timeout: 10000 });
    const count = page.locator('text=/\\d+ script/');
    await expect(count.first()).toBeVisible({ timeout: 5000 });
  });

  test('Clicking a script card opens detail panel with Overview tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=ScriptHub', { timeout: 10000 });

    // Find the first script card and click on it
    const cards = page.locator('[class*="cursor-pointer"][class*="transition-all"]');
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible({ timeout: 5000 });

    // Get the script name before clicking
    const nameEl = firstCard.locator('[class*="font-semibold"]').first();
    const scriptName = await nameEl.textContent();
    expect(scriptName).toBeTruthy();

    // Click the card
    await firstCard.click();

    // The detail panel (Radix Sheet) renders in a portal, so look for it in body
    // Radix SheetContent typically has data-state="open" on a wrapper div
    // Let's wait for any element that contains the script name in a panel context
    const panelTitle = page.locator('[class*="text-base font-semibold tracking-tight"]');
    await expect(panelTitle.first()).toBeVisible({ timeout: 10000 });
    const panelTitleText = await panelTitle.first().textContent();
    expect(panelTitleText).toBe(scriptName);
  });

  test('Detail panel shows Overview tab by default', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=ScriptHub', { timeout: 10000 });

    const cards = page.locator('[class*="cursor-pointer"][class*="transition-all"]');
    await cards.first().click();

    // Wait for panel to open
    const panelTitle = page.locator('[class*="text-base font-semibold tracking-tight"]');
    await expect(panelTitle.first()).toBeVisible({ timeout: 10000 });

    // Overview tab should be active (first tab)
    const overviewTab = page.locator('[role="tab"]').first();
    await expect(overviewTab).toBeVisible({ timeout: 5000 });
    const tabText = await overviewTab.textContent();
    expect(tabText?.toLowerCase()).toContain('overview');
  });

  test('Detail panel has Code, Parameters, History tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=ScriptHub', { timeout: 10000 });

    const cards = page.locator('[class*="cursor-pointer"][class*="transition-all"]');
    await cards.first().click();

    const panelTitle = page.locator('[class*="text-base font-semibold tracking-tight"]');
    await expect(panelTitle.first()).toBeVisible({ timeout: 10000 });

    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(3);

    const tabTexts = await tabs.allTextContents();
    expect(tabTexts.map(t => t.toLowerCase())).toContain('code');
    expect(tabTexts.map(t => t.toLowerCase())).toContain('parameters');
    expect(tabTexts.map(t => t.toLowerCase())).toContain('history');
  });

  test('Close detail panel with X button', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=ScriptHub', { timeout: 10000 });

    const cards = page.locator('[class*="cursor-pointer"][class*="transition-all"]');
    await cards.first().click();

    const panelTitle = page.locator('[class*="text-base font-semibold tracking-tight"]');
    await expect(panelTitle.first()).toBeVisible({ timeout: 10000 });

    // Click the close button (X icon)
    const closeBtn = page.locator('[aria-label="Close detail panel"]');
    await expect(closeBtn).toBeVisible({ timeout: 5000 });
    await closeBtn.click();

    // Panel should close
    await expect(panelTitle.first()).not.toBeVisible({ timeout: 5000 });
  });
});

// ─── Code Review: Security ────────────────────────────────────────
test.describe('Code review: Security checks', () => {
  test('DELETE execution validates id parameter', async ({ request }) => {
    const res = await request.delete('/api/executions');
    expect(res.status()).toBe(400);
  });

  test('File download validates path traversal', async ({ request }) => {
    const res = await request.get('/api/files/download?path=../../../etc/passwd');
    expect(res.status()).not.toBe(200);
  });
});

// ─── Code Review: Consistency ─────────────────────────────────────
test.describe('Code review: Data consistency', () => {
  test('All scripts with params have valid JSON in params field', async ({ request }) => {
    const scripts = await getScripts(request);
    for (const s of scripts) {
      if (s.params) {
        expect(Array.isArray(s.params)).toBeTruthy();
        for (const p of s.params) {
          expect(p).toHaveProperty('name');
        }
      }
      if (s.inputFiles) expect(Array.isArray(s.inputFiles)).toBeTruthy();
      if (s.outputFiles) expect(Array.isArray(s.outputFiles)).toBeTruthy();
    }
  });

  test('Scripts with resultFiles show file metadata correctly', async ({ request }) => {
    const scripts = await getScripts(request);
    const script = await getFirstPythonScript(request);
    if (!script) { test.skip(); return; }
    const data = await getExecutions(script.id, request);
    for (const exec of data.executions) {
      if (exec.resultFiles && exec.resultFiles.length > 0) {
        for (const f of exec.resultFiles) {
          expect(f).toHaveProperty('name');
          expect(f).toHaveProperty('path');
          expect(f).toHaveProperty('size');
          expect(typeof f.size).toBe('number');
          expect(f.size).toBeGreaterThan(0);
        }
      }
    }
  });
});
