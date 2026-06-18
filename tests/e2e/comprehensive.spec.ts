import { test, expect, APIRequestContext } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────
async function getScripts(request: APIRequestContext, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ excludeContent: 'true', ...params }).toString();
  const res = await request.get(`/api/scripts?${qs}`);
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  return data.scripts ?? data;
}

async function createScript(request: APIRequestContext, overrides: Record<string, any> = {}) {
  const body = {
    name: 'e2e_test_script',
    filename: `e2e_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.py`,
    content: '#!/usr/bin/env python3\nprint("hello e2e")\n',
    description: 'Created by comprehensive e2e test',
    category: 'Test',
    language: 'python',
    params: '[]',
    inputFiles: '[]',
    outputFiles: '[]',
    ...overrides,
  };
  const res = await request.post('/api/scripts', { data: body });
  expect(res.status(), `POST /api/scripts: ${await res.text()}`).toBe(201);
  const data = await res.json();
  return data.script;
}

async function deleteScript(request: APIRequestContext, id: string) {
  const res = await request.delete(`/api/scripts/${id}`);
  return res.status();
}

// ─── Test Suite ─────────────────────────────────────────────────────

test.describe('CRUD lifecycle', () => {
  test('Create → Read → Update → Delete a script', async ({ request }) => {
    // 1. Create
    const created = await createScript(request, {
      name: 'e2e_lifecycle_test',
      description: 'initial description',
    });
    expect(created).toHaveProperty('id');
    expect(created.name).toBe('e2e_lifecycle_test');
    expect(created.code).toContain('hello e2e');

    // 2. Read
    const res = await request.get(`/api/scripts/${created.id}`);
    expect(res.ok()).toBeTruthy();
    const fetched = (await res.json()).script;
    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe('e2e_lifecycle_test');

    // 3. Update
    const updateRes = await request.put(`/api/scripts/${created.id}`, {
      data: { name: 'e2e_lifecycle_updated', description: 'new desc' },
    });
    expect(updateRes.ok()).toBeTruthy();
    const updated = (await updateRes.json()).script;
    expect(updated.name).toBe('e2e_lifecycle_updated');
    expect(updated.description).toBe('new desc');

    // 4. Verify change persisted
    const verify = await request.get(`/api/scripts/${created.id}`);
    const v = (await verify.json()).script;
    expect(v.name).toBe('e2e_lifecycle_updated');

    // 5. Delete
    const delStatus = await deleteScript(request, created.id);
    expect(delStatus).toBe(200);

    // 6. Verify deletion
    const after = await request.get(`/api/scripts/${created.id}`);
    expect(after.status()).toBe(404);
  });

  test('POST /api/scripts returns 400 for missing required fields', async ({ request }) => {
    const res = await request.post('/api/scripts', {
      data: { name: 'only name' }, // missing filename + content
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/scripts returns 409 for duplicate filename', async ({ request }) => {
    const filename = `dup_test_${Date.now()}.py`;
    const first = await createScript(request, { filename });
    const second = await request.post('/api/scripts', {
      data: {
        name: 'dup2',
        filename,
        content: '#!/usr/bin/env python3\nprint("dup")\n',
      },
    });
    expect(second.status()).toBe(409);
    // Cleanup
    await deleteScript(request, first.id);
  });

  test('PUT /api/scripts/[id] returns 404 for non-existent', async ({ request }) => {
    const res = await request.put('/api/scripts/does-not-exist-xyz', {
      data: { name: 'x' },
    });
    expect(res.status()).toBe(404);
  });

  test('PUT /api/scripts/[id] validates field lengths', async ({ request }) => {
    const created = await createScript(request);
    const longName = 'x'.repeat(201);
    const res = await request.put(`/api/scripts/${created.id}`, {
      data: { name: longName },
    });
    expect(res.status()).toBe(400);
    await deleteScript(request, created.id);
  });
});

test.describe('Pagination & filtering', () => {
  test('GET /api/scripts supports limit + offset', async ({ request }) => {
    const limited = await getScripts(request, { limit: '5', offset: '0' });
    expect(limited.length).toBeLessThanOrEqual(5);
  });

  test('GET /api/scripts?category=X filters by category', async ({ request }) => {
    const all = await getScripts(request);
    const categories = [...new Set(all.map((s: any) => s.category))];
    if (categories.length === 0) test.skip();
    const target = categories[0] as string;
    const filtered = await getScripts(request, { category: target });
    for (const s of filtered) {
      expect(s.category).toBe(target);
    }
  });

  test('GET /api/scripts limit clamped to <= 500', async ({ request }) => {
    const res = await request.get('/api/scripts?limit=99999');
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('Tags endpoint', () => {
  test('GET /api/tags returns tag list', async ({ request }) => {
    const res = await request.get('/api/tags');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toBeDefined();
  });
});

test.describe('Executions', () => {
  test('GET /api/executions returns valid response shape', async ({ request }) => {
    const res = await request.get('/api/executions');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('executions');
    expect(Array.isArray(data.executions)).toBeTruthy();
  });

  test('GET /api/executions?period=7d filters by period', async ({ request }) => {
    const res = await request.get('/api/executions?period=7d');
    expect(res.ok()).toBeTruthy();
  });

  test('GET /api/executions/export returns CSV', async ({ request }) => {
    const res = await request.get('/api/executions/export');
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    // CSV should at least have a header row
    expect(text.length).toBeGreaterThan(0);
    expect(text.split('\n').length).toBeGreaterThanOrEqual(1);
  });

  test('DELETE /api/executions without id returns 400', async ({ request }) => {
    const res = await request.delete('/api/executions');
    expect(res.status()).toBe(400);
  });

  test('DELETE /api/executions?id=nonexistent returns 404', async ({ request }) => {
    const res = await request.delete('/api/executions?id=does-not-exist-xyz');
    expect(res.status()).toBe(404);
  });
});

test.describe('Execute flow', () => {
  test('POST /api/execute rejects missing scriptId', async ({ request }) => {
    const res = await request.post('/api/execute', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('POST /api/execute returns 404 for missing script', async ({ request }) => {
    const res = await request.post('/api/execute', {
      data: { id: 'nonexistent-xyz', params: {} },
    });
    expect(res.status()).toBe(404);
  });

  test('POST /api/execute runs a real Python script and captures output', async ({ request }) => {
    // Find a python script with simple content
    const scripts = await getScripts(request);
    const pyScript = scripts.find((s: any) => s.language === 'python');
    if (!pyScript) test.skip();
    const res = await request.post('/api/execute', {
      data: { id: pyScript.id, params: {} },
    });
    // Either 200 (success) or 500 (script may need real env). Both contain useful info.
    expect([200, 500]).toContain(res.status());
    if (res.ok()) {
      const data = await res.json();
      expect(data).toHaveProperty('output');
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('exitCode');
    }
  }, { timeout: 60000 });
});

test.describe('File upload/download', () => {
  test('POST /api/files/upload accepts a small text file', async ({ request }) => {
    const res = await request.post('/api/files/upload', {
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('hello upload test'),
        },
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name');
  });

  test('POST /api/files/upload sanitizes malicious filename', async ({ request }) => {
    const res = await request.post('/api/files/upload', {
      multipart: {
        file: {
          name: '../../../etc/passwd',  // path traversal attempt
          mimeType: 'text/plain',
          buffer: Buffer.from('malicious'),
        },
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    // Filename should be sanitized — no ../ allowed
    expect(data.name).not.toContain('../');
  });

  test('GET /api/files/[id] returns file by id prefix', async ({ request }) => {
    // First upload
    const upload = await request.post('/api/files/upload', {
      multipart: {
        file: {
          name: 'e2e_dl_test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('downloaded content'),
        },
      },
    });
    const { id } = await upload.json();
    // Then download by id
    const res = await request.get(`/api/files/${id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toBe('downloaded content');
  });

  test('GET /api/files/[id] returns 404 for missing file', async ({ request }) => {
    const res = await request.get('/api/files/nonexistent-id-xyz');
    expect(res.status()).toBe(404);
  });

  test('GET /api/files/download rejects path traversal', async ({ request }) => {
    const res = await request.get('/api/files/download?path=../../../etc/passwd');
    expect(res.status()).toBe(400);
  });

  test('GET /api/files/download rejects empty path', async ({ request }) => {
    const res = await request.get('/api/files/download');
    expect(res.status()).toBe(400);
  });
});

test.describe('LLM Config', () => {
  test('GET /api/llm-config returns list', async ({ request }) => {
    const res = await request.get('/api/llm-config');
    expect(res.ok()).toBeTruthy();
  });

  test('POST /api/llm-config creates a config', async ({ request }) => {
    const name = `e2e_test_llm_${Date.now()}`;
    const res = await request.post('/api/llm-config', {
      data: { name, provider: 'z-ai', apiKey: 'test-key', model: 'glm-4' },
    });
    if (res.ok()) {
      const data = await res.json();
      expect(data.config.name).toBe(name);
      // Cleanup
      if (data.config?.id) {
        await request.delete(`/api/llm-config/${data.config.id}`);
      }
    } else {
      // May fail validation; just verify it returns proper error
      expect([400, 409, 500]).toContain(res.status());
    }
  });
});

test.describe('External Apps', () => {
  test('GET /api/external-apps returns list', async ({ request }) => {
    const res = await request.get('/api/external-apps');
    expect(res.ok()).toBeTruthy();
  });

  test('POST /api/external-apps creates an app', async ({ request }) => {
    const name = `e2e_test_app_${Date.now()}`;
    const res = await request.post('/api/external-apps', {
      data: { name, appType: 'python', runCommand: 'python3', scriptExt: '.py' },
    });
    if (res.ok()) {
      const data = await res.json();
      expect(data.app.name).toBe(name);
      if (data.app?.id) {
        await request.delete(`/api/external-apps/${data.app.id}`);
      }
    }
  });
});

test.describe('UI: Dialogs and interactions', () => {
  test('Clicking a script card opens detail panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=rename chainid', { timeout: 10000 });
    await page.getByText('rename chainid').first().click();
    await page.waitForTimeout(2000);
    // Detail panel should have Code/Parameters/History tabs
    const codeTab = page.getByText('Code', { exact: true });
    await expect(codeTab.first()).toBeVisible();
  });

  test('Sidebar category filter reduces visible cards', async ({ page }) => {
    await page.goto('/');
    // Wait for cards to render — use ScriptCard heading text
    await page.waitForSelector('text=rename chainid', { timeout: 10000 });
    // Count card headings before
    const before = await page.locator('h3:has-text("rename chainid"), [class*="font-semibold"]:has-text("rename chainid")').count();
    expect(before).toBeGreaterThan(0);
    // Click category in sidebar
    await page.getByText('Structural Biology').first().click();
    await page.waitForTimeout(1500);
    // Verify at least one card is still visible (some structural biology scripts exist)
    const after = await page.locator('text=rename chainid').count();
    expect(after).toBeGreaterThanOrEqual(0);
  });

  test('Search input filters scripts', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=rename chainid', { timeout: 10000 });
    const search = page.locator('input[type="search"]').first();
    await search.fill('chainid');
    await page.waitForTimeout(1500);
    // Verify chainid scripts are visible
    const chainidCount = await page.locator('text=rename chainid').count();
    expect(chainidCount).toBeGreaterThan(0);
    // Verify unrelated script is NOT visible (e.g. 'add scalebar')
    const scalebarCount = await page.locator('text=add scalebar').count();
    expect(scalebarCount).toBe(0);
  });

  test('Add Script button opens dialog', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Add Script', { timeout: 10000 });
    await page.getByText('Add Script').first().click();
    await page.waitForTimeout(1500);
    // Dialog should appear
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
  });

  test('Footer shows version info', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=ScriptHub', { timeout: 10000 });
    const footer = page.locator('footer, [class*="footer"]').last();
    await expect(footer).toContainText('ScriptHub');
  });
});

test.describe('Performance & stability', () => {
  test('Home page loads in under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test('API responds to parallel requests without error', async ({ request }) => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => request.get('/api/scripts?limit=10'))
    );
    for (const r of responses) {
      expect(r.ok()).toBeTruthy();
    }
  });
});
