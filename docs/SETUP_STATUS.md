# SETUP_STATUS

> 由用户与 Codex 维护。主会话（Fable）在每个里程碑开始前读取本文件，判断前置条件是否满足。
> 只记录资源名称和状态，**不记录任何密钥值**。

| # | 服务 | 状态 | 资源名称 / 标识 | 完成时间 | 免费额度与限制 | 备注 |
|---|---|---|---|---|---|---|
| 1 | GitHub | 🟨 部分完成 | `plcme/skill-market` (private) | 2026-09-22 | GitHub Free | 已创建并推送 `main` / `dev`；`main` 分支保护待设置 |
| 2 | Supabase | 🟨 本地验证通过；云端接入待完成 | 本地 `skill-market`；截图确认 Sydney 云端 `skill-market` | 2026-09-22 | 云端免费档（用户截图） | 本地 13 项 RLS 测试与真实健康检查通过；CLI 云端未登录，开发项目与云端变量未验证 |
| 3 | Vercel | 🟨 已关联 GitHub，预览验收中 | `skill-market` / `skill-market-two.vercel.app` | 2026-09-22 | Hobby（用户截图） | 作者识别已修复；构建成功后发现原平台配置仍按静态站点，已添加 Next.js / syd1 部署配置；最终结果见 PR #1 checks |
| 4 | Resend | ⬜ 未开始 | | | | |
| 5 | Google OAuth | ⬜ 未开始 | | | | |
| 6 | 数据源（JSA / ABS / Adzuna） | ⬜ 未开始 | | | | |

## 环境变量（仅名称）

见 `.env.example`。

## 待办

- [ ] 域名（上线前）
- [ ] Resend 域名 DNS 验证 + Supabase SMTP 切换（买域名后）
- [ ] Google consent screen 切 Production（有域名与隐私政策后）
- [ ] Vercel Hobby 不允许商用 → 商用前迁移或升级
