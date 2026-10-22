# MILESTONES — skill-market

| 项 | 内容 |
|---|---|
| 状态 | v0.1 — 阶段 1 产出，待产品负责人确认 |
| 依据 | `docs/PRD.md` §5 范围、§7 FR、`docs/ARCHITECTURE.md` |
| 维护方 | 主会话 |

> 每个里程碑都产出可运行、可演示的增量，且验收命令能在本地一条命令跑通。规模：S ≈ 半天、M ≈ 1–2 天、L ≈ 2–4 天（以 implementer 子 agent 的连续工作计）。里程碑分支 `m{n}-<slug>`，从 `dev` 切出。**MVP 上线点在 M8 之后。**

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
- `src/config/app.ts` 导出 `APP_NAME`（读 `NEXT_PUBLIC_APP_NAME`，缺省 `skill-market`）；ESLint 规则禁止在 `src/` 出现字面量产品名
- `next-intl` 单 locale；`messages/en.json`；ESLint 规则禁止 JSX 中裸英文文案（`react/jsx-no-literals` 限定范围）
- `src/env.ts` Zod 环境变量校验（server / client 分组）
- Supabase CLI：`supabase init`、本地 `supabase start`、第一条 migration（`profiles` 表 + `handle_new_user` trigger + RLS + `is_admin()`）、`supabase gen types` 脚本
- 测试骨架：Vitest（1 个示例）、pgTAP（`profiles` RLS 正反例）、Playwright（首页可访问 + axe）
- `pnpm verify`、`pnpm test:db`、`pnpm test:e2e`、`pnpm db:reset`、`pnpm types:gen` 脚本
- GitHub Actions：`ci.yml`、`migrate.yml`（dev → 项目 2；main → production environment 审批）
- 首页 `/` 显示 `APP_NAME` 与 "coming soon"；`/api/health`
- `README.md`：本地启动步骤

**范围外**：任何业务表；UI 组件库以外的组件。

**任务**
1. 脚手架与依赖锁定；`.nvmrc` / `engines`
2. Tailwind 主题 token 文件（语义色、深浅模式）
3. Supabase 本地环境与 migration 流程；`supabase/config.toml` 开启 `pg_cron`、`pg_net`
4. 三层测试骨架与脚本
5. CI 工作流与分支保护说明（保护规则由用户在 GitHub 设置，implementer 在 README 写清）
6. `proxy.ts` session 刷新；`src/lib/supabase/{server,client,admin}.ts`

**依赖**：无。

**验收标准**
- `pnpm verify` 本地零错误通过（lint、typecheck、unit、pgTAP、build）
- `pnpm test:e2e` 通过：首页 200、页面标题包含 `APP_NAME`、axe 无 serious/critical
- 推送到 `dev` 后 GitHub Actions `ci.yml` 绿；Vercel preview URL 可打开首页
- `grep -rn "skill-market" src/` 只命中 `src/config/app.ts` 的缺省值
- `supabase db reset` 后 `supabase test db` 通过

**需要人类完成**：SETUP §1 GitHub、§2 Supabase（两个项目：`skill-market`、`skill-market-dev`，均 Sydney）、§3 Vercel；把 §2 的变量填入 `.env.local` 与 Vercel 环境；新增 `NEXT_PUBLIC_APP_NAME`、`NEXT_PUBLIC_APP_URL`、`JOBS_SECRET` 到 `.env.example`（见 PROGRESS.md）。

---

## M1 — 数据基础（L）

**目标**：从 fixture 与真实源采集广告与官方序列，抽取特征，按 cell 计算指标，检测信号，全部由任务运行时驱动；admin 能看到管道状态。**完成后立即在生产项目开启每日采集**（自建快照从第一天开始）。

**覆盖 FR**：FR-D1、D4（阈值）、D5（来源类型）、D6、D7；FR-X3。

**范围内**
- Migrations：`instruments`（enum 五类）、`instrument_aliases`、`instrument_relations`、`locations`、`metric_cells`、`metric_definitions`、`metric_points`、`data_sources`、`employers`、`ingestion_runs`、`job_ads`、`job_ad_skills`、`job_runs`、`signals`（全局部分）、`feature_flags`；全部 RLS
- 种子：`skills.yaml`（约 150）、`roles.yaml`（约 25 ANZSCO）、`locations.yaml`（AU 国 / 州 / 首府与主要城市；只做澳洲）、`data_sources`；`pnpm seed`
- `src/lib/metrics/registry.ts` + `pnpm metrics:sync` + CI 一致性检查
- 数据源适配层接口 + `FixtureSource` + `AtsAdsSource`（Greenhouse / Lever / Ashby / Workable / SmartRecruiters 适配器；按 `employers` 登记表每家每天一次，新增 / 关闭判断）+ `JsaIviSeries`（CSV/XLSX 下载解析）+ `AscTaxonomy`（岗位成分初始权重）；NERO / SPL 只做导入骨架（基本面面板在 M2 用）
- `employers` 登记表与种子（ASX 200、四大、银行、大学、政府、澳洲科技公司；记录 ATS 与公开接口地址）
- 覆盖率：`compute-coverage` 按 ANZSCO 4 位 × 州 × 月对照 IVI 计算 `coverage_ratio`，并给 skill 的 `share_of_ads` 重新加权（架构 §6.8）
- 抽取规则（seniority / work_mode / work_rights / 字典技能）带 version；`fixtures/ads/*.json` 约 500 条 + 人工标注集 200 条与回归测试
- SQL 函数：`assign_metric_cell`、`compute_metric_points(date)`、`compute_relations()`、`detect_signals()`（全局默认 cell 部分）
- 任务运行时：`/api/jobs/[job]`、租约、分片游标、`pnpm job <name>`；pg_cron schedule migration（URL/secret 取自 Vault）
- `/admin/pipeline`：`ingestion_runs`、`job_runs`、最近 `compute-metrics` 时间、失败高亮；连续失败邮件（outbox 表在此建，发送在 M6 前用日志 mailer）
- `/api/health` 增加管道新鲜度

**范围外**：任何面向学生的 UI；watchlist 级信号（M3）；NZ 数据。

**任务**
1. 分类与地点 migrations + 种子 + 别名归一函数 `resolve_instrument(text)`
2. 适配层接口与 Fixture 源；全管道在 fixture 上跑通
3. ATS 源：各家适配器、跨来源去重、新增 / 关闭判断、限速与错误重试、个人信息剥离、`ingestion_runs.stats`
4. 抽取规则 + 标注集 + 精确率 / 召回率报告脚本 `pnpm extraction:report`
5. cell 分配与 `compute_metric_points`；pgTAP 用 fixture 校验 `share_of_ads`、`entry_level_share`、`no_pr_required_share`、`employer_concentration`、`change_4w` 的数值
6. IVI 导入 → 岗位 month `metric_points`；ASC → `role_has_skill`；`compute-coverage` 与重新加权
7. 任务运行时 + pg_cron + Vault；`job_runs` 幂等测试
8. `detect_signals()` 全局部分 + 阈值 flag
9. admin 管道页（admin 守卫用 `is_admin()`）

**依赖**：M0。

**验收标准**
- `pnpm verify` 通过
- `pnpm job ingest-ats --source=fixture && pnpm job extract-features && pnpm job compute-metrics` 在本地空库上跑通，`select count(*) from metric_points` > 0
- `pnpm test:db` 中指标数值用例：fixture 集的手算值与 `compute_metric_points` 输出一致（至少 5 个指标 × 3 个 cell 组合）
- 同一 job 连续运行两次，`job_ads` 与 `metric_points` 行数不变（幂等）
- `pnpm extraction:report` 输出每条规则的精确率 / 召回率，seniority 与 work_rights 的精确率 ≥ 0.85（标注集）
- `pnpm metrics:sync --check` 通过（registry 与 `metric_definitions` 一致）
- 真实 ATS：`pnpm job ingest-ats --max-employers=5` 返回各家 HTTP 状态与职位数（只打印计数）
- `coverage_ratio` 在 fixture 上与手算值一致；覆盖率低于阈值的格子不产生信号
- `/admin/pipeline` 对 admin 用户显示最近运行；对非 admin 404
- 生产项目 pg_cron 任务列表可查（`select jobname from cron.job`），并在次日看到 `ingestion_runs` 新记录（由用户在 Supabase 后台核对）

**需要人类完成**：SETUP §6 的 M1 前部分（JSA 各数据集下载地址与许可）；在 Supabase Vault 写入 `jobs_url`、`jobs_secret`（implementer 给出 SQL，用户执行）。

---

## M2 — 公开盘面（L）

**目标**：未登录用户可浏览盘面、搜索、查看技能 / 岗位完整页、切换指标、用规则式筛选器并看到自然语言回读、并排对比两个标的；每个数字都有定义与来源。

**覆盖 FR**：FR-M1–M6、F1–F5、D2–D5；NFR-1、2、3；PRD §10 原则 1、2、5、7、9。

**范围内**
- 页面：`/`、`/market`、`/s/[slug]`、`/r/[slug]`、`/compare`、`/search`、`/metrics/[key]`、`/sources`
- 组件：`TickerRow` / `TickerCard` / `TickerPage`、`ChangeBadge`、`MetricDefinitionPopover`、`SourceBadge`、`MetricSwitcher`、`FilterRuleBuilder` + `FilterReadback`、`SparklineSvg`、`TrendChart` + 数据表、`SampleWarning`、`CompositionList`
- `expandFilterToCells`、`aggregateForFilter`、`describeFilter`、`filterHash`；筛选状态全部在 URL
- 岗位基本面面板（NERO、SPL、成分技能、同现技能）
- ISR + `revalidateTag('market')`（`compute-metrics` 完成后调用）
- 对比视图：两标的同指标并排、共同 / 独有的同现技能、entry-level 占比、样本量；"相关性 / 可迁移性 / 学习投入"为文案化的规则说明（不做分数）
- `ui_mode`（cookie）切换术语
- 匿名 `analytics_events`（`market_viewed`、`instrument_viewed`、`metric_switched`、`filter_changed`、`definition_opened`）

**范围外**：登录、watchlist、"找人聊"按钮的真实功能（显示为 M6 前的占位：说明与从业者招募链接）。

**任务**
1. 数据形状 `InstrumentSnapshot` 与查询层（≤ 3 次查询 / 页）
2. 三尺寸 ticker card 与 `ChangeBadge`（强制绝对值）
3. 指标切换器（registry 驱动，含可用时间窗判断）与定义 popover
4. 规则式筛选器（地点树、渐进披露、回读）
5. 走势图（Recharts 动态加载）+ sparkline SVG + 数据表 + 样本不足态
6. 岗位 / 技能页的互相跳转与基本面面板
7. 对比页
8. 搜索（别名归一）
9. ISR 与 revalidate 钩子；Lighthouse CI 接入（不阻断）
10. 移动端 375px 布局与 axe 修复

**依赖**：M1（数据）。

**验收标准**
- `pnpm verify` 与 `pnpm test:e2e` 通过；e2e 覆盖：匿名打开 `/market` → 点进 `/s/python` → 切换指标 → 添加第二条筛选规则 → 回读文案正确 → 跳到某岗位页 → 回到技能页（两跳内往返）
- 单测：`expandFilterToCells` 覆盖层级展开、并集去重、空规则；`describeFilter` 至少 6 种状态的快照；registry 有效性矩阵（`salary_median` 对 skill 不可选）
- 页面上任何百分比旁都有 ⓘ，e2e 断言：`[data-metric-value]` 元素数 == `[data-metric-definition]` 元素数
- `sample_n < min_sample` 的筛选组合下，页面不渲染 `<svg data-trend>`，显示 `SampleWarning`
- Lighthouse 移动端对 `/s/[slug]`：LCP < 2.5s（本地 `next start` + 模拟 4G）
- axe：6 个页面零 serious/critical
- 375px 视口的 e2e 截图存档

**需要人类完成**：无。

---

## M3 — 账号、onboarding、技能画像、watchlist（M）

**目标**：学生可登录，10 秒完成 Tier 0 看到个性化盘面，60 秒完成 Tier 1，管理推断技能，把"标的 + 筛选"加入 watchlist 并看到自加入以来的变化与信号高亮。

**覆盖 FR**：FR-A1、A2、A3、A8；FR-O1–O6；FR-W1–W3；FR-F6；PRD §10 原则 3、4。

**范围内**
- Supabase Auth：magic link + Google；`/auth/login`、`/auth/callback`、`/auth/signout`；18+ 勾选与 `consents`
- Migrations：`student_profiles`、`student_skills`、`universities`、`course_units`、`course_unit_skills`、`degree_skill_priors`、`watchlist_items`、`signals.watchlist_item_id`、`consents`、`email_preferences`（表先建，M6 用）；RLS + pgTAP
- 种子：USYD + Eng&IT 学位列表 + 约 60–80 门单元与技能映射（`units.yaml`）
- `/onboarding` Tier 0（未登录可做，cookie 草稿）→ Tier 1；随时跳过
- 推断：学位 × 年级先验 + 单元映射 → `student_skills(source=inferred, confidence)`
- `/me/skills`：已确认 / 建议 / 下一步；一键确认 / 删除；空状态设计（FR-O6）
- `/me`：watchlist 列表行、自加入变化、信号高亮、"找人聊"入口占位
- watchlist actions；`detect_signals()` 扩展到 watchlist item 级
- Supabase Auth SMTP 指向 Resend（preview 环境）

**范围外**：字段可见性、导出、删除（M4）；邮件提醒（M6）。

**任务**
1. Auth 流程与 session 守卫；e2e 用 Inbucket 取 magic link
2. 学生画像与技能表 + RLS
3. 课程种子与推断函数（纯函数 + 单测：先验、置信度、去重）
4. Onboarding 两层 UI + cookie 草稿合并
5. 技能画像页 + 空状态
6. watchlist actions、`/me`、baseline 与 since-added 计算
7. watchlist 级信号 + 高亮

**依赖**：M2。

**验收标准**
- `pnpm verify`、`pnpm test:db`、`pnpm test:e2e` 通过；e2e：匿名 Tier 0 → 看到 "Suggested" 技能 → 登录 → 草稿合并 → Tier 1 勾 3 门单元 → 删除一个推断技能 → 加入 watchlist（带两条筛选规则）→ `/me` 显示条目与回读
- pgTAP：用户 A 读不到用户 B 的 `student_skills` / `watchlist_items`；匿名读不到任何画像
- 单测：推断置信度范围 [0,1]，确认后 `source=confirmed`，删除后不再重新推断（`dismissed` 记录）
- `/me/skills` 的 DOM 不含 `%`、`rank`、`score` 字样（e2e 断言）
- Google 登录在 preview 环境用测试账号跑通（用户手动验证一次）

**需要人类完成**：SETUP §4 Resend（API key；Supabase Auth SMTP 改为 Resend）、§5 Google OAuth（Testing 模式，添加测试邮箱）。

---

## M4 — 缺口诊断、隐私控制、账号删除与导出、法律页（M）

**目标**：学生选目标岗位得到最多 3 个下一步及理由；逐字段可见性；导出与删除；隐私政策、条款、行为准则、可靠度规则页。

**覆盖 FR**：FR-G1、G2、G3(S)；FR-A4、A5、A6；FR-C11（数据模型部分）。

**范围内**
- `/me/gap?role=`：成分技能 vs 画像；优先级规则（权重 × entry-level 适用 × 可迁移性 × 未持有），最多 3 项，每项附理由与"获取途径"（来自 `course_unit_skills` 反查：哪些单元教它）
- `field_visibility` JSON 与 `/me/settings` 的逐字段控件；默认值见 ARCHITECTURE §12 #24
- `requestExport`：JSON 生成到 Storage 私有 bucket，签名 URL 24h，outbox 通知
- `requestDeletion`：软删除即刻匿名化 + `account_deletions`；`purge()` SQL 函数与 pg_cron；撤销窗口 30 天
- `/legal/*` 四页（英文文案由 implementer 起草，标注"需法律审阅"）；收集点的目的说明文案
- `ui_mode` 持久化到 profile

**范围外**：从业者侧字段（M5）。

**任务**
1. 缺口诊断纯函数 + 单测（含"技能很少"与"全部持有"边界）
2. 缺口页 UI（方向框架，不显示百分比）
3. 可见性模型 + settings UI
4. 导出与删除流程 + `purge()` + pgTAP（删除后 30 天内所有关联表无残留）
5. 法律页与目的说明

**依赖**：M3。

**验收标准**
- `pnpm verify`、`pnpm test:db` 通过
- 单测：给定岗位成分与画像，输出 ≤ 3 项且每项含 4 个理由字段
- pgTAP：`purge()` 对一个到期用户执行后，`profiles`、`student_*`、`watchlist_items`、`signals`、`consents` 中无该用户行；未到期用户不受影响
- e2e：设置签证状态字段为"仅自己"→ 导出 JSON 含该字段 → 请求删除 → 登录后看到撤销提示
- `/legal/privacy` 列出 ARCHITECTURE §8.2 的全部跨境接收方

**需要人类完成**：无（法律文本审阅可延后到 M8）。

---

## M5 — 从业者侧（M）

**目标**：从业者注册、工作邮箱验证、填写技能 / 入行年份 / 话题 / 月上限、设置每周可约模板与暂停；admin 审核队列。

**覆盖 FR**：FR-P1–P6；FR-X2。

**范围内**
- Migrations：`practitioner_profiles`、`practitioner_skills`、`practitioner_topics`、`work_email_verifications`、`availability_templates`、`availability_slots`、`rate_limits` + `check_rate_limit()`、视图 `practitioner_cards`；RLS + pgTAP
- `/practitioner/join`：账号（复用 Auth）→ 工作邮箱验证码（Resend；免费邮箱黑名单）→ 画像表单 → 时段模板 → 会议链接
- `generate-slots` SQL 函数 + pg_cron；时区处理
- `/practitioner`：状态、暂停开关、上限、模板编辑、（请求列表在 M6 填充）
- `/admin/review`：验证失败 / 黑名单域名的人工审核，approve / reject
- 验证码限速（3/小时）

**范围外**：接收请求（M6）。

**任务**
1. 表与视图 + RLS（重点：`practitioner_cards` 只暴露白名单列，仅 auth 可见）
2. 验证码流程（哈希、过期、限速）+ 单测 + pgTAP
3. 画像与话题表单（技能选择复用别名搜索）
4. 模板 → slot 生成函数 + pgTAP（跨月、DST、过期清理）
5. 面板与暂停
6. admin 审核队列

**依赖**：M3（Auth）。可与 M4 并行。

**验收标准**
- `pnpm verify`、`pnpm test:db` 通过
- e2e：注册 → 收到验证码（Inbucket）→ 验证 → 填画像 → 设置周二 18:00–19:00 模板 → 面板显示未来 4 周 slot → 暂停后 `practitioner_cards` 不再返回该用户
- pgTAP：匿名与未验证从业者不出现在 `practitioner_cards`；学生读不到 `work_email_verifications`；`check_rate_limit` 第 4 次调用返回 false
- 单测：免费邮箱域名（gmail、outlook 等）被拒并进入审核队列

**需要人类完成**：无（Resend 已在 M3 配置）。

---

## M6 — 匹配与咖啡聊全流程（L）

**目标**：从信号或标的页出发找到 ≤ 3 位候选人，看到匹配理由与 starters，发出请求；从业者接受 / 改期 / 婉拒；72h 超时静默换人；确认后邮件 + ics + 会前提醒；出席确认与可靠度；匹配为空的降级；信号提醒邮件。

**覆盖 FR**：FR-C1–C10；FR-R2；FR-W4（信号提醒部分）；PRD §8.2 失败分支；§10 原则 6、8。

**范围内**
- Migrations：`chat_requests`、`chat_request_events`、`attendance_confirmations`、`reliability_records`、`waitlist_entries`、`blocks`（表先建）、`notifications_outbox`（已建则扩展）；`transition_chat_request()`、`expire_chat_requests()`、`schedule_reminders()`；pg_cron
- `findCandidates` + 打分 + 理由 + 降级（相邻技能 → 等待队列）；`generateStarters`
- `/chat/new` 四步流；`createRequest`（校验 slot、cap、屏蔽、限速、`booking_enabled`）；`student_visible_fields` 快照
- `/chat/[id]` 双视角；从业者 accept / decline / propose reschedule；学生 accept reschedule / cancel
- 邮件：React Email 模板 × 8（request_received、accepted、still_looking、reschedule_proposed、reminder_24h、post_chat_debrief、attendance_l2、waitlist_available、signal_alert）+ `dispatch-outbox` job + Resend 适配 + 每日配额排队
- ics 生成；准备模板文案
- 出席确认（双方）→ `completed` / `no_show_*` → `reliability_records` → 暂停规则
- `/practitioner` 请求列表；`/me/requests`
- `email_preferences`：信号提醒开关（digest 在 Post-MVP）

**范围外**：L0 投票 UI（M7，但 `post_chat_debrief` 邮件已指向该页）；举报（M7）。

**任务**
1. 请求表、事件表、状态机 SQL 函数 + 纯函数版 + 互校测试（同一张转移表）
2. 匹配与降级 + 单测（每个因子、cap、屏蔽、暂停、相邻技能、空结果 → 等待队列）
3. starters 模板 + 单测
4. `/chat/new` 流程 UI
5. 从业者响应 actions + UI；改期分支
6. outbox + dispatch job + Resend 适配 + 模板预览（`pnpm email:preview`）
7. 超时与提醒 SQL 函数 + pg_cron + pgTAP（时间用 `set_config('app.now')` 注入）
8. 出席确认与可靠度
9. 等待队列与 `booking_enabled` 门

**依赖**：M5、M4（可见性）。

**验收标准**
- `pnpm verify`、`pnpm test:db`、`pnpm test:integration`、`pnpm test:e2e` 通过
- e2e 主流程：学生从 `/s/python` 点 "Talk to someone" → 3 位候选人（seed）→ 选 slot → 填决策问题 → 发送 → 从业者账号接受 → 双方 Inbucket 收到确认（含 ics 附件）→ 学生页显示 "confirmed"
- e2e 失败分支：从业者婉拒 → 学生页立即显示新候选人且页面文案不含 "declined" / "rejected"；`pnpm job expire-requests --now=<+73h>` 后 pending 请求变 expired、slot 重新 open、outbox 有 still_looking
- pgTAP：非法转移（如 `declined → accepted`）被拒；学生不能把自己的请求置为 `accepted`；从业者读不到 `student_profiles`，只能读 `chat_requests.student_visible_fields`
- 单测：匹配返回 ≤ 3；达到 cap 的从业者不出现；被屏蔽者不出现；空结果返回 `fallback.kind = 'waitlist'`
- 集成：`dispatch-outbox` 在 Resend mock 失败时重试并退避；每日超过 100 封时剩余记录保持 queued
- `/me/requests` pending 状态文案经审查符合 §10 原则 8（reviewer 检查）

**需要人类完成**：确认 Resend 在 preview 能发到用户自己的邮箱（onboarding 域名限制）；提供 2 个测试从业者邮箱（可用同一域名的别名）。

---

## M7 — 复盘、举报屏蔽、管理后台、安全加固（M）

**目标**：L0 一次点击投票；举报与屏蔽；admin 处理举报与暂停用户；漏斗看板；No-show 规则页与准则；速率限制与 CSP 全量落地。

**覆盖 FR**：FR-R1；FR-A7；FR-X1、X4(S)、X5(S 部分：别名维护)；FR-C10（规则公开）；NFR-5。

**范围内**
- `debrief_votes` + `/chat/[id]` 投票 UI + 标的页个人记录（"你在 {date} 聊过 · 更想学"）
- `reports`、`blocks` actions 与 UI（请求页与候选卡片上）；被屏蔽者从匹配中剔除（已在 M6 预留）
- `/admin/reports`（处理、暂停 / 恢复用户）、`/admin/metrics`（激活、匹配率、出席率、North Star 的 SQL 视图）、`/admin/taxonomy`（别名增删）
- `/legal/conduct`、`/legal/reliability` 文案与链接位置
- CSP、安全头、全部 Server Action 的限速审计、`pnpm audit` 门槛、gitleaks

**范围外**：L1 填空、L3 摘要、情绪面聚合（Post-MVP）。

**任务**
1. 投票表 + RLS + UI + 个人记录展示
2. 举报 / 屏蔽表与流程 + pgTAP
3. admin 三页
4. 安全头与限速审计；`security-review` 检查清单执行

**依赖**：M6。

**验收标准**
- `pnpm verify`、`pnpm test:db`、`pnpm test:e2e` 通过
- e2e：完成的请求 → 邮件链接 → 一次点击投票 → `/s/python` 显示个人记录；学生举报从业者 → admin 在 `/admin/reports` 看到并暂停 → 该从业者不再出现在候选人中
- pgTAP：只有本人能读自己的投票；举报人只能读自己的举报；非 admin 不能改 `reports.status`
- `curl -I` 生产构建响应头包含 CSP、HSTS、X-Frame-Options
- `/admin/metrics` 对 seed 数据显示非空漏斗

**需要人类完成**：无。

---

## M8 — 上线准备（M）

**目标**：生产环境可对外开放：域名、邮件域名、Google Production、观测、备份、性能与无障碍审计、runbook、供给门与上线检查单。**完成即 MVP 上线点（合并到 `main` 需用户确认）。**

**覆盖 FR**：NFR-1、3、4、7、8、9、11；FR-X3（告警）。

**范围内**
- Sentry 接入（若拍板同意）+ scrub；`pino` 日志字段规范
- Vercel 函数区域 `syd1`；域名与 `NEXT_PUBLIC_APP_URL`；Resend 域名 SPF/DKIM；Supabase Auth SMTP 与重定向 URL 切生产
- `backup.yml`；`docs/runbooks/`（部署、回滚、数据泄露、管道故障、账号删除请求）
- Lighthouse CI 阈值改为阻断；axe 全量；375px 走查清单
- SEO / OG 基础、`robots.txt`（`/me`、`/chat`、`/admin` 禁止）、sitemap（公开标的页）
- `booking_enabled` 门的 admin 开关与首页文案（未开时展示从业者招募与等待队列）
- 上线检查单 `docs/LAUNCH_CHECKLIST.md`：法律文本审阅、Google consent Production、Vercel 商用决定（Pro 或迁移）、拨测、告警邮箱
- `CHANGELOG.md`

**范围外**：任何新功能。

**任务**
1. 观测与告警接入
2. 生产配置与域名相关切换（代码侧只改环境变量与 Supabase 配置说明）
3. 备份与 runbook
4. 性能与无障碍审计修复
5. SEO 基础与 robots
6. 上线检查单与供给门

**依赖**：M7。

**验收标准**
- `pnpm verify`、全部测试通过；CI 中 Lighthouse 移动端 LCP < 2.5s 阻断门通过
- 生产 URL：`/api/health` 200；`/s/python` 在移动端 Lighthouse ≥ 90 性能、100 无障碍
- 一封生产邮件（magic link）从自有域名送达用户邮箱，SPF/DKIM 通过（用户核对）
- `cron.job` 在生产项目全部启用且最近 24h 有成功 `job_runs`
- `docs/LAUNCH_CHECKLIST.md` 每项勾选（用户确认）
- 备份 workflow 至少成功运行一次

**需要人类完成**：SETUP §7 全部（域名、Resend DNS、Google consent Production、Sentry 账号）；新增：拨测账号（UptimeRobot 等免费）、Vercel 商用决定；法律文本审阅；把 `booking_enabled` 在从业者 ≥ 30 时打开。

---

## ▶ MVP 公开上线点（M8 完成、用户确认合并 `main`）

---

## 上线后迭代（Post-MVP，顺序可调）

| # | 名称 | 规模 | 主要 FR | 需要人类先完成 |
|---|---|---|---|---|
| M9 | 周 / 月 digest 与 watchlist 提醒 | S | FR-W4 | outbox 已有；加 digest 模板与偏好 |
| M10 | 复盘 L1 填空 + 情绪面聚合 | M | FR-R3、R4 | 聚合 N < 阈值不展示；标的页 "analyst view" 面板 |
| M11 | 季节性视图与申请季默认视图 | M | `seasonality`（需 ≥ 2 年 IVI 可先做岗位级） | 岗位级用 IVI 可立即做 |
| M12 | ~~NZ 与国际市场（浅层）~~ 暂不做 | — | PRD §5.2 | 2026-10-21 用户决定只做澳洲 |
| M13 | 简历导入 Tier 2 + 渐进补全 Tier 3 | M | FR-O7 | 解析结果人工确认；PII 剥离 |
| M14 | 行业 / 雇主 / 证书三类标的 | L | PRD §5.2 | 数据模型已支持；需要新数据源与页面变体 |
| M15 | 异步问答降级（C）与 L3 半公开摘要 | M | FR-C6(C)、R5 | 双方同意机制 |
| M16 | LinkedIn 登录、机构合作版（就业中心） | L | PRD §5.2 | 需公司主页与合作协议 |
| M17 | Vercel → Cloudflare / 容器迁移（若未升 Pro） | S | NFR-11 | OpenNext 或 standalone |
