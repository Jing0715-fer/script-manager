# 2026-06-08 升级合并工作日志

## 任务
将另一台设备上 AI 迭代后的 `script-manager` 代码(从 tar 归档)合并到本机的 `script-manager` 项目。

## 升级策略
C+A 组合:
- **C**: 在 `main` 之外创建 `upgrade-from-tar-2026-06-08` 分支操作
- **A**: 全量替换 `src/`(99 个新文件 / 4 个旧组件被替代)

## 操作步骤

### 1. 分支准备
```bash
git checkout -b upgrade-from-tar-2026-06-08
```

### 2. 同步内容
| 来源 | 操作 | 原因 |
|------|------|------|
| `tar/src/` → `script-manager/src/` | 全量替换 | 99 个新文件 / 大量功能 |
| `tar/prisma/schema.prisma` → `prisma/schema.prisma` | 覆盖 | schema 演进,加了 tags/rating/notes 等字段 |
| `tar/package.json` → `package.json` | 覆盖 | 同步新依赖 |
| `tar/bun.lock` → `bun.lock` | 覆盖 | 同步 lockfile |
| `tar/public/*` → `public/*` | 增量 | 新增 favicon.svg/logo.svg/robots.txt |
| **`tar/.env`** | **不覆盖** | 另一台设备 Linux 路径 (`/home/z/...`),本机保留 macOS 路径 |
| **`db/custom.db`** | **不覆盖** | 保留本机数据 |
| **`src/app/favicon.ico`** | `git checkout HEAD --` 恢复 | TAR 缺这个,本地有 |

### 3. 依赖 & 数据库
```bash
bun install             # 561 包安装, 5.56s
bun run db:generate     # Prisma client 生成到 src/generated/prisma
bun run db:push         # 关键! schema 升级后数据库也要同步
```

### 4. 验证
- `bun run dev` 启动在 3015 端口(3000/3001 被 web-dashboard 进程占用)
- 首次编译 77s(Google Fonts 网络不通,使用 fallback,不影响功能)
- 后续请求 < 50ms
- API 健康检查: /api/scripts, /api/llm-config, /api/tags, /api/executions, /api/external-apps **全部 200 OK**

## 验证时踩的坑

### 1. Google Fonts 无法下载
`next/font/google` 试图拉 Geist/Geist Mono 字体,网络失败。Next 用了 fallback 字体,功能正常,但首次启动会慢。

### 2. 3000 端口冲突
本机 `web-dashboard` 长期占了 3000 和 3001 端口(PID 17204, 从 Friday 9PM 起)。
直接 curl 3000/3001 会拿到 web-dashboard 的 HTML,不是 script-manager。
**必须用其他端口**(3015)测试。

### 3. 数据库 schema 不同步
TAR 里的 schema 加了 `tags`, `rating`, `notes`, `versions`, `externalApps` 字段。
本地 db 没有这些列,API 直接 500。
解决:`bun run db:push` 一行命令搞定。

## 改动统计
- 总改动文件: **120**
- 新增文件: **77**
- 删除文件: **4**(被新组件替代)
  - `LLMSettingsDialog.tsx` → `LLMConfigDialogSimple.tsx`
  - `ScriptExecutionPanel.tsx` → `ExecPanel.tsx`
  - `ScriptList.tsx` → `HomePageContent.tsx`
  - `UploadScriptDialog.tsx` → `UploadDialogSimple.tsx`
- 修改文件: ~36

## 已知遗留问题(非阻塞)
- ~~42 个 TypeScript 类型错误(分布在 21 个文件)~~ ✅ **已全部修复 (2026-06-08 后续)**
  - 修复范围: 21 个文件全部清理
  - 类型策略: 加 `as any` / `as AccentTheme` 等小转换、扩展类型 union、补齐隐式 `any` 参数类型、重写错误 `Set<string>` 排序逻辑
  - 验证: `npx tsc --noEmit` 0 错误

## 端口调整
- 端口从 3000 改为 **3003**(避免与 web-dashboard 冲突)
- 修改文件: `package.json` (3 处) + `src/app/api/test-all/route.ts` (1 处)
- 验证: `bun run dev` 启动在 3003 端口,首页 HTTP 200

## 当前状态
- 分支: `upgrade-from-tar-2026-06-08`
- 工作树 121 个未提交改动(+1 工作日志)
- dev 服务已停,数据库已同步,Prisma client 已生成
- TS 类型: 0 错误
- 端口: 3003
- 需要用户测试后决定是否 `git add -A && git commit && merge to main`

## 下一步建议
```bash
cd /Users/lijing/Projects/script-manager
# 1. 启动测试
bun run dev
# 2. 浏览器打开 http://localhost:3003
# 3. 确认功能 OK 后:
git add -A
git commit -m "feat: upgrade from tar (99 new files, 4 component replacements, port to 3003)"
git checkout main && git merge upgrade-from-tar-2026-06-08
```
