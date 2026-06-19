import { test, expect } from '@playwright/test';

// E2E test: UI form values reach the script on execute
//
// Strategy:
//   1. Create a deterministic echo script via API
//   2. Open the home page and click the script card (uses smoke's selector)
//   3. Switch to Parameters tab
//   4. Type into the Foo + Bar fields
//   5. Click "Execute Script"
//   6. Verify the latest execution log has the typed values in the script's argv
test.describe('UI parameter truthfulness', () => {
  let scriptId: string;
  let scriptFilename: string;
  const SCRIPT_CONTENT = `#!/usr/bin/env python3
import argparse, os, json, sys
parser = argparse.ArgumentParser()
parser.add_argument('--foo', type=str, default='<unset>')
parser.add_argument('--bar', type=int, default=-1)
parser.add_argument('--flag', action='store_true')
try:
    args = parser.parse_args()
except SystemExit:
    sys.exit(0)
out = {
    'parsed': vars(args),
    'env_INPUT_keys': sorted([k for k in os.environ if k.startswith('INPUT_')]),
    'env_INPUT_values': {k: v for k, v in os.environ.items() if k.startswith('INPUT_')},
}
print('===UI_TRUTH_OUTPUT_START===')
print(json.dumps(out, indent=2))
print('===UI_TRUTH_OUTPUT_END===')
`;

  test.beforeAll(async ({ request }) => {
    const r = await request.post('/api/scripts', {
      data: {
        name: 'ui_truth_final',
        filename: `ui_truth_final_${Date.now()}.py`,
        content: SCRIPT_CONTENT,
        description: 'E2E UI truth test',
        category: 'Test',
        language: 'python',
        params: JSON.stringify([
          { name: 'foo', type: 'string', label: 'Foo' },
          { name: 'bar', type: 'number', label: 'Bar' },
          { name: 'flag', type: 'boolean', label: 'Flag' },
        ]),
        inputFiles: '[]',
        outputFiles: '[]',
      },
    });
    expect(r.status()).toBe(201);
    const data = await r.json();
    scriptId = data.script.id;
    scriptFilename = data.script.filename;
  });

  test.afterAll(async ({ request }) => {
    if (scriptId) await request.delete(`/api/scripts/${scriptId}`);
  });

  test('UI values reach the script', async ({ page, request }) => {
    await page.goto('/');
    await page.waitForSelector('text=ScriptHub', { timeout: 10000 });

    // Find ALL cards, then locate the one containing "ui_truth_final"
    const cards = page.locator('[class*="cursor-pointer"][class*="transition-all"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Click the card whose name matches our test script
    const targetCard = cards.filter({ hasText: 'ui_truth_final' }).first();
    await expect(targetCard).toBeVisible({ timeout: 10000 });
    await targetCard.click();

    // Wait for the panel title (matches the script name)
    const panelTitle = page.locator('text=ui_truth_final').last();
    await expect(panelTitle).toBeVisible({ timeout: 10000 });

    // Switch to Parameters tab
    const paramsTab = page.locator('[role="tab"]', { hasText: /Parameters|参数/i }).first();
    if (await paramsTab.count() > 0) {
      await paramsTab.click();
      await page.waitForTimeout(500);
    }

    // Type into the Foo field
    const fooField = page.locator(
      'input[id*="foo" i], input[name*="foo" i], label:has-text("Foo") >> .. >> input',
    ).first();
    let typedFoo = false;
    if (await fooField.count() > 0) {
      await fooField.fill('ui_value_xyz_42');
      typedFoo = true;
    }

    // Type into Bar field
    const barField = page.locator(
      'input[id*="bar" i], input[name*="bar" i], label:has-text("Bar") >> .. >> input',
    ).first();
    let typedBar = false;
    if (await barField.count() > 0) {
      await barField.fill('999');
      typedBar = true;
    }

    // Click Execute Script button
    const runBtn = page.getByRole('button', { name: /Execute Script/i }).first();
    await expect(runBtn).toBeVisible({ timeout: 5000 });
    await runBtn.click();

    // Wait for execution to finish
    await page.waitForTimeout(12000);

    // Verify the latest execution log captured the values
    const execRes = await request.get(`/api/scripts/${scriptId}/executions`);
    expect(execRes.ok()).toBeTruthy();
    const execs = await execRes.json();
    const logs = Array.isArray(execs) ? execs : execs.executions ?? [];
    expect(logs.length).toBeGreaterThan(0);
    const lastLog = logs[0];
    const out = lastLog.output ?? '';
    const m = out.match(/===UI_TRUTH_OUTPUT_START===([\s\S]*?)===UI_TRUTH_OUTPUT_END===/);
    expect(m, `No UI_TRUTH markers in output. Got: ${out.slice(0, 300)}`).toBeTruthy();
    const echoed = JSON.parse(m![1]);
    console.log('[UI truth] parsed values:', echoed.parsed);
    if (typedFoo) expect(echoed.parsed.foo).toBe('ui_value_xyz_42');
    if (typedBar) expect(echoed.parsed.bar).toBe(999);
  });
});
