# 模特工作室（.MTM）

与主站共享 **CloudBase 登录**、**Gemini**（`/api/gemini`、`/api/gemini-text`）。生成图保存走 **`/api/mtm-modelcard-upload`** → COS 目录 **`MODELCARD/`**（文件名 `00000.png` 起递增）。不在浏览器内放置 Gemini API Key。

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

1. **终端 A（仓库根目录）**：启动带 Serverless API 的开发服务（需加载根目录 `.env` / `.env.local` 中的 `GEMINI_API_KEY`、`COS_*` 等）。例如已关联 Vercel 时：

   ```bash
   npx vercel dev --listen 3000
   ```

2. **终端 B（本目录）**：

   ```bash
   cp .env.example .env.local
   # 填写 VITE_CLOUDBASE_ENV_ID、VITE_CLOUDBASE_ACCESS_KEY（与根目录一致）
   npm install
   npm run dev
   ```

Vite 将 **`/api` 代理到 `http://127.0.0.1:3000`**。若主站 API 使用其它端口，请修改 `vite.config.ts` 中的 `server.proxy['/api'].target`。

浏览器访问控制台打印的地址（默认 **5174**）。

## 根目录快捷命令

在仓库根目录执行：`npm run dev:mtm` 仅启动本应用（仍需另开终端启动 API）。
