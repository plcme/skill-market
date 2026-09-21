# SETUP_STATUS

> 由用户与 Codex 维护。主会话（Fable）在每个里程碑开始前读取本文件，判断前置条件是否满足。
> 只记录资源名称和状态，**不记录任何密钥值**。

| # | 服务 | 状态 | 资源名称 / 标识 | 完成时间 | 免费额度与限制 | 备注 |
|---|---|---|---|---|---|---|
| 1 | GitHub | 🟨 部分完成 | `plcme/skill-market` (private) | 2026-09-22 | GitHub Free | 已创建并推送 `main` / `dev`；`main` 分支保护待设置 |
| 2 | Supabase | ⬜ 未开始 | | | | |
| 3 | Vercel | ⬜ 未开始 | | | | |
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
