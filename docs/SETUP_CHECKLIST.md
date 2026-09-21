# 基础设施开通清单（全部免费档）— 给 Codex 执行

项目路径：`~/Desktop/code/skill-market/`
技术栈（已定）：Next.js + Supabase + Vercel + Resend + GitHub Actions

## 规则

- 任何密钥只写进 `.env.local`（已在 `.gitignore`），绝不提交、绝不打印到输出
- `.env.example` 只写变量名和注释，不写值
- 每完成一项，在 `docs/SETUP_STATUS.md` 勾选并记录：完成时间、资源名称、免费额度与限制
- 遇到需要人工的步骤（注册、验证码、2FA、网页授权、粘贴密钥），停下并告诉我具体去哪个页面点哪里
- **只允许修改**：`docs/SETUP_STATUS.md`、`.env.example`、`.gitignore`、git 与平台配置。**不要修改** `docs/` 下其他文件和 `CLAUDE.md`、`.claude/`（另一个 agent 正在写架构文档）
- 执行前对照各服务官网核实下面的免费额度与条款；与本清单不符的，以官网为准并记录到 SETUP_STATUS.md

## 1. GitHub（代码托管 + CI）

人工：注册/登录 GitHub，开启 2FA；终端运行 `gh auth login`

Codex：
- [ ] `git init -b main`（`.gitignore` 已存在，检查即可）；首次 commit 现有文件
- [ ] 创建 `dev` 分支
- [ ] `gh repo create skill-market --private --source=. --push`，并 push `dev`
- [ ] `main` 分支保护：禁止 force push、禁止删除

验收：`gh repo view` 显示 private；远端有 `main` 与 `dev`
免费额度：私有仓库 Actions 每月约 2000 分钟

## 2. Supabase（数据库 + Auth + Storage）

人工：用 GitHub 登录 supabase.com；终端运行 `supabase login`

Codex：
- [ ] 创建项目 `skill-market`，region 选 **ap-southeast-2 (Sydney)**；数据库密码随机生成，只写入 `.env.local`
- [ ] `supabase init`，`supabase link --project-ref <ref>`
- [ ] `.env.example` 写入：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_DB_PASSWORD`
- [ ] 我把真实值填进 `.env.local` 后，验证连通性（只输出成功/失败）

验收：`supabase projects list` 显示已 link
免费额度：2 个项目、500MB 数据库、1GB 存储、5 万 MAU；**闲置 7 天会被暂停**（后台可恢复）

## 3. Vercel（前端托管）

人工：用 GitHub 登录 vercel.com（选 Hobby）；终端运行 `vercel login`

Codex：
- [ ] `vercel link` 关联 GitHub 仓库，framework 选 Next.js
- [ ] Production branch 设为 `main`；`dev` 与 PR 生成 preview
- [ ] 把 Supabase 的变量加到 Preview 与 Production 环境（`vercel env add`，值由我手动粘贴）

验收：`vercel ls` 能看到项目
注意：**Hobby 不允许商用**，正式商用前需迁移或升级。在 SETUP_STATUS.md 记为待办

## 4. Resend（发邮件）

人工：注册 resend.com，生成 API key

Codex：
- [ ] `.env.example` 加 `RESEND_API_KEY`、`EMAIL_FROM`
- [ ] 开发阶段使用 `onboarding@resend.dev`（只能发到注册 Resend 的邮箱）
- [ ] SETUP_STATUS.md 记待办：买域名后添加 DNS 记录（SPF/DKIM），并把 Supabase Auth 的 SMTP 改成 Resend

免费额度：每月 3000 封、每天 100 封、1 个域名

## 5. Google 登录

人工：console.cloud.google.com 新建项目 → OAuth consent screen（External；scope 只要 `openid`、`email`、`profile`）→ 创建 OAuth Client ID（Web application）

Codex：
- [ ] 给出 Authorized redirect URI：`https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] 指导我在 Supabase 后台 Auth → Providers → Google 填入 Client ID 与 Secret
- [ ] SETUP_STATUS.md 记待办：正式发布前需要自有域名上的首页与隐私政策 URL，并把 consent screen 从 Testing 切到 Production

免费；Testing 状态最多 100 个测试用户

## 6. 劳动力市场数据

- [ ] JSA（Jobs and Skills Australia）：确认 Internet Vacancy Index / NERO、Skills Priority List 的下载地址、更新频率、许可（预期 CC BY 4.0），记入 SETUP_STATUS.md
- [ ] ABS Data API：确认是否需要 key、endpoint、许可
- [ ] Adzuna：人工在 developer.adzuna.com 注册，拿到 app_id 与 app_key；`.env.example` 加 `ADZUNA_APP_ID`、`ADZUNA_APP_KEY`
- [ ] 用一次请求测试 Adzuna AU 接口（只输出 HTTP 状态码与结果条数）
- [ ] 记录每个数据源的频率限制、署名要求、**能否商用**；拿不准的标"待人工确认"

## 7. 暂不做（记入 SETUP_STATUS.md 待办）

- 域名（唯一付费项，上线前买；产品名未定）
- LinkedIn 登录（需要公司主页）
- Sentry、PostHog（免费档，上线前开）
- Stripe（开始收费时再开，需要 ABN）
