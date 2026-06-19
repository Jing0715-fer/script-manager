#!/usr/bin/env bun
/**
 * prisma/seed.ts
 *
 * Upsert scripts from prisma/seed-scripts.json into the Prisma-managed DB.
 * Invoked by `bun run db:seed` and by `bunx prisma db seed` (via package.json
 * `prisma.seed` field).
 *
 * Strategy:
 * - filename is unique; upsert on filename
 * - skip if existing content is identical (cheap no-op)
 * - skip ExecutionLog / LlmConfig / ScriptVersion / ExternalApp / ScriptExternalApp
 *   (those are user-private and start empty)
 */

import { PrismaClient } from "../src/generated/prisma/client.js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SEED_PATH = resolve(ROOT, "prisma/seed-scripts.json");

if (!existsSync(SEED_PATH)) {
  console.error(
    `✗ Missing ${SEED_PATH}\n` +
      `  Run \`bun run scripts/extract-seed.ts\` first (or \`bun run db:seed\`, which chains it).`
  );
  process.exit(1);
}

type Seed = {
  schemaVersion: number;
  generatedAt: string;
  count: number;
  scripts: Array<{
    name: string;
    description: string;
    filename: string;
    content: string;
    category: string;
    language: string;
    source: string;
    sourceUrl: string | null;
    params: string;
    inputFiles: string;
    outputFiles: string;
    tags: string | null;
    rating: number | null;
    notes: string | null;
  }>;
};

const seed: Seed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
if (seed.schemaVersion !== 1) {
  console.error(
    `✗ Unsupported seed schemaVersion=${seed.schemaVersion}; this seeder expects 1.`
  );
  process.exit(1);
}

const prisma = new PrismaClient();

let created = 0;
let updated = 0;
let unchanged = 0;
let skipped = 0;

for (const s of seed.scripts) {
  const existing = await prisma.script.findUnique({
    where: { filename: s.filename },
  });

  if (!existing) {
    await prisma.script.create({
      data: {
        name: s.name,
        description: s.description,
        filename: s.filename,
        content: s.content,
        category: s.category,
        language: s.language,
        source: s.source,
        sourceUrl: s.sourceUrl,
        params: s.params,
        inputFiles: s.inputFiles,
        outputFiles: s.outputFiles,
        tags: s.tags,
        rating: s.rating,
        notes: s.notes,
      },
    });
    created++;
    continue;
  }

  // Skip if nothing material changed (skip updatedAt drift).
  const sameContent = existing.content === s.content;
  const sameMeta =
    existing.name === s.name &&
    existing.description === s.description &&
    existing.category === s.category &&
    existing.language === s.language &&
    existing.source === s.source &&
    existing.sourceUrl === s.sourceUrl &&
    existing.params === s.params &&
    existing.inputFiles === s.inputFiles &&
    existing.outputFiles === s.outputFiles &&
    existing.tags === s.tags &&
    existing.rating === s.rating &&
    existing.notes === s.notes;

  if (sameContent && sameMeta) {
    unchanged++;
    continue;
  }

  // If content drifted, snapshot a ScriptVersion row before overwriting.
  if (!sameContent) {
    const lineCount = s.content.split("\n").length;
    await prisma.scriptVersion.create({
      data: {
        scriptId: existing.id,
        content: existing.content,
        lineCount: existing.content.split("\n").length,
        message: `auto-snapshot before seed update (${existing.content.length} → ${s.content.length} bytes)`,
      },
    });
  }

  await prisma.script.update({
    where: { id: existing.id },
    data: {
      name: s.name,
      description: s.description,
      content: s.content,
      category: s.category,
      language: s.language,
      source: s.source,
      sourceUrl: s.sourceUrl,
      params: s.params,
      inputFiles: s.inputFiles,
      outputFiles: s.outputFiles,
      tags: s.tags,
      rating: s.rating,
      notes: s.notes,
    },
  });
  updated++;
}

console.log(
  `✓ Seed complete: ${seed.scripts.length} scripts processed ` +
    `(created=${created}, updated=${updated}, unchanged=${unchanged}, skipped=${skipped})`
);

await prisma.$disconnect();
