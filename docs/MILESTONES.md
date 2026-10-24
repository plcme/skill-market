# MILESTONES — skill-market

| 项 | 内容 |
|---|---|
| 状态 | v0.1 — 阶段 1 产出，待产品负责人确认 |
| 依据 | `docs/PRD.md` §5 范围、§7 FR、`docs/ARCHITECTURE.md` |
| 维护方 | 主会话 |

> 每个里程碑都产出可运行、可演示的增量，且验收命令能在本地一条命令跑通。规模：S ≈ 半天、M ≈ 1–2 天、L ≈ 2–4 天（以 implementer 子 agent 的连续工作计）。里程碑分支 `m{n}-<slug>`，从 `main` 切出，经 PR 合入 `main`（仅集成；经用户授权推送 `v*` tag 才上线）。**MVP 上线点在 M8 之后。**

## 总览

| # | 名称 | 规模 | 主要 FR | 需要人类先完成 |
|---|---|---|---|---|
| M0 | 仓库、CI、基础设施接入 | S | NFR-5/10/11 | SETUP §1 §2 §3 |
| M1 | 数据基础：分类、采集（ATS 公开 API + JSA IVI）、抽取、指标、覆盖率、信号、任务运行时 | L | D1–D7, X3 | SETUP §6（JSA 许可） |
| M2 | 公开盘面：ticker card、指标切换、规则筛选、对比 | L | M1–M6, F1–F5, D2–D5 | — |
| M3 | 账号、onboarding、技能画像、watchlist | M | A1–A3, A8, O1–O6, W1–W3, F6 | SETUP §4 §5 |
| M4 | 缺口诊断、隐私控制、账号删除与导出、法律页 | M | G1–G3, A4–A6, C11(模型) | — |
| M5 | 从业者侧：注册、工作邮箱验证、时段、审核队列 | M | P1–P6, X2 | — |
| M6 | 匹配与咖啡聊全流程：候选、请求、状态机、超时、邮件、提醒、出席 | L | C1–C10, R2, W4(信号提醒) | SETUP §4（Resend 可发到测试邮箱） |
| M7 | 复盘、举报屏蔽、管理后台、可靠度、安全加固 | M | R1, A7, X1, X4, C10 | — |
| M8 | 上线准备：域名、生产配置、可观测性、性能与无障碍审计、runbook、供给门 | M | NFR-1/3/7/8 | SETUP §7 全部 + 新增（域名、Sentry、拨测、Vercel 商用决定） |

**当前所处位置（2026-10-23）**：M0 本地完成；之后先做了七轮前端原型迭代（FE-R1 到 FE-R7，见 `docs/PROGRESS.md`），M2–M7 的界面大多已有原型，数据来自合成引擎与浏览器内演示后端。接真实数据时从 M1 开始（ATS 公开 API + JSA IVI），再把原型逐页接到 Supabase。

依赖链：M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8。M4 与 M5 互不依赖，可以对调；M5 可在 M3 后立即开始。

---

## M0 — 仓库、CI、基础设施接入（S）

**目标**：一个能在本地、CI、Vercel preview 三处跑通的空壳应用，带完整工具链与质量门。

**覆盖 FR**：NFR-5、NFR-10、NFR-11；FR-A8（i18n 骨架）。

**范围内**
- Next.js 16 + TypeScript strict + pnpm + Tailwind v4 + shadcn/ui 初始化；`output: 'standalone'`
**需要人类完成**：SETUP §1 GitHub、§2 Supabase（两个项目：`skill-market`、`skill-market-dev`，均 Sydney）、§3 Vercel；把 §2 的变量填入 `.env.local` 与 Vercel 环境；新增 `APP_NAME`、`NEXT_PUBLIC_APP_URL`、`JOBS_SECRET` 到 `.env.example`（见 PROGRESS.md）。
