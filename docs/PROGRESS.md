# PROGRESS

> 进度账本。会话中断或上下文被压缩后，从这里恢复。由主会话维护。

## 当前状态

- 阶段：2 — 用户已确认先实施 M0，本地开发先行，云端接入分别验证
- 当前里程碑：M0（`m0-foundation`；本地实现与完整验收通过，云端数据库接入待授权）
- 累计估算花费：AUD ≈ 3 / 150（阶段 1 仅主会话阅读与写文档；未派子 agent）

## 里程碑

| 里程碑 | 状态 | 审查轮次 | 估算花费 | 备注 |
|---|---|---|---|---|
| M0 仓库、CI、基础设施接入 | 本地完成；云端接入待完成 | 实现自检通过；PR #1 草稿 | 当前实际费用不可查询 | db reset、verify、集成测试、E2E 均通过；云端数据库 CLI 未登录，仓库尚无迁移 secrets |
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
| 2 | Adzuna 商用与存储条款（PRD Q6） | PRD / 架构 §6.2；`docs/research/data-sources.md` | **已核实：免费 API 禁止商业机构以聚合形式（职位计数、平均薪资）持续使用，限额 250 次/天**。建议 M1 主力改为 ATS 公开 API + JSA IVI 校准，覆盖率 `coverage_ratio` 成为一等指标；Adzuna 由用户发邮件争取书面授权 | **阻塞 M1，待用户拍板**（需重写架构 §6.2/§6.7 与 M1 范围） |
| 3 | 错误监控接 Sentry（EU，PII scrub）还是不接 | 架构 §12 #19 | 接 | 待定（M8 前） |
| 4 | 备份强度：每日 schema+公共数据 artifact、每周全量加密 dump 到 Storage | 架构 §12 #20 | 接受 | 待定（M8 前） |
| 5 | Vercel Hobby 禁止商用：上线前升 Pro（USD 20/月）还是迁 Cloudflare Workers（免费） | 架构 §11 | 先在 Hobby 完成 M0–M8 开发与内测；上线决定时再选；架构保证零改动 | 待定（M8） |
| 6 | 预算：估算 AUD 122–170 到 MVP 上线，AUD 150 余量很小 | 架构 / 里程碑 | M0、M1 完成后用实际用量校准；若超出，可把 M7 的 admin 看板（X4）与 M4 的 G3 推到上线后 | **需在 M0 前知悉** |
| 7 | 架构对 PRD 的调整（技能级信号用 `change_4w`、`no_pr_required_share` 定义、从业者时段模型、18+ 只勾选、不做密码登录、MVP 不接 LLM、供给门开关） | 架构 §1 与 §12 | 默认执行 | 待用户否决或默认通过 |
| 8 | 需要新增的环境变量：`NEXT_PUBLIC_APP_NAME`（建议替换现有 `APP_NAME`）、`NEXT_PUBLIC_APP_URL`、`JOBS_SECRET`、`ADZUNA_DAILY_CALL_BUDGET`、`ADZUNA_CATEGORY`、`MIN_SAMPLE_N`、`SENTRY_DSN`（若接） | 架构附录 B | 由用户 / Codex 写入 `.env.example` | 待办（M0 前至少前三个） |
| 9 | 新增人类事项：Supabase 需要**两个**项目（prod + dev）；Supabase Vault 写入 `jobs_url` / `jobs_secret`；免费拨测账号（UptimeRobot 类）用于健康检查与防闲置暂停 | 架构 §3.3 §5.4 §8.3 | 加入 SETUP_CHECKLIST | 待办 |
| 11 | 非 tech 行业上线策略：带覆盖说明上线，还是等中小企业来源（Employment Hero 等）谈成再开放 | data-sources §4.4 | 带说明上线 | 待定 |
| 12 | 上线前人工核实：JSA IVI/ASC 许可；Greenhouse/Lever/Ashby/Workable/SmartRecruiters/Workday 条款；PageUp、APSJobs、州政府职位板 | data-sources §6 | 加入 SETUP_CHECKLIST（用户/Codex） | 待办 |
| 10 | 其余 PRD Q2/Q3/Q4/Q5/Q7/Q8 | PRD | 按 PRD 建议默认执行（见架构 §12） | 默认通过 |

## 前端反馈第 1 轮（2026-09-26）

来源：`coda-feedback/26sep-first-feedback.md`、`coda-feedback/26sep-2nd.md`。用户确认按下列批次实施，worktree 方案获准。

| 批次 | 分支 | 内容 | 状态 |
|---|---|---|---|
| C1 术语表 | `dev` | `docs/GLOSSARY.md`，CLAUDE.md 指向它 | 完成 |
| A 快修 | `fe-feedback-r1` | All 置前；Filter 收成右侧按钮；删分类 bubble；删 A–Z、搜索前置；Share of ads → Demand / Job ads；修 ticker 名字列被挤；主题切换去掉 System 态（默认跟随系统，手动点选后记住）；导航只留 Market/People，Compare 并入盘面多选，Sources 移页脚 "Data & safety"；头像菜单去掉重复的 My desk | 已合并 dev（审查 2 轮，Round 1 退回 1 阻断；reviewer 因 Fable 额度用尽，经用户同意改用 Opus） |
| B Industry | `fe-industry`（worktree） | industry 标的（ANZSIC Division）、`/i/[slug]` 行业页与行业内技能、非 tech fixture；landing 右侧改 industry 热力图，下方 1 主卡 + 2～3 小卡轮播；Role 页 "Top holdings" | 已合并 dev（审查 1 轮通过） |
| C2 适配 | `fe-responsive`（worktree） | 375 / 768 全页面适配与截图测试；手机 onboarding 用 bottom sheet；付费方文案同步为中立防火墙表述 | 已合并 dev（审查 1 轮通过） |

本轮不动（待拍板）：标语与开场动画；"什么算 skill"（候选 ASC 三层框架）与 Communication 类软技能；skill 薪资与 breakdown 设计；LinkedIn 证书导入；Twitter 书签交互（待用户发链接）；"master level" 含义；细分行业颗粒度；watchlist "加入以来变化"改用 Demand 原始计数后会混入全市场涨落（原 share 口径可扣除），旧 `share_of_ads` watch 条目需迁移并重置 baseline；对比页上限 2（`/compare` 仅支持 a/b）。

## 前端反馈第 2 轮（2026-10-06）

用户决定：先写 DESIGN.md；A2 来源文案去 Adzuna 化；A3 覆盖率提示暂不做；A4 清理 worktree 等用户看完 preview；B1 breakdown 先做原型；B2 地点 = 表级筛选 + 全澳 remote 开关（通过）；C2 动效之后逐项来；C3 参考 ASC 做技能分层原型；C4 master level = 10 年以上（界面叫 Expert）；C5 首页新闻点评不做。

| 项 | 分支 | 状态 |
|---|---|---|
| `docs/DESIGN.md` v1 + GLOSSARY 同步 | `dev` | 完成，海报待 DESIGN 确认后做 |
| A2 + C3 + B2 + B1 | `fe-r2`（worktree `../skill-market-r2`） | 已合并 dev（4794852；审查 2 轮，Round 1 退回 1 阻断：series 色对比度 <3:1，DESIGN §2.2 同步修正；reviewer 用 Opus） |

## 前端反馈第 3 轮（2026-10-17）

用户在 artifact 原型（https://claude.ai/artifact/72Ka23B5tHtKwUWCQfyE1V）上定稿：详情页只要一张图；标题 "SQL in [All Australia ▾]"（地点只属于筛选，放进标题，"in …" 小于标的名）；Y axis 只有 Job ads / Median salary；Split by = Experience / Work rights / Work mode / 无；详情页不要 Filter 按钮；文字越少越好。skill 也显示 Median salary（推翻 GLOSSARY 旧规则，用户决定）。数据来源问题先不管，先做前端。

| 项 | 分支 | 状态 |
|---|---|---|
| 详情页单图（Y axis + Split by + 标题地点） | `fe-r3-chart` | 已合并 dev（审查 2 轮，Round 1 退回 2 阻断：/compare 缺文案 key、键盘焦点丢失；reviewer 改用 Opus） |
| 配色方案、单色 logo、首页短标语 | `fe-r3-colours`（另一会话） | 已合并 dev（仓库内无审查记录，用户要求直接合并；合并后全量检查通过） |

## 前端反馈第 6 轮（2026-10-22）

| 项 | 分支 | 状态 |
|---|---|---|
| 详情页默认不拆分（无 `by` 参数；旧 `by=none` 一次 307）；No PR stated 时 Work rights 拆分置灰；/market 最前加 "Watching" 标签（书签 + 数量，未登录提示登录） | `fe-r6` | 已合并 dev（审查 1 轮通过） |

待拍板：Watching 是否包含 "I have this / Worked in this role"（held，目前包含）；skill 的 Median salary 不再默认按 Experience 拆开，可能被误读为"学了就能拿"（是否对 salary 单独默认拆分或加提示）。非阻断遗留：Watching 数量缺读屏说明；名称搜索时数量与列表不一致；整张 All 表传给客户端（迁 Supabase 后改服务端过滤）；Sign in 链接丢筛选参数；375px 标签行可横滑但无提示。

## 前端反馈第 5 轮（2026-10-22）

| 项 | 分支 | 状态 |
|---|---|---|
| 首页删热力图图例行与 How it works；行情条去暂停键（仅鼠标设备自动滚动）；技能单色 logo（simple-icons，CC0，25 个）；头像与 My desk 合并；涨跌只看正负号；role 可标 "I've worked in this role" 并邀请成为从业者 | `fe-r5` | 已合并 dev |
| 详情页：单一 `?metric=` 同时驱动 Right now 与大图；图左上为度量下拉、右上只有 3M/6M/1Y/2Y；4-week / 12-month change 自动切范围并标出对比窗口；Y axis 与 Split by 放进标题 Filter 面板；Fundamentals 改名 Statistics，选中格整格填色 | 同上 | 已合并 dev |
| 文案批注（用户在 `?review=copy` 中逐条批复 11 条）已执行，批注层已移除；Compare / Talk 改为按钮 | 同上 | 已合并 dev（审查 3 轮：R1 退回图表下拉焦点丢失，R3 退回热力图缺 4-week change ⓘ，主会话一行修复后未再复审） |

待拍板：详情页标题默认带 "· by experience"（主会话建议默认不拆分）；Market 加 "Watching" 标签页的位置（建议放最前，书签图标 + 数字）；No PR stated 时是否禁用 Work rights 拆分；role 的 12-month change 大数字来自官方序列、图为 Job ads（接入真实数据后再定）。上 main 前 e2e 需大面积同步（`detail-chart`、`round2`、`frontend`、`responsive`）。

## 前端反馈第 4 轮（2026-10-21）

用户反馈后直接实施，预览截图确认后合并。

| 项 | 分支 | 状态 |
|---|---|---|
| /market 去掉页头与 Signals now；首页去掉 edition 行、What we won't do，信号卡整卡可点、去暂停键；/people 去 How it works；首页底部换成 "Twenty minutes a month…" 共享卡；Fundamentals 整格可点并回到 #now；详情页 Watch 为唯一主按钮 | `fe-r4-cleanup` | 已合并 dev（审查 2 轮，Round 1 退回 2 阻断：触屏无法停止轮播（WCAG 2.2.2）、e2e 断言已删按钮） |
| Filter 面板：Currently showing 置顶吸附；顺序 Work rights → Level → Places → Advanced；Australia 为固定底（"All Australia"），删除 NZ | 同上 | 已合并 dev |
| 详情页"标题即 filter"：标题句子打开同一个 Filter 面板；删 ScopeChips；Split by 被 filter 固定的维度置灰 | 同上 | 已合并 dev |
| PRD：只做澳大利亚（用户授权直接改 PRD） | 同上 | 已合并 dev |

待拍板：筛选 No PR stated 时是否禁用 Work rights 拆分（演示数据 sponsorship_ok 约 6%，主会话建议禁用）；顶部行情条暂停键是否删除（WCAG 风险同轮播）。非阻断遗留：标题句子可能自相矛盾（"Sydney + remote · On-site or hybrid"）；被固定的 `by` 参数在 URL 中清不掉；e2e 文件已改未跑。

## 日志

- 2026-10-22：API 契约（分支 `contract-v1`，worktree `../skill-market-contract`）：`src/lib/contract/` 用 Zod 描述全部 98 个读、写、定时任务接口（权限、输入输出、错误、触发按钮、对应表、与演示版差异），`tests/contract-*.test.ts` 校验覆盖与演示后端一致性；已合并 FE-R5/R6 后的 `dev` 并同步（单一 `?metric=` 驱动图、岗位可标 worked、Watching 标签）。用户决定：首次公开上线不开咖啡聊（前端保留供作业展示），入口只留等待名单，相关 42 个接口标 `phase: 'later'`；不再估算花费；目标一周内快速上线，数据源方向（ATS 公开接口 + JSA IVI，放弃 Adzuna）待用户确认。

- 2026-10-22：FE-R6 合并 dev 并 push。lint/typecheck/281 单测/build 通过；未跑 e2e。子 agent 约 0.3M tokens。

- 2026-10-22：FE-R5 合并 dev 并 push。lint/typecheck/280 单测/build 通过；按用户偏好未跑 e2e。子 agent 约 1.3M tokens。

- 2026-10-22：FE-R4 合并 dev 并 push。lint/typecheck/251 单测/build 通过（reviewer 复核）；按用户偏好未跑 e2e。子 agent 约 0.6M tokens。

- 2026-10-21：FE-R3 两个分支合并 dev 并 push。合并冲突仅 `filter-builder.tsx`。lint/typecheck/243 单测/build 通过；全量 e2e `--workers=1` 134 过 2 跳过。注意：`.claude/worktrees/` 在仓库内，`eslint .` 会扫进去，需加入忽略。待拍板：skill 薪资是否在 board / Right now / Fundamentals 不拆分显示（A 只在图里 / B 加提醒 / C 维持）；PRD.md:185 "技能无薪资"需用户改。Fable 已不可用，子 agent 全部用 Opus。本轮子 agent 约 0.95M tokens。

- 2026-10-15：前端反馈第 2 轮合并 dev（4794852）并 push。lint/typecheck/186 单测/build 通过；e2e 在高负载（load ~82）下大量超时，`--workers=1` 重跑全部通过。复审留下非阻断建议：全部分档低于阈值时 thin 文案与画面不符（`breakdown-section.tsx:92`）、localStorage 禁用时主题手动选择不生效、单档低于阈值可被总量反推、`/sources` 仍用 `bg-signal-soft`。

- 2026-10-15：清理 worktree 与分支（第 2 轮 A4）。删除已合并的 worktree `../skill-market-{fe2,industry,responsive}`、`.claude/worktrees/frontend-discussion-2a2f02`，本地分支 `frontend-v2`、`fe-r1-fixes`、`fe-responsive`、`fe-industry`、`fe-feedback-r1`、`m0-foundation`、`claude/frontend-discussion-2a2f02`，远程分支 `origin/frontend-v2`、`origin/m0-foundation`；丢弃前端 v1 stash 与本地 `tmp/`、`output/`。保留 `fe-r2`（`../skill-market-r2`，未合并）。

- 2026-09-26：用户决定放开付费方限制（任何人都可以是付费者）。已改 `docs/PRD.md`（§2 利益立场、§3.1、§5.3、§12.1）与 `CLAUDE.md` 已定约束；新增"中立防火墙"：收入不影响盘面、利益披露、隐私不出售。MVP 仍不收费。界面文案里"Never paid for by employers"等承诺待前端下一轮同步（`messages/en/{common,home,student,legal,market-pages}.json`）。

- 2026-09-26：前端反馈第 1 轮 A/B/C2 全部合并 dev（d63e6b7），含合并后修复（/metrics 手机溢出、Reset filter 测试加固、B 审查建议）。lint/typecheck/157 单测/build 通过；e2e 110 条中 107 过，3 条长路由巡检用例在高负载（load 30–60）下超时、单独重跑 6/6 通过。reviewer 全部临时改用 Opus（Fable 额度用尽，用户同意）。子 agent 用量约 1.2M tokens，估算本轮 ≈ AUD 25–35（未核实，请对照控制台）。
- 2026-09-26：前端反馈第 1 轮定稿（见上节）。新增 `docs/GLOSSARY.md`。

- 2026-09-24：用户要求在新 worktree 另起分支、按主会话审美重做完整交互前端并写接口报告。分支 `frontend-v2`（`../skill-market-fe2`，基于 `a0428bd`）：主会话完成设计系统（编辑式纸墨风格、Newsreader/Geist 自托管字体、浅深色 token）、合成市场引擎、筛选/指标注册表、应用外壳与首页；三个并行子 agent 分别完成公开盘面、学生侧、咖啡聊/从业者/后台/法律页；主会话集成并在浏览器中逐页核查（1440/375/深色）。lint、typecheck、118 项单测、45 路由生产构建、32 项 Playwright + axe 通过。接口契约见 `docs/FRONTEND_API_REPORT.md`，其 §9 列出需后端补的字段（待拍板）。未合并 dev/main，未推送。

- 2026-09-22：本地完整验收通过：`pnpm db:reset`、`pnpm verify`（lint/typecheck、7 单测、13 pgTAP 权限测试、standalone build）、真实数据库 health 集成测试、桌面/手机 2 个 Playwright + axe 用例。生产依赖审计无已知漏洞。草稿 PR：https://github.com/plcme/skill-market/pull/1 。
- 2026-09-22：本机首次全栈启动资源超时，关闭本阶段不用的 Storage/Studio/Realtime/Edge Runtime/Analytics 后通过；生成 types 来自真实本地数据库。Vercel 初次作者识别失败及静态输出目录误配置均已修正，最新预览由远端检查验收。尚未合并 dev/main，未启动 M1，未写云端数据库。未执行独立模型审查，本轮为实现自检；实际费用未获取，不新增估算为实测。

- 2026-09-22：用户授权先做 M0；M1 许可核实与合成 fixtures 开发并行，真实采集不提前开启。保留原 `APP_NAME` 环境变量和命名，用服务端常量传入页面，不改为 `NEXT_PUBLIC_APP_NAME`。
- 2026-09-22：M0 采用 SQL migration 启用 pg_cron/pg_net；系统字体避免构建时联网取字体。生产迁移改为手动触发且默认禁用，待云端凭据与审批保护核实后启用。Supabase 开发项目尚未实证确认。

- 2026-09-19：项目初始化。PRD v0.1、CLAUDE.md、implementer / reviewer 子 agent、基础设施清单就绪。
- 2026-09-19：阶段 1 完成。产出 `docs/ARCHITECTURE.md`（技术选型、9 张 Mermaid 图、数据模型、RLS 矩阵、任务调度、数据策略、匹配与状态机、安全隐私、测试、CI/CD、免费档分析、26 条假设与待拍板）与 `docs/MILESTONES.md`（M0–M8 到 MVP 上线，M9–M17 上线后）。等待用户确认架构后进入阶段 2。
