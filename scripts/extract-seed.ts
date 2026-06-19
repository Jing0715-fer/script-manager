#!/usr/bin/env bun
/**
 * scripts/extract-seed.ts
 *
 * Read all Script rows from db/custom.db (source='github' only) and write
 * them to prisma/seed-scripts.json so the public repo can be cloned and
 * bootstrapped with `bun run db:seed`.
 *
 * - Reads:  db/custom.db (gitignored)
 * - Writes: prisma/seed-scripts.json (committed)
 * - Excludes ExecutionLog / LlmConfig / ScriptVersion (private/runtime)
 * - Excludes source='manual' (李京's personal scripts stay private)
 */

import { Database } from "bun:sqlite";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const DB_PATH = process.env.SEED_SOURCE_DB ?? resolve(ROOT, "db/custom.db");
const OUT_PATH = resolve(ROOT, "prisma/seed-scripts.json");

type ScriptRow = {
  id: string;
  name: string;
  description: string;
  filename: string;
  content: string;
  category: string;
  language: string;
  source: string;
  sourceUrl: string | null;
  params: string; // JSON string
  inputFiles: string; // JSON string
  outputFiles: string; // JSON string
  tags: string | null;
  rating: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const db = new Database(DB_PATH, { readonly: true });

// Only ship source='github' (公开仓源) + 'manual' with explicit flag.
// 李京的 manual 脚本是私人的 → 默认排除；想包含可用 INCLUDE_MANUAL=1
const includeManual = process.env.INCLUDE_MANUAL === "1";
const whereClause = includeManual ? "" : "WHERE source != 'manual'";

const rows = db
  .query<ScriptRow, []>(
    `SELECT id, name, description, filename, content, category, language,
            source, sourceUrl, params, inputFiles, outputFiles, tags,
            rating, notes, createdAt, updatedAt
       FROM Script
       ${whereClause}
       ORDER BY category, filename`
  )
  .all();

const seed = {
  // schemaVersion bumped on breaking changes; seed.ts asserts match
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  count: rows.length,
  scripts: rows.map((r) => ({
    name: r.name,
    description: r.description,
    filename: r.filename,
    content: r.content,
    category: r.category,
    language: r.language,
    source: r.source,
    sourceUrl: r.sourceUrl,
    params: r.params,
    inputFiles: r.inputFiles,
    outputFiles: r.outputFiles,
    tags: r.tags,
    rating: r.rating,
    notes: r.notes,
  })),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(seed, null, 2) + "\n", "utf8");

const breakdown = rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.language] = (acc[r.language] ?? 0) + 1;
  return acc;
}, {});

console.log(
  `✓ Extracted ${rows.length} scripts → ${OUT_PATH.replace(ROOT + "/", "")}`
);
console.log(`  Languages: ${JSON.stringify(breakdown)}`);
