#!/usr/bin/env node
/**
 * Batch re-analyze all scripts with Hermes LLM.
 * Usage: node scripts/reanalyze-all.js
 */
const http = require('http');

const BASE = 'http://localhost:3002';

function fetchJSON(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Get all scripts
  const scriptsData = await fetchJSON('/api/scripts?excludeContent=false');
  const scripts = scriptsData.scripts || [];
  console.log(`Found ${scripts.length} scripts`);

  let success = 0, failed = 0, skipped = 0;

  for (const script of scripts) {
    const hasDesc = script.description && script.description.length > 20;
    const hasParams = script.params && script.params !== '[]';
    if (hasDesc && hasParams) {
      skipped++;
      console.log(`  SKIP (already analyzed): ${script.name}`);
      continue;
    }

    try {
      const res = await fetchJSON('/api/ai/analyze-script', 'POST', {
        content: script.content,
        filename: script.filename || script.name,
      });

      if (res.error) {
        console.log(`  FAIL: ${script.name} — ${res.error}`);
        failed++;
        continue;
      }

      const a = res.analysis || {};
      const updatePayload = {};
      if (a.description && !hasDesc) updatePayload.description = a.description;
      if (a.parameters && a.parameters.length > 0) updatePayload.params = JSON.stringify(a.parameters);
      if (a.inputFiles && a.inputFiles.length > 0) updatePayload.inputFiles = JSON.stringify(a.inputFiles);
      if (a.outputFiles && a.outputFiles.length > 0) updatePayload.outputFiles = JSON.stringify(a.outputFiles);

      if (Object.keys(updatePayload).length > 0) {
        await fetchJSON(`/api/scripts/${script.id}`, 'PUT', updatePayload);
        success++;
        console.log(`  OK: ${script.name} — updated: ${Object.keys(updatePayload).join(', ')}`);
      } else {
        skipped++;
        console.log(`  SKIP (no new data): ${script.name}`);
      }
    } catch (e) {
      console.log(`  ERROR: ${script.name} — ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} updated, ${failed} failed, ${skipped} skipped`);
}

main().catch(console.error);
