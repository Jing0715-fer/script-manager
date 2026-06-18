# Script Manager - Comprehensive Code Review & E2E Audit

**Date:** 2026-06-14
**Reviewer:** OpenClaw automated audit
**Project version:** 0.2.0 (Next.js 16.1.3, React 19, Prisma 6, Bun runtime)
**Dev server:** http://localhost:3002 (Turbopack)
**Test base URL:** http://localhost:3002

---

## Executive Summary

| Category | Status | Details |
|---|---|---|
| **Build & TypeScript** | 🟡 Partial | 8 type errors in 2 files (CodeHighlighter, ScriptDetailPanel) — mostly missing @types and prop mismatches |
| **Security** | 🟡 Mostly OK | P1 path traversal in `/api/files/download` already fixed; remaining minor issues (see below) |
| **Code Quality** | 🟡 Mixed | One file (`seed-local/route.ts`) uses `// @ts-nocheck` bypassing 516 lines of type checking |
| **Platform Portability** | 🔴 Broken on macOS | `seed-local/route.ts` hardcodes `/home/z/my-project/local-scripts` (Linux path) — will fail on this machine |
| **E2E Coverage** | 🟢 14/14 passing | Existing smoke tests pass; gaps remain in execute flow, error paths, and UI dialogs |
| **Runtime** | 🟢 Good | Dev server boots in 893ms, 42 scripts loaded, UI renders fully |

**Overall:** Production-ready for personal use, needs cleanup before team distribution.

---

## 1. TypeScript Compilation Errors

Running `npx tsc --noEmit` reports **8 errors** in 2 files:

### 1.1 `src/components/CodeHighlighter.tsx` (6 errors)
```
TS7016: Could not find a declaration file for module 'react-syntax-highlighter'
TS7016: Could not find a declaration file for 'react-syntax-highlighter/dist/cjs/styles/prism'
TS2769: No overload matches this call (Prism component has no `children` prop in types)
```

**Fix:** Install missing types and use proper component API:
```bash
bun add -d @types/react-syntax-highlighter
```
Or refactor to use the default export (`Prism as any`) and cast.

### 1.2 `src/components/ScriptDetailPanel.tsx` (1 error)
```
TS2554: Expected 1-2 arguments, but got 3.
```
Line 281 — function called with 3 args but signature accepts 1-2. Likely a refactor leftover.

**Severity:** P3 (non-blocking; typecheck in next.config.ts is set to `ignoreBuildErrors: true`).

---

## 2. Security Audit

### 2.1 ✅ Fixed (was P1 in earlier review)
- `/api/files/download/route.ts` line 18: now uses `resolve(UPLOAD_DIR)` prefix check
- `execute/route.ts` line 215-220: input files path-validated against UPLOAD_DIR

### 2.2 ⚠️ Remaining Issues

#### P2: `/api/files/[id]/route.ts` — id parameter not validated
```typescript
const targetFile = files.find(f => f.startsWith(id));           // line 24
const resultFile = files.find(f => f.includes(id));             // line 28
```
The `id` comes directly from URL params with no sanitization. Although the search is `startsWith`/`includes` (not a path traversal), the `id` could match **multiple** files unintentionally (e.g. empty `id` matches everything).

**Risk:** Low (local-only deployment), but a malicious or buggy client could enumerate or request the wrong file.

**Fix:**
```typescript
const { id } = await params;
if (!id || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
  return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
}
```

#### P3: `/api/files/upload/route.ts` — file size not limited
`req.formData()` is read fully into memory via `arrayBuffer()`. A multi-GB upload would OOM the Node process.

**Fix:** Add `maxBodyLength` to the route or check `file.size` before buffering.

#### P3: `seed-local/route.ts` — `@ts-nocheck` masks 516 lines
The entire file disables TypeScript. Likely contains untyped DB queries, missing await, or unsafe `any` casts. Won't show in `tsc --noEmit`.

**Fix:** Remove `@ts-nocheck`, fix the errors, or refactor to a `// @ts-expect-error` per-line.

---

## 3. Platform Portability (macOS)

### 🔴 Blocking: `seed-local/route.ts` line 4
```typescript
const LOCAL_SCRIPTS_DIR = '/home/z/my-project/local-scripts';
```
Hardcoded **Linux** path. On macOS, `/home/z/...` does not exist; the route will throw `ENOENT` if hit.

**Impact:** Seed route (used to populate DB on first run) does not work on macOS. However, **the DB already has 42 scripts** seeded by the previous Linux session, so the app works as-is. New devs on macOS will hit this.

**Fix options:**
1. Read from `.env` (e.g. `SCRIPT_MANAGER_LOCAL_SCRIPTS_DIR`)
2. Detect platform and resolve relative to user home
3. Convert to dynamic upload flow instead of fixed path

---

## 4. Code Quality Findings

### 4.1 API Routes - Consistent Shape ✅
All routes use the same response pattern: `{ data, error }` with proper status codes. Good error messages. Prisma query options use a structured `where + select` pattern.

### 4.2 Component Layer - Good Patterns ✅
- `HomePageContent.tsx` follows clean Zustand store pattern
- `useKeyboardShortcuts` hook with memoized handler map
- `ScriptDetailPanel` uses framer-motion for tab transitions
- `Sidebar` shows category counts dynamically from store

### 4.3 Type Safety - Mixed ⚠️
- Most files use proper TypeScript
- `seed-local/route.ts` is the main offender
- Some `any` casts in `lib/api-client.ts` (response normalization) — acceptable as boundary code

### 4.4 `package.json` Issues
```json
"start": "NODE_OPTIONS=--max-old-space-size=512 next dev -p 3002 --turbopack"
```
`start` script runs `next dev`, not `next start`. For production:
```json
"start": "NODE_OPTIONS=--max-old-space-size=512 next start -p 3002"
```
Currently production deploys will use HMR/dev mode (slower, leaks devtools).

**Fix:** Add `next build` step and use `next start`.

---

## 5. E2E Test Coverage Analysis

### ✅ Existing (smoke.spec.ts — 14 tests)

| Area | Tests | Status |
|---|---|---|
| API contract validation | 5 | ✅ Pass |
| UI flows (page load, card click, tabs) | 5 | ✅ Pass |
| Security (path traversal) | 2 | ✅ Pass |
| Data consistency | 2 | ✅ Pass |

### ❌ Gaps (no test coverage)

1. **Script CRUD lifecycle** — create → read → update → delete
2. **Execute flow** — POST `/api/execute` with python script, verify stdout/stderr/resultFiles
3. **Error paths** — invalid JSON, oversized payload, missing fields
4. **Search & filter** — `/api/scripts?category=X&limit=10&offset=0`
5. **File upload** — POST multipart with valid + malicious filenames
6. **Executions API** — list, delete, export CSV
7. **LLM config** — POST/PUT/DELETE `/api/llm-config/*`
8. **External apps** — CRUD `/api/external-apps/*`
9. **Tags** — GET `/api/tags`
10. **Templates** — GET `/api/templates`

### Recommended additional tests (see tests/e2e/comprehensive.spec.ts)

---

## 6. Recommendations (Priority Order)

| # | Priority | Action | Effort |
|---|---|---|---|
| 1 | 🔴 P0 | Fix `seed-local/route.ts` to be macOS-portable (env var) | 15 min |
| 2 | 🟡 P1 | Add `react-syntax-highlighter` types | 5 min |
| 3 | 🟡 P1 | Remove `@ts-nocheck` from seed-local | 30 min |
| 4 | 🟡 P2 | Validate `id` in `/api/files/[id]/route.ts` | 10 min |
| 5 | 🟡 P2 | Add file upload size limit | 15 min |
| 6 | 🟢 P3 | Fix `package.json` `start` script to use `next start` | 5 min |
| 7 | 🟢 P3 | Add comprehensive E2E tests (see below) | 2 hr |
| 8 | 🟢 P3 | Fix ScriptDetailPanel line 281 type error | 5 min |

---

## 7. Detailed File Scores

| File | Lines | Security | Quality | Notes |
|---|---|---|---|---|
| `api/execute/route.ts` | 408 | ✅ Good | ✅ Good | Path validation, no shell injection |
| `api/scripts/route.ts` | 175 | ✅ Good | ✅ Good | Input length validation |
| `api/files/download/route.ts` | 35 | ✅ Good | ✅ Good | P1 fix verified |
| `api/files/[id]/route.ts` | 56 | ⚠️ Minor | ✅ OK | id needs validation |
| `api/files/upload/route.ts` | 53 | ⚠️ Size | ✅ OK | No max body size |
| `api/seed-local/route.ts` | 516 | 🔴 Path | ⚠️ `@ts-nocheck` | Hardcoded Linux path |
| `api/executions/route.ts` | 210 | ✅ Good | ✅ Good | DELETE validates id |
| `store/script-store.ts` | 355 | n/a | ✅ Good | Clean Zustand pattern |
| `components/ScriptDetailPanel.tsx` | 700+ | ✅ Good | ⚠️ TS error | Type issue line 281 |
| `components/CodeHighlighter.tsx` | 80 | n/a | ⚠️ Missing types | 6 errors |
| `components/HomePageContent.tsx` | 800+ | n/a | ✅ Good | Clean composition |
