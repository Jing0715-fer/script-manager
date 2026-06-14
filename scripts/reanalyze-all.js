#!/usr/bin/env node
/**
 * Batch re-analyze all scripts with Hermes LLM.
 * Usage: node scripts/reanalyze-all.js
 */
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'reanalyze-progress.txt');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

const http = require('http');
const BASE = 'http://localhost:3002';

function fetchJSON(pathname, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  log('Starting batch re-analysis...');

  let scripts;
  try {
    const scriptsData = await fetchJSON('/api/scripts');
    scripts = scriptsData.scripts || [];
    log(`Found ${scripts.length} scripts`);
  } catch (e) {
    log('FATAL: could not fetch scripts: ' + e.message);
    return;
  }

  let success = 0, failed = 0, skipped = 0;

  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    const s = (v) => (typeof v === 'string' ? v : '');
    const hasDesc = script.description && script.description.length > 20;
    const hasParams = s(script.params) !== '' && s(script.params) !== '[]';
    const hasInputFiles = s(script.inputFiles) !== '' && s(script.inputFiles) !== '[]';
    const hasOutputFiles = s(script.outputFiles) !== '' && s(script.outputFiles) !== '[]';

    if (hasDesc && hasParams && hasInputFiles && hasOutputFiles) {
      skipped++;
      log(`  [${i+1}/${scripts.length}] SKIP: ${script.name}`);
      continue;
    }

    // Fetch full content
    let content;
    try {
      const full = await fetchJSON('/api/scripts/' + script.id);
      content = full.content || (full.script && full.script.content);
    } catch (e) {
      log(`  [${i+1}/${scripts.length}] SKIP (no content): ${script.name} — ${e.message}`);
      skipped++;
      continue;
    }

    log(`  [${i+1}/${scripts.length}] Analyzing (${content.length.toLocaleString()} chars): ${script.name}`);

    let res;
    try {
      res = await fetchJSON('/api/ai/analyze-script', 'POST', {
        content,
        filename: script.filename || script.name,
      });
    } catch (e) {
      log(`  [${i+1}/${scripts.length}] FAIL (network): ${script.name} — ${e.message}`);
      failed++;
      continue;
    }

    if (res.error) {
      log(`  [${i+1}/${scripts.length}] FAIL (API): ${script.name} — ${res.error}`);
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
      try {
        await fetchJSON('/api/scripts/' + script.id, 'PUT', updatePayload);
        success++;
        log(`  [${i+1}/${scripts.length}] OK: ${script.name} — ${Object.keys(updatePayload).join(', ')}`);
      } catch (e) {
        log(`  [${i+1}/${scripts.length}] FAIL (update): ${script.name} — ${e.message}`);
        failed++;
      }
    } else {
      skipped++;
      log(`  [${i+1}/${scripts.length}] SKIP (no new data): ${script.name}`);
    }
  }

  log(`=== TOTAL: ${success} updated, ${failed} failed, ${skipped} skipped ===`);
}

run().catch((e) => log('FATAL: ' + e.message + '\n' + e.stack));
