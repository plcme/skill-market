# SETUP — 账号、密钥与人工核实

> 需要人类身份才能做的事：开账号、填密钥、核实条款、买域名。由用户与 Codex 维护；主会话在每个里程碑开始前读它，判断前置条件是否满足。
> 只记录资源名称和状态，**不记录任何密钥值**。密钥只写进 `.env.local`（已在 `.gitignore`）；`.env.example` 只写变量名。
> 2026-10-23 由 `SETUP_CHECKLIST.md`（操作步骤）与 `SETUP_STATUS.md`（状态）合并而来。

## 状态

| § | 服务 | 状态 | 资源名称 / 标识 | 免费额度与限制 | 备注 |
|---|---|---|---|---|---|
| 1 | GitHub | 🟨 部分完成（2026-09-22） | `plcme/skill-market`（private） | Actions 每月约 2000 分钟 | `main` / `dev` 已推送；`main` 分支保护待设置 |
| 2 | Supabase | 🟨 本地通过；云端待接入 | 云端 `skill-market`（Sydney）；本地数据库在 Windows 开发机 | 2 个项目、500MB DB、1GB 存储、5 万 MAU；闲置 7 天暂停 | 还需第二个项目 `skill-market-dev`；CLI 云端未登录 |
| 3 | Vercel | 🟨 已关联 GitHub | `skill-market` / `skill-market-two.vercel.app` | Hobby，**不允许商用** | 已加 Next.js / syd1 部署配置 |
| 4 | Resend | ⬜ 未开始 | | 每月 3000 封、每天 100 封、1 个域名 | M3 前 |
| 5 | Google OAuth | ⬜ 未开始 | | 免费；Testing 最多 100 个测试用户 | M3 前 |
| 6 | 数据来源许可核实 | ⬜ 未开始 | | | M1 前核 JSA；上线前核各家 ATS |

## 规则（给 Codex）

- 遇到需要人工的步骤（注册、验证码、2FA、网页授权、粘贴密钥），停下并说明去哪个页面点哪里
- 只修改本文件、`.env.example`、`.gitignore`、git 与平台配置；不改 `docs/` 其他文件、`CLAUDE.md`、`.claude/`
- 免费额度与条款以官网为准，与本文不符时更新本文

## §1 GitHub

- [x] 仓库、`main` / `dev` 分支
- [ ] `main` 分支保护：禁止 force push、禁止删除

## §2 Supabase

- [x] 云端项目 `skill-market`，region **ap-southeast-2 (Sydney)**
- [ ] 第二个项目 `skill-market-dev`（Sydney），给 preview 用
- [ ] `supabase login`、`supabase link`；`.env.local` 填入 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_DB_PASSWORD`，验证连通（只输出成功 / 失败）
- [ ] Supabase Vault 写入 `jobs_url`、`jobs_secret`（M1，implementer 给出 SQL）

## §3 Vercel

- [x] 关联 GitHub，Production = `main`，`dev` 与 PR 生成 preview
- [ ] Supabase 变量加到 Preview 与 Production 环境

## §4 Resend

- [ ] 注册并生成 API key；`.env.example` 加 `RESEND_API_KEY`、`EMAIL_FROM`
- [ ] 开发阶段用 `onboarding@resend.dev`（只能发到注册邮箱）

## §5 Google 登录

- [ ] Google Cloud 新建项目 → OAuth consent screen（External；scope 只要 `openid`、`email`、`profile`）→ OAuth Client ID（Web）
- [ ] Redirect URI：`https://<project-ref>.supabase.co/auth/v1/callback`；在 Supabase Auth → Providers → Google 填入

## §6 数据来源许可核实

第一版数据来源（2026-10-23 已定）：**技能级只用 Greenhouse、Lever、Ashby 的公开职位接口，岗位级与覆盖率校准用 JSA IVI**。这三家接口公开、无需注册或 key，但官方文档里**没有明文许可**（核实结果见架构 §6.2）。不接 Adzuna、Workday；不抓 LinkedIn、SEEK、Indeed。依据见 `docs/research/data-sources.md`。

M1 前：

- [ ] JSA Internet Vacancy Index：下载地址、更新频率、数据集许可（预期 CC BY 4.0）、署名文本
- [ ] Australian Skills Classification：同上（NERO、Skills Priority List 第一版不接）
- [ ] ABS（ANZSCO）：许可与署名

商业化前（由用户本人发出，主会话可代拟草稿）：

- [ ] 邮件给 Greenhouse、Lever、Ashby 的合作或法务邮箱：说明用途是面向学生的聚合统计、不转载原文、链接回雇主，请求书面同意
- [ ] 邮件给 JSA：确认 IVI 数据集能否商用、署名怎么写
- [ ] 请澳洲律师审查数据来源、版权与隐私

以后再加的来源：Workable、SmartRecruiters、Recruitee（先核条款）；PageUp、SuccessFactors 是否有公开接口；APSJobs 与各州政府职位板；付费数据合作（Adzuna、Indeed、Employment Hero 等），有客户后由用户去谈。

每项记录：频率限制、署名要求、**能否商用**；拿不准的标"待人工确认"。

## §7 上线前（M8）

- [x] 域名：`brewdex.app`（2026-10-23 已买；产品名已确定为 Brewdex）
- [ ] 联系邮箱（如 `data@brewdex.app`），写进 `ATS_USER_AGENT` 与 `/bot` 页面
- [ ] Resend 域名 DNS（SPF / DKIM），Supabase Auth SMTP 改用 Resend
- [ ] Google consent screen 从 Testing 切到 Production（需要自有域名上的首页与隐私政策）
- [ ] Vercel Hobby 不允许商用：升 Pro 或迁 Cloudflare
- [ ] 免费拨测账号（UptimeRobot 类），健康检查兼防 Supabase 闲置暂停
- [ ] Sentry（若决定接）

暂不做：LinkedIn 登录（需要公司主页）、PostHog、Stripe（开始收费时再开，需要 ABN）。
