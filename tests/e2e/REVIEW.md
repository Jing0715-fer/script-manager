# Code Review: Execution Result Files & History Delete

**Commit:** `1e877f9` — `feat(execution): result file download, delete history, file download API`
**Reviewer:** OWL
**Date:** 2026-06-13

---

## 1. 文件变更清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/app/api/executions/route.ts` | 修改 | 加 DELETE handler |
| `src/app/api/files/download/route.ts` | **新建** | 文件下载 API |
| `src/components/ScriptDetailPanel.tsx` | 修改 | History Tab 加删除+resultFiles 下载，Parameters Tab 加 resultFiles 下载，去掉 Overview 下载按钮 |
| `src/components/tabs/HistoryTab.tsx` | 修改 | 加 resultFiles 下载按钮 |
| `src/lib/api-client.ts` | 修改 | 加 deleteExecution，executeScript 返回类型更新 |
| `src/store/script-store.ts` | 修改 | 加 deleteExecution、lastResultFiles |
| `src/types/index.ts` | 修改 | ExecutionLog 加 resultFiles 字段 |

---

## 2. 代码审查

### 2.1 ✅ 做得好的

- **后端已有 resultFiles 收集逻辑**：`/api/execute/route.ts` 第 338-360 行已自动收集脚本输出文件并存入 `resultFiles` 字段，UI 层现在完整接入了
- **删除时清理磁盘文件**：DELETE handler 解析 `resultFiles` JSON 后逐个 `unlink`，防止孤儿文件
- **文件下载 API 有路径验证**：使用 `UPLOAD_DIR` 前缀拼接，`existsSync` 检查文件存在性
- **TypeScript 类型完整**：`ExecutionLog`、`HistoryEntry`、Store 状态都加了 `resultFiles` 字段
- **Playwright E2E 测试覆盖**：14 个测试全部通过，涵盖 API 契约、UI 交互、安全、数据一致性

### 2.2 ⚠️ 需要注意

| # | 严重度 | 文件 | 问题 | 建议 |
|---|--------|------|------|------|
| 1 | P1 | `api/files/download/route.ts` | **路径遍历漏洞**：`filePath` 直接拼入 `join(UPLOAD_DIR, filePath)` 后只检查 `existsSync`，没有验证解析后的路径是否在 `UPLOAD_DIR` 内。攻击者可用 `../../etc/passwd` 绕过 | 加 `resolve(fullPath).startsWith(resolve(UPLOAD_DIR))` 检查 |
| 2 | P2 | `ScriptDetailPanel.tsx` | **重复代码**：下载文件的 `<a>` 标签创建逻辑在 3 处重复（History Tab 内联、Parameters Tab、HistoryTab 组件） | 提取为 `downloadFile(path, name)` 工具函数 |
| 3 | P2 | `ScriptDetailPanel.tsx` | **`<div />` 占位符**：去掉 Overview 下载按钮后用 `<div />` 占位，应直接移除整个元素 | 删除 `<div />`，调整 flex 布局 |
| 4 | P3 | `store/script-store.ts` | **`deleteExecution` 调用 `loadScripts()`**：删除执行记录后重新加载全部脚本列表，只是为了更新 `runCount`，成本较高 | 可只更新本地 `scripts` 中的 `runCount`，或接受此 trade-off |
| 5 | P3 | `HistoryTab.tsx` | **未使用组件**：`HistoryTab` 组件已更新但 `ScriptDetailPanel` 的 History Tab 是内联的，两者不同步 | 考虑统一为使用 `HistoryTab` 组件 |
| 6 | P3 | `api/executions/route.ts` | **DELETE 用 query param**：`DELETE /api/executions?id=xxx` 不符合 RESTful 惯例（应为 `/api/executions/:id`），但 Next.js App Router 不支持动态路由+DELETE 同名文件 | 可接受，但建议后续改为 `[id]/route.ts` |

### 2.3 🔴 必须修复

**P1: 文件下载路径遍历**

```typescript
// 当前代码（有漏洞）：
const fullPath = join(UPLOAD_DIR, filePath);
if (!existsSync(fullPath)) { ... }

// 修复后：
const fullPath = resolve(join(UPLOAD_DIR, filePath));
if (!fullPath.startsWith(resolve(UPLOAD_DIR))) {
  return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
}
if (!existsSync(fullPath)) {
  return NextResponse.json({ error: 'File not found' }, { status: 404 });
}
```

---

## 3. E2E 测试结果

```
Running 14 tests using 1 worker

  ✓ GET /api/scripts returns params/inputFiles/outputFiles as arrays
  ✓ GET /api/scripts/[id]/executions returns resultFiles field
  ✓ DELETE /api/executions?id= returns 200 or 404
  ✓ GET /api/files/download returns 400 without path
  ✓ GET /api/files/download returns 404 for missing file
  ✓ Page loads and shows script list
  ✓ Clicking a script card opens detail panel with Overview tab
  ✓ Detail panel shows Overview tab by default
  ✓ Detail panel has Code, Parameters, History tabs
  ✓ Close detail panel with X button
  ✓ DELETE execution validates id parameter
  ✓ File download validates path traversal
  ✓ All scripts with params have valid JSON in params field
  ✓ Scripts with resultFiles show file metadata correctly

14 passed (8.7s)
```

---

## 4. 总结

功能实现完整，后端逻辑复用已有代码，UI 交互流畅。**唯一必须修复的是 P1 路径遍历漏洞**。P2/P3 项可作为后续 tech debt 处理。
