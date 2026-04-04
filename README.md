# 模特工作室（.MTM）

独立应用：内置 **Vercel Serverless**（本目录 **`api/`**：`/api/gemini`、`/api/gemini-text`、`/api/mtm-modelcard-upload`）。**Gemini 密钥只放在服务端**（Vercel 环境变量或本地 `vercel dev` 读取的 `.env.local`），不要写进前端构建。

生成图保存走 **`/api/mtm-modelcard-upload`** → 腾讯云 COS **`MODELCARD/`**（`00000.png` 起递增序号）。

## 云数据库（HMRS + MODELFILE）

| 集合 | 作用 |
|------|------|
| **HMRS** | 用户档案，文档 ID 建议与 `uid` 一致；字段含 `modelImageUrls`（COS 地址列表，新图在前） |
| **MODELFILE** | 每次生成一条记录：`seq`、`cosUrl`、`keywords`、`uid`、`createdAt`、`isPublic` |

注册/登录成功后会 **`ensureHmrsProfile`** 建立 HMRS 空档案（与 `user_profiles` 并行，供主站昵称等能力）。

**Personal**：从 HMRS 的 `modelImageUrls` 随机抽两张展示，悬停文案来自 MODELFILE 中同 `cosUrl` 的 `keywords`。  
**Global**：`MODELFILE` 中 `isPublic: true`（排除本人）。

### 安全规则示例（可按控制台语法微调）

**HMRS**（仅本人读写，文档 `_id`/字段 `uid` 与 `auth.uid` 一致）：

```json
{
  "read": "doc.uid == auth.uid",
  "create": "auth != null && request.data.uid == auth.uid",
  "update": "auth.uid == doc.uid",
  "delete": "auth.uid == doc.uid"
}
```

**MODELFILE**（本人写；读本人 + 公开记录）：

```json
{
  "read": "doc.uid == auth.uid || doc.isPublic == true",
  "create": "auth != null && request.data.uid == auth.uid",
  "update": "auth.uid == doc.uid",
  "delete": "auth.uid == doc.uid"
}
```

查询请配合 Web 端 **`where({ uid: '{uid}' })`** 等模板，与安全规则子集一致。

历史面板对 HMRS 使用 **`.watch()`**；失败时退化为定时拉取。

## 本地运行

1. **终端 A（本目录 `.MTM`）**：启动 Serverless 本地服务（读取本目录 `.env.local` 中的 `GEMINI_API_KEY`、`COS_*` 等；需已 `npm install`、可选 `vercel link`）：

   ```bash
   npm run dev:api
   ```

   等价于 `vercel dev --listen 127.0.0.1:3000`。

2. **终端 B（本目录）**：

   ```bash
   cp .env.example .env.local
   # 填写 GEMINI_API_KEY、COS_*、VITE_CLOUDBASE_* 等
   npm install
   npm run dev
   ```

Vite 将 **`/api` 代理到 `http://127.0.0.1:3000`**。改端口时请同步修改 `vite.config.ts` 里 `server.proxy['/api'].target`。

浏览器默认 **5174**。

## 部署（Vercel，仅本应用仓库 / Root Directory = `.MTM`）

本目录已包含 **`api/`**，与静态构建 **同源** 提供 `/api/*`，无需依赖其它项目。

| 设置 | 建议值 |
|------|--------|
| Root Directory | `.MTM`（或 MDRS 仓库若整仓即本应用则 `.`） |
| Framework | Vite（或 Other + `npm run build`） |
| Output | `dist`（Vite 默认） |
| 环境变量（Production） | `GEMINI_API_KEY`（或 `GOOGLE_API_KEY`）、`COS_SECRET_ID`、`COS_SECRET_KEY`、`COS_BUCKET`、`COS_REGION`；以及构建期 `VITE_CLOUDBASE_*` 等 |

部署后可用浏览器访问：`https://你的域名/api/gemini` — GET 应返回 **405 + JSON**（非 Vercel HTML 404），表示路由已挂上。

**可选**：若故意把前端与 API 拆到两个域名，再在构建环境变量中设 `VITE_API_BASE_URL`（无尾斜杠）。

## 与 NFTT 主仓库同仓开发时

若本目录仍位于 NFTT 大仓库的 `.MTM` 子路径：部署 **MDRS 等独立仓**时，请把 **`.MTM` 下** 的 `api/`、`lib/api-cors.ts` 一并纳入版本库并推送到该仓；Vercel **Root Directory** 指向包含 `package.json` 与 `api/` 的应用根即可。
