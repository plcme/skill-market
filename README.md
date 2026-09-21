# skill-market

M0：Next.js 应用、Supabase 本地数据库与质量检查基础。产品名称继续使用 `APP_NAME`，未改名。

## 本地启动

使用 Node.js 22（`.nvmrc`）和 pnpm 10.32.1。先启动 Docker Desktop。

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm db:start
pnpm db:reset
pnpm types:gen
pnpm dev
```

打开 `http://localhost:3000`。无需云端账号即可查看首页。数据库未配置时 `/api/health` 返回 503；配置并连接正常后返回 200。

把 `.env.example` 复制为 `.env.local`，从本地 Supabase 状态中填写 URL 与匿名/发布密钥。真实密钥只存本地文件或平台机密变量，不提交、不发送到聊天。Supabase 默认端口为 API 54321、数据库 54322、Studio 54323、邮件收件箱 54324。`db:reset` **只重建本项目的本地数据库**，会清除其中的测试数据。

```sh
pnpm verify
pnpm exec playwright install chromium
pnpm test:e2e
```

`verify` 包含代码检查、类型检查、单元测试、数据库权限测试和生产构建；E2E 使用生产构建，在 375px 与 1280px 下检查首页与无障碍。只开发界面时可先运行 `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build`，但这不能替代数据库验收。

## 云端接入

- Vercel 导入仓库后构建命令为 `pnpm build`，框架 Next.js，Node.js 22。`main` 为 Production，其余分支为 Preview。未填写 Supabase 变量时仍可预览首页。
- Preview 只连接 Sydney 开发项目；Production 只连接 Sydney 生产项目。
- Supabase GitHub 直连不是必要条件，迁移由 `.github/workflows/migrate.yml` 管理。不要同时启用两条自动迁移路径。
- 在 GitHub 创建 `development` 与 `production` environments，各填 `SUPABASE_ACCESS_TOKEN`、`SUPABASE_PROJECT_ID`、`SUPABASE_DB_PASSWORD`。先确认 production 的人工审批限制实际可用；如果当前私有仓库套餐不支持，保持手动生产部署，不把手动触发等同于审批保护。
- 完成配置后，设置仓库变量 `ENABLE_DATABASE_MIGRATIONS=true`。此前迁移任务跳过，不触碰云数据库。开发迁移在 `dev` 上触发；生产迁移只允许从 `main` 手动触发，发布前需用户批准。
- `main` 保护建议：禁止强推/删除、要求 CI 和人工审查；`dev` 要求 CI。平台套餐若不支持，应如实记录，不能声称保护已生效。

## 边界与来源

本阶段只创建 `profiles` 业务表。认证用户可读本人资料及修改普通字段；`is_admin`、用户 ID、删除标记等由列权限保护，用户元数据不会用于授予管理员权限。管理员函数使用固定空 `search_path`。服务端高权限客户端带 `server-only` 标记。

本地配置关闭 M0 不使用的 Realtime、Edge Runtime 和 Analytics，减少内存占用。`pg_cron` 与 `pg_net` 通过 SQL migration 启用，而不是虚构 `config.toml` 扩展字段。首页使用系统字体，构建不依赖外部字体下载。

Supabase 客户端与 session 刷新遵循 [官方 SSR 指南](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)。UI 基础采用 [shadcn/ui](https://ui.shadcn.com/) 的本地组件方式、Radix Slot 与 Tailwind CSS；M0 没有业务表单或市场页面。

后续 M1 先使用合成测试数据；Adzuna/JSA/ABS 许可核实后再决定真实采集与保存策略。
