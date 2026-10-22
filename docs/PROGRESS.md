# PROGRESS

> 进度账本。会话中断或上下文被压缩后，从这里恢复。由主会话维护。
> 结构：当前状态 → 里程碑 → 待拍板（只列还开着的）→ 上 main 前必须做 → 前端反馈轮次 → 日志。

## 当前状态（2026-10-23）

- M0 本地完成（云端接入未完成，见 `docs/SETUP.md`）。之后一直在做前端原型迭代：FE-R1 到 FE-R7 已全部合并 `dev` 并 push，`main` 未更新。
- 前端是完整可交互原型：市场数字来自合成引擎，用户数据存浏览器 localStorage，**没有接 Supabase**。
- **数据来源已定（2026-10-23）**：第一版技能级只用 Greenhouse、Lever、Ashby 的公开职位接口，岗位级与覆盖率校准用 JSA IVI；不接 Adzuna、Workday。三家接口和 IVI 都**没有明文许可**，商业化前要拿到书面答复并请律师看（`docs/SETUP.md` §6）。
- 采集节奏：指标每天结算；每小时轻量检查新职位，按雇主活跃度（泊松速率 λ）调频；盘中喂行情条与"今日新增"；每个数据面标出 "Updated today, 2:14 am"（架构 §6.7、`DESIGN.md` §8）。
- 域名已买：`brewdex.app`。
- 本机限制：Mac 跑不动全量数据库，数据库与 pgTAP 测试走 Windows 桥接（见 CLAUDE.md "本机开发环境"）。
- 下一步：继续前端反馈轮次，或开始 M1 接真实数据，由用户决定。

## 里程碑

| 里程碑 | 状态 | 备注 |
|---|---|---|
| M0 仓库、CI、基础设施接入 | 本地完成；云端待接入 | 草稿 PR：https://github.com/plcme/skill-market/pull/1 |
| M1 数据基础 | 待开始 | 前置：`docs/SETUP.md` §6 JSA 许可、§2 Vault |
| M2–M7 | 原型已有，未接后端 | 界面在 FE-R1 到 R7 中做出，接后端时逐页替换演示数据 |
| M8 上线准备 | 待开始 | 前置：`docs/SETUP.md` §7 |

## 待拍板（还开着的）

| # | 问题 | 建议 / 现状 | 何时需要 |
|---|---|---|---|
| 1 | 产品名（PRD Q1）：域名已是 `brewdex.app`，产品名是否就叫 Brewdex | 先用 `APP_NAME=skill-market` | M8 前 |
| 2 | 错误监控接不接 Sentry（EU，PII scrub） | 接 | M8 前 |
| 3 | 备份强度：每日 schema + 公共数据 artifact，每周全量加密 dump | 接受 | M8 前 |
| 4 | Vercel Hobby 禁止商用：升 Pro（USD 20/月）还是迁 Cloudflare Workers | 开发期留在 Hobby，上线时再选 | M8 |
| 5 | 非 tech 行业（建筑、零售、护理）ATS 覆盖率低：带覆盖说明上线，还是等中小企业来源谈成再开放 | 带说明上线 | M2 上线前 |
| 6 | 新增环境变量：`NEXT_PUBLIC_APP_URL`（`https://brewdex.app`）、`ATS_USER_AGENT`（需要一个联系邮箱）、`MIN_SAMPLE_N`、`SENTRY_DSN`（若接）；`JOBS_SECRET` 已有 | 由用户 / Codex 写入 `.env.example` | M1 前 |
| 7 | skill 的 Median salary 默认不按 Experience 拆开，可能被读成"学了就能拿" | 单独给 salary 默认拆分，或加提示 | 前端下一轮 |
| 8 | Watching 是否包含 held（I have this / Worked in this role） | 目前包含 | 前端下一轮 |
| 9 | onboarding 里是否让学生设默认口径（entry-level / No PR），作用于行情表 | — | 前端下一轮 |
| 10 | role 的 12-month change 大数字来自官方序列，图是 Job ads，口径不一致 | 接真实数据后再定 | M1 / M2 |
| 11 | watchlist "加入以来变化"改用 Demand 原始计数后会混入全市场涨落；旧 `share_of_ads` watch 条目需迁移并重置 baseline | 接后端时处理 | M3 |
| 12 | 细分行业颗粒度：ANZSIC Subdivision 还是 Group | — | 前端下一轮 |
| 13 | 未排期的产品想法：首页标语与开场动画；LinkedIn 证书导入；Twitter 书签式交互；对比页超过 2 个标的 | — | 用户提出时 |

已决定、不再列出：数据来源（→ Greenhouse / Lever / Ashby + IVI；付费数据合作等有客户后由用户去谈）；采集节奏与更新时间格式；信号检验改用泊松（接真实数据后）；架构对 PRD 的调整（默认通过）；master level = 10 年以上（界面叫 Expert）；skill 显示 Median salary（PRD 已改）；详情页默认不拆分；No PR stated 时 Work rights 拆分置灰；Watching 放在最前；行情条去掉暂停键。

## 上 main 前必须做

- [ ] e2e 同步并全量跑通：`frontend.spec.ts`（:90、:103–121、:196）、`round2.spec.ts`（:35–58）、`detail-chart.spec.ts`、`responsive.spec.ts`；FE-R4 起改过的 e2e 都没跑过
- [ ] `eslint.config.mjs` 的 `globalIgnores` 加入 `.claude/worktrees/**`（否则 `eslint .` 会扫进 worktree）
- [ ] 清理已合并分支：`fe-r4-cleanup`、`fe-r5`、`fe-r6`、`fe-r7`
- [ ] 用户确认后才合并 `main`

已知遗留（非阻断）：全部分档低于阈值时 thin 文案与画面不符（`breakdown-section.tsx:92`）；localStorage 禁用时主题手动选择不生效；单档低于阈值可被总量反推；`/sources` 仍用 `bg-signal-soft`；Watching 数量缺读屏说明；名称搜索时数量与列表不一致；整张 All 表传给客户端（接 Supabase 后改服务端过滤）；Sign in 链接丢筛选参数；375px 标签行可横滑但无提示；标题句子可能自相矛盾；被固定的 `by` 参数在 URL 中清不掉。

## 前端反馈轮次

| 轮 | 日期 | 分支 | 内容 | 审查 |
|---|---|---|---|---|
| R1 | 09-26 | `fe-feedback-r1`、`fe-industry`、`fe-responsive` | GLOSSARY；导航只留 Market / People；Demand / Job ads 命名；industry 标的与 `/i/[slug]`；375 / 768 适配；付费方中立防火墙文案 | A 退回 1 次后过；B、C2 一轮过 |
| R2 | 10-15 | `fe-r2` | DESIGN.md v1；来源文案中性化；ASC 技能分层；地点筛选 + 全澳 remote；breakdown 原型 | 退回 1 次（series 色对比度）后过 |
| R3 | 10-21 | `fe-r3-chart`、`fe-r3-colours` | 详情页单图（标题 "SQL in [All Australia ▾]"、Y axis、Split by）；配色、单色 logo、首页短标语 | chart 退回 1 次后过；colours 用户要求直接合并 |
| R4 | 10-22 | `fe-r4-cleanup` | 去掉多处页头与说明区块；Filter 面板重排；"标题即 filter"；只做澳洲 | 退回 1 次（触屏停不了轮播、e2e 断言）后过 |
| R5 | 10-22 | `fe-r5` | `?metric=` 同时驱动 Right now 与大图；Statistics；单色技能 logo；头像与 My desk 合并；"Worked in this role"；文案批注 11 条 | 3 轮（R3 后一行修复未复审） |
| R6 | 10-22 | `fe-r6` | 详情页默认不拆分；No PR stated 时 Work rights 置灰；Watching 标签 | 一轮过 |
| R7 | 10-22 | `fe-r7` | 行情表去掉 Filter 与 `?f=`；去掉 "MEASURE" 字样 | 退回 1 次（面包屑与搜索页链接带 `f`）后过 |

每轮的细节见 `docs/reviews/FE-R*.md` 与 git log。

## 日志（新的在上）

- 2026-10-23：核实 ATS 与 JSA 条款（三家 ATS 官方文档无明文许可也无禁止；Workday 无公开接口；IVI 许可未注明），第一版来源收窄；写入采集节奏、轻量检查、按活跃度调频、泊松信号、行情条盘中层、"Updated" 时间格式、`/bot` 页；记录域名 `brewdex.app`。

- 2026-10-23：文档整理。删除 `product-working-doc-original.md`、`FRONTEND_V2_BRIEF.md` 和本地 `coda-feedback/`；`SETUP_CHECKLIST.md` + `SETUP_STATUS.md` 合并为 `docs/SETUP.md`；去掉预算跟踪；数据来源定为 ATS 公开 API + JSA IVI 并同步 PRD / 架构 / 里程碑 / 术语表；架构 §4 路由表同步到 FE-R7；`FRONTEND_API_REPORT.md` 标为 FE-R2 快照；Windows 桥接写进 CLAUDE.md，桥接脚本与说明只留本机。
- 2026-10-22：FE-R5、R6、R7 合并 dev 并 push。lint / typecheck / 单测（280 → 282）/ build 通过；按用户偏好未跑 e2e。Windows 开发数据库就绪（13 项 pgTAP 通过）。
- 2026-10-22：FE-R4 合并 dev 并 push。lint / typecheck / 251 单测 / build 通过。
- 2026-10-21：FE-R3 两个分支合并 dev。全量 e2e `--workers=1` 134 过 2 跳过。Fable 已不可用，子 agent 全部用 Opus。
- 2026-10-15：FE-R2 合并 dev（4794852）。清理已合并的 worktree 与分支。
- 2026-09-27：数据源调研（`docs/research/data-sources.md`）：Adzuna 免费 API 禁止聚合统计商用，建议改用 ATS 公开 API + JSA IVI。
- 2026-09-26：FE-R1 合并 dev（d63e6b7）。用户决定放开付费方限制，PRD 与 CLAUDE.md 加入"中立防火墙"。
- 2026-09-24：分支 `frontend-v2` 重做完整交互前端（设计系统、合成市场引擎、全部页面），接口契约写入 `docs/FRONTEND_API_REPORT.md`。
- 2026-09-22：M0 本地完整验收通过（db reset、verify、13 项 pgTAP、集成测试、Playwright + axe）；草稿 PR #1。
- 2026-09-19：项目初始化；阶段 1 完成（ARCHITECTURE、MILESTONES），用户确认后进入阶段 2。
