# Script Manager

一个本地 Python 脚本管理平台 —— 把散落在 `~/upload/`、`~/projects/scripts/` 里的各种零散 Python 工具集中管理,带分类、参数化执行、执行日志记录。

![Script Manager](screenshot-final.png) <!-- 如果有截图 -->

## 背景

随着项目积累,本地 `~/upload/`、`/Users/lijing/Projects/*/upload/` 目录下堆积了几十个 Python 脚本(图像处理、CDR 提取、epitope 可视化、加比例尺、PDB 分析……)。每个脚本:

- 📁 散落各处,找不到
- 📝 重复写 argparse,改参数麻烦
- 📊 跑完没日志,失败了不知道错哪
- 🗂 没有分类,工具型 / 数据处理型 / 一次性脚本混在一起

**Script Manager** 就是为这个场景做的:
- 把脚本录入数据库(支持批量从指定目录导入)
- 配参数模板(自动从脚本 argparse 提取 + 手动指定)
- 一键执行,实时显示输出
- 历史执行日志可查
- 分类筛选 + 全文搜索

## 功能特性

- **脚本 CRUD**:录入、编辑、删除、批量导入目录
- **分类管理**:每个脚本打 category 标签,左侧栏筛选
- **参数化执行**:JSON schema 定义参数,前端表单动态生成输入框
- **实时执行**:Stream-style 实时回显 stdout/stderr,支持超时
- **执行日志**:每次执行保存参数、输出、错误、耗时
- **AI 分析** (可选):用 Claude Code CLI 或 zai 自动识别脚本功能 + 生成参数 schema
- **LLM 配置**:支持多套 API key / 模型配置切换

## 技术栈

- **框架**: [Next.js 16.2](https://nextjs.org) (App Router, Turbopack)
- **UI**: React 19 + shadcn/ui (基于 @base-ui/react) + Tailwind CSS 4
- **数据库**: Prisma 7 + better-sqlite3 (本地嵌入式 SQLite)
- **包管理**: bun
- **Python 运行时**: 系统 Python 3(脚本通过 `python3 script.py` 派生子进程执行)

## 快速开始

### 1. 克隆 & 安装

```bash
git clone https://github.com/Jing0715-fer/script-manager.git
cd script-manager
bun install
```

### 2. 初始化数据库

```bash
bunx prisma db push
bunx prisma generate
```

数据库默认 `db/custom.db`(`./prisma/schema.prisma` 里 `datasource db` 引用)。`.env` 里:

```bash
DATABASE_URL=file:./db/custom.db
```

### 3. 启动开发服务器

```bash
bun run dev
# → http://localhost:3003
```

### 4. 生产模式

```bash
bun run build
bun run start
# → http://localhost:3003 (production)
```

### 5. 批量导入已有脚本

打开 dashboard → 进入 `seed` API 路由或用 UI:

```bash
# 一次性把 /Users/lijing/Projects/script-manager/upload 里的所有 .py 录入
curl -X POST http://localhost:3003/api/seed \
  -H "Content-Type: application/json" \
  -d '{"directory":"/Users/lijing/Projects/script-manager/upload","category":"auto"}'
```

## API 一览

| 路径 | 方法 | 用途 |
|---|---|---|
| `/api/scripts` | GET / POST | 脚本列表 / 新建脚本 |
| `/api/scripts/[id]` | GET / PUT / DELETE | 脚本详情 / 编辑 / 删除 |
| `/api/execute` | POST | 执行脚本,返回 execution log id |
| `/api/seed` | POST | 从指定目录批量导入脚本 |
| `/api/seed-local` | POST | 从默认目录导入 |
| `/api/llm-config` | GET / POST | LLM 配置列表 / 新建 |
| `/api/llm-config/[id]` | GET / PUT / DELETE | LLM 配置详情 / 编辑 / 删除 |
| `/api/ai/analyze-script` | POST | AI 智能分析脚本功能并生成参数 schema |

## 数据模型 (Prisma Schema)

```prisma
model Script {
  id          String   @id @default(cuid())
  name        String
  description String   @default("")
  filename    String   @unique
  content     String
  category    String   @default("Uncategorized")
  language    String   @default("python")
  source      String   @default("manual")
  sourceUrl   String?
  params      String   @default("[]")  // JSON schema
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  executions  ExecutionLog[]
}

model ExecutionLog {
  id        String   @id @default(cuid())
  scriptId  String
  script    Script   @relation(...)
  params    String   @default("{}")
  output    String   @default("")
  error     String   @default("")
  status    String   @default("pending")  // pending/running/success/failed
  duration  Int      @default(0)  // ms
  createdAt DateTime @default(now())
}

model LlmConfig {
  id        String   @id @default(cuid())
  ...
}
```

## 目录结构

```
script-manager/
├── prisma/                # Prisma schema & migrations
├── public/                # 静态资源
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # API 路由
│   │   └── ...            # 页面
│   ├── components/        # React 组件
│   │   └── ui/            # shadcn/ui 基础组件
│   ├── lib/               # 业务逻辑
│   ├── store/             # Zustand 状态
│   └── generated/prisma/  # Prisma 7 生成的 client(在 .gitignore)
├── upload/                # 待导入的 Python 脚本示例
│   ├── highlight_cdr_auto.py
│   ├── find_cdr_of_fab.py
│   ├── add_scalebar.py
│   └── ...
├── db/                    # SQLite 数据库(在 .gitignore)
├── start-dev.sh           # 启动开发服务器(端口 3003)
├── start-server.js        # Node 包装器,用于 launchd 等场景
├── .env                   # 环境变量(在 .gitignore)
└── package.json
```

## 已收录脚本示例

`upload/` 目录下有真实使用过的 Python 工具(都是图像处理 / 结构生物学相关):

- `add_scalebar.py` — 给图像添加比例尺
- `find_cdr_of_fab.py` — 寻找抗体 Fab 片段的 CDR 区
- `highlight_cdr_auto.py` — 自动高亮 CDR 区
- `epitope_visualizer.py` — 表位可视化
- `H_bond_interface_plan.py` — 蛋白质界面氢键平面分析

## 已知限制

- **仅 Python 3**:目前只支持 Python 脚本;扩展其他语言(JS、R)需要改 `lib/executor.ts`
- **进程隔离**:脚本运行在 dashboard 子进程,无沙箱隔离;生产环境建议用 Docker 包装
- **并发执行**:同时执行多个脚本会 fork 多个 Python 进程,无并发限制(用 ulimit 控制)

## License

MIT
