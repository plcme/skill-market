# PROGRESS

> 进度账本。会话中断或上下文被压缩后，从这里恢复。由主会话维护。

## 当前状态

- 阶段：1 — 架构完成，**等待用户确认**后进入阶段 2
- 当前里程碑：—（下一步 M0，前置：SETUP_CHECKLIST §1 §2 §3）
- 累计估算花费：AUD ≈ 3 / 150（阶段 1 仅主会话阅读与写文档；未派子 agent）

## 里程碑

| 里程碑 | 状态 | 审查轮次 | 估算花费 | 备注 |
|---|---|---|---|---|
| M0 仓库、CI、基础设施接入 | 待开始 | — | 预估 6–10 | 前置：GitHub、Supabase（2 项目）、Vercel |
| M1 数据基础 | 待开始 | — | 预估 20–28 | 前置：Adzuna key、JSA 许可确认、Vault 密钥 |
| M2 公开盘面 | 待开始 | — | 预估 20–28 | |
| M3 账号、onboarding、watchlist | 待开始 | — | 预估 12–16 | 前置：Resend、Google OAuth |
| M4 缺口诊断、隐私、法律页 | 待开始 | — | 预估 10–14 | |
| M5 从业者侧 | 待开始 | — | 预估 12–16 | 可与 M4 对调 |
| M6 匹配与咖啡聊 | 待开始 | — | 预估 22–30 | |
| M7 复盘、举报、后台、加固 | 待开始 | — | 预估 10–14 | |
| M8 上线准备（MVP 上线点） | 待开始 | — | 预估 10–14 | 前置：域名、DNS、Google Production、拨测、Vercel 商用决定 |
| 合计 | | | **122–170** | 未校准；M0/M1 后按实际用量修正 |

预算检查点：AUD 50（预计在 M2 中）、AUD 100（预计在 M5–M6）、**AUD 120 停下**（预计在 M6–M7）。

## 待拍板

| # | 问题 | 提出方 | 建议 | 状态 |
|---|---|---|---|---|
| 1 | 产品名（PRD Q1） | PRD | 先用 `APP_NAME=skill-market`；M8 买域名前定 | 待定（不阻塞 M0–M7） |
| 2 | Adzuna 商用与存储条款（PRD Q6） | PRD / 架构 §6.2 | 按"派生字段长期、原文 30 天"实现；若条款禁止存储则原文 0 天 | **阻塞 M1**，由 Codex 在 SETUP §6 核实 |
| 3 | 错误监控接 Sentry（EU，PII scrub）还是不接 | 架构 §12 #19 | 接 | 待定（M8 前） |
| 4 | 备份强度：每日 schema+公共数据 artifact、每周全量加密 dump 到 Storage | 架构 §12 #20 | 接受 | 待定（M8 前） |
| 5 | Vercel Hobby 禁止商用：上线前升 Pro（USD 20/月）还是迁 Cloudflare Workers（免费） | 架构 §11 | 先在 Hobby 完成 M0–M8 开发与内测；上线决定时再选；架构保证零改动 | 待定（M8） |
| 6 | 预算：估算 AUD 122–170 到 MVP 上线，AUD 150 余量很小 | 架构 / 里程碑 | M0、M1 完成后用实际用量校准；若超出，可把 M7 的 admin 看板（X4）与 M4 的 G3 推到上线后 | **需在 M0 前知悉** |
| 7 | 架构对 PRD 的调整（技能级信号用 `change_4w`、`no_pr_required_share` 定义、从业者时段模型、18+ 只勾选、不做密码登录、MVP 不接 LLM、供给门开关） | 架构 §1 与 §12 | 默认执行 | 待用户否决或默认通过 |
| 8 | 需要新增的环境变量：`NEXT_PUBLIC_APP_NAME`（建议替换现有 `APP_NAME`）、`NEXT_PUBLIC_APP_URL`、`JOBS_SECRET`、`ADZUNA_DAILY_CALL_BUDGET`、`ADZUNA_CATEGORY`、`MIN_SAMPLE_N`、`SENTRY_DSN`（若接） | 架构附录 B | 由用户 / Codex 写入 `.env.example` | 待办（M0 前至少前三个） |
| 9 | 新增人类事项：Supabase 需要**两个**项目（prod + dev）；Supabase Vault 写入 `jobs_url` / `jobs_secret`；免费拨测账号（UptimeRobot 类）用于健康检查与防闲置暂停 | 架构 §3.3 §5.4 §8.3 | 加入 SETUP_CHECKLIST | 待办 |
| 10 | 其余 PRD Q2/Q3/Q4/Q5/Q7/Q8 | PRD | 按 PRD 建议默认执行（见架构 §12） | 默认通过 |

## 日志

- 2026-09-19：项目初始化。PRD v0.1、CLAUDE.md、implementer / reviewer 子 agent、基础设施清单就绪。
- 2026-09-19：阶段 1 完成。产出 `docs/ARCHITECTURE.md`（技术选型、9 张 Mermaid 图、数据模型、RLS 矩阵、任务调度、数据策略、匹配与状态机、安全隐私、测试、CI/CD、免费档分析、26 条假设与待拍板）与 `docs/MILESTONES.md`（M0–M8 到 MVP 上线，M9–M17 上线后）。等待用户确认架构后进入阶段 2。
