# 前端暴露接口报告（frontend-v2）

| 项 | 内容 |
|---|---|
| 分支 / worktree | `frontend-v2`，`../skill-market-fe2`，基于 `m0-foundation@a0428bd` |
| 范围 | PRD M2–M7 的全部用户界面：公开盘面、学生侧、咖啡聊、从业者侧、管理后台、法律页 |
| 数据 | 市场数字为确定性合成数据（`src/lib/market/engine.ts`）；用户数据存浏览器 `localStorage`（`src/lib/demo/store.ts`）。**不连接 Supabase、不发邮件** |
| 目的 | 本文列出前端已经在调用的每一个读接口、写接口（action）与后台任务，作为后端（M1–M7）实现时的契约 |
| 验证 | `pnpm lint`、`pnpm typecheck` 零错误；Vitest 14 个文件 118 项通过；生产构建 45 个路由；Playwright 32 项（1280 / 375 各 16，含 axe 无 serious/critical）通过 |

> 与 `m0-foundation` 工作区里未提交的旧版前端及其报告无关；本分支从 M0 提交重新实现，本报告只描述本分支。

---

## 1. 如何运行与演示

```sh
cd ../skill-market-fe2
pnpm install --frozen-lockfile
pnpm dev            # http://localhost:3000
pnpm test:unit && pnpm build && pnpm test:e2e
```

右下角（手机为左下）**Preview controls**：切换身份（Visitor / Student / Practitioner / Admin）、一键载入样例学生、模拟时钟（+1h / +24h / +72h / +7d，用于演示 72 小时超时、提醒、复盘）、查看"本应发出的邮件"（outbox）、重置数据。

## 2. 架构约定（替换后端时不需改组件）

| 层 | 现在（预览） | 生产（ARCHITECTURE） |
|---|---|---|
| 公开读 | `src/lib/queries/market.ts`，RSC 同步调用 fixture engine | RSC 查询 `metric_points` 并对 `expandFilterToCells()` 的 cell 求和；`revalidate=3600` + `revalidateTag('market')` |
| 用户读 | `src/lib/api/*.ts` 中的 `select*(db, …)` 纯函数 | RSC + Supabase select（RLS） |
| 写 | `src/lib/api/*.ts` 中的 `async` action：Zod 校验 → `latency()` → `transact()` → `Result<T>` | Server Actions（同名、同 Zod schema、同 `Result<T>`） |
| 权限 | `guard(db, persona)`（`src/lib/api/client.ts`）+ `RequireSession` 组件 | route group layout 守卫 + RLS + `is_admin()` / `is_verified_practitioner()` |
| 定时任务 | `runScheduledJobs(db, now)` 在每次读写前执行 | pg_cron → `/api/jobs/*` 与 SQL 函数 |
| 邮件 | 写入 `db.outbox`（在 Preview controls 中查看） | `notifications_outbox` → Resend |

**统一返回**：`type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError }`，`ApiError = { code, message, fields? }`。
`code ∈ unauthenticated | forbidden | validation | not_found | conflict | rate_limited | unavailable`；`message` 是 `messages/en/*.json` 中 `Errors.*` 的 key（UI 直接翻译），`fields` 为字段级错误 key。

实体类型全部在 `src/lib/api/types.ts`（`DemoDB`、`Session`、`StudentProfile`、`StudentSkill`、`WatchlistItem`、`Practitioner`、`Slot`、`ChatRequest`、`ChatEvent`、`Report`、`Block`、`WaitlistEntry`、`OutboxEmail`、`PipelineRun`、`AliasOverride`），市场类型在 `src/lib/market/types.ts`（`FilterSpec`、`MetricReading`、`InstrumentSnapshot`、`Signal`、`SeriesPoint`、`DataSource`）。

## 3. 路由清单

| 路由 | 身份 | 主要 FR | 数据来源 |
|---|---|---|---|
| `/` | 公开 | FR-M1、R7 | `getBoard`、`getTape` |
| `/market?type&metric&f&sort&view&cat&q` | 公开 | FR-M1/M2/M4/M6、FR-F1–F5 | `getBoard`、`getSignalsNow` |
| `/s/[slug]`、`/r/[slug]`（类型不符时自动重定向到另一个） | 公开 | FR-M2/M3、FR-D2–D5、FR-R1（本人复盘记录） | `getInstrumentDetail`、`selectDebriefsFor` |
| `/compare?a&b&f` | 公开 | FR-M5 | `getComparison` |
| `/search?q` | 公开 | FR-D6 | `searchWithSnapshots` |
| `/metrics`、`/metrics/[key]` | 公开 | FR-D2、FR-M4 | registry、`getMetricExamples` |
| `/sources` | 公开 | FR-D1/D5、§11 | `getSources` |
| `/people` | 公开 | §8.1、R4 | `getBoard`、`selectSupply` |
| `/auth/login`、`/auth/callback`、`/auth/signout` | 公开 | FR-A1/A2/A6 | auth actions |
| `/onboarding?step=start\|units\|done` | 公开（登录后合并） | FR-O1–O6 | onboarding actions |
| `/me` | 学生 | FR-M6、FR-W1–W3 | `selectWatchlistGroups`、`selectSkillBoard`、`db.requests` |
| `/me/skills` | 学生 | FR-O4–O6、US7 | `selectSkillBoard` |
| `/me/gap?role&f` | 学生 | FR-G1–G3 | `diagnoseGap` |
| `/me/requests` | 学生 | FR-C7/C8、R5 | `selectStudentRequests` |
| `/me/settings` | 学生 | FR-A3–A5、FR-W4、Q7 | privacy actions |
| `/chat/new?instrument&f&signal` | 学生 | FR-C1–C6、FR-C11 | `findCandidates`、`generateStarters`、`createRequest` |
| `/chat/[id]` | 学生 / 从业者（双视角） | FR-C7–C10、FR-R1/R2、FR-A7 | `selectRequest` + chat/safety actions |
| `/practitioner/join` | 登录用户 | FR-P1–P3 | practitioner actions |
| `/practitioner` | 从业者 | FR-P4–P6 | `selectPractitionerInbox` 等 |
| `/admin/{reports,review,pipeline,metrics,taxonomy}` | 管理员 | FR-X1–X5 | admin actions / selectors |
| `/legal/{privacy,terms,conduct,reliability}` | 公开 | FR-A6、FR-C10 | 静态草稿 |

URL 构造统一用 `src/lib/links.ts`：`chatHref(slug, filter?, signalKind?)`、`instrumentPath(type, slug, filter?)`、`loginHref(next)`。

## 4. 筛选条件（FilterSpec）与 URL 编码

```ts
type FilterSpec = { rules: { work_modes: ('onsite'|'hybrid'|'remote')[]; location_ids: string[] }[]; seniority: 'all'|'entry'|'graduate'; work_rights: 'all'|'no_pr_required' };
```

- `?f=` 编码（`encodeFilter` / `decodeFilter`，只用表单编码不转义的字符）：`ohr.au-nsw-sydney*r.au.nz_entry_npr` = 规则用 `*` 分隔，每条规则 `工作模式字母.地点id…`，后缀 `_层级_工作权利`。默认值省略参数。
- 规则取并集，最多 4 条（`MAX_RULES`）；`normaliseFilter` 去掉未知 id 和"祖先 + 子孙"重复。
- `expandFilterToCells(spec)` → `{ pairs: {leaf, mode}[], seniority: bucket[], rights: bucket[] }`，与 ARCHITECTURE §6.3 cell 模型一致，后端求和直接复用。
- `describeFilter(spec, copy)` 生成回读文本（FR-F3），copy 来自 `messages/en/market.json` 的 `Filter.readback`。
- 地点树：`src/lib/filters/locations.ts`（AU 8 州/领地 + NZ；国家 → 州 → 城市 → 区域，悉尼/墨尔本细分到区域）。后端 `locations` 种子应沿用这些 id。

## 5. 公开读接口（`src/lib/queries/market.ts`）

| 函数 | 返回 | 说明 |
|---|---|---|
| `getBoard({type: 'skill'\|'role'\|'all', metric?, filter, sort?: 'value'\|'change'\|'name', q?, category?})` | `Board { type, metric, sort, rows: InstrumentSnapshot[], categories, signals, as_of }` | 无效 metric 回退到该类型默认（skill→`share_of_ads`，role→`growth_12m`，all→`ad_count`） |
| `getInstrumentDetail(slug, filter, metric?)` | `InstrumentDetail \| null` | 含 `readings`（该类型全部有效指标）、104 周 `series`、`composition`（role→技能权重 / skill→岗位）、`related`、`locations`（按州）、`signal` |
| `getComparison(a, b, filter)` | `Comparison \| null` | `correlation`（近 52 周 Pearson）、`overlap`、`shared/onlyA/onlyB` |
| `search(q)` / `searchWithSnapshots(q, filter)` | 按 skill/role 分组的命中，含 `matched`、`via: name\|alias\|symbol\|prefix` | 别名归一（FR-D6） |
| `getSignalsNow(filter, limit=12)` | `InstrumentSnapshot[]` | 当前筛选下有信号的标的，按幅度排序 |
| `getTape(limit=16)` | `TapeEntry[]` | 顶部行情条：全国 4 周变化，信号优先 |
| `getMetricExamples(key, filter)` | `{instrument, reading}[]` | 指标定义页示例 |
| `getSources()` | `DataSource[]` | `/sources` 与 admin |

**`MetricReading`（每个数字的解释载体，FR-D2）**：`metric, status ('ok'|'insufficient_sample'|'unavailable'), value, numerator, denominator, from, to, low, high, sample_n, min_sample, window {start,end,days}, source ('official'|'ads'|'practitioner'), source_id, updated_at`。
- `status='insufficient_sample'` 时 `value=null`，前端不画趋势线并给出放宽建议（FR-D4）。
- 变化类指标必须带 `from/to`（FR-D3）。
- 指标注册表 `src/lib/metrics/registry.ts` 定义适用类型、默认/常用/进阶、窗口、`min_sample`（默认 30）、`available_after_days`、`text_derived`、`ignores`、来源；文案在 `Metrics.<key>`。后端 `metric_definitions` 应由同一文件生成（ARCHITECTURE A6）。
- 信号（`detectSignal`）：`rise`/`fall` = `change_4w` 绝对值 ≥ 25% 且变化 ≥ 10 条，`entry_open` = entry-level 占比 8 周内上升 ≥ 10 个百分点，均要求样本充足；`since_added` 仅在 watchlist 上由 `selectWatchlist` 计算。

## 6. 写接口（actions）

每行：action → 输入（Zod）→ 输出 → 主要错误 → 对应 ARCHITECTURE §5.2 / 表。所有 action 先 `guard`，未列出的错误只有 `unauthenticated` / `forbidden` / `validation`。

### 6.1 认证（`src/lib/api/auth.ts`）
| action | 输入 | 输出 | 错误 | 映射 |
|---|---|---|---|---|
| `requestMagicLink` | `{email, age_confirmed: true, privacy_acknowledged: true, next?}` | `{email, token, expires_at}` | `validation`（`emailInvalid\|ageRequired\|privacyRequired`）、`rate_limited`（每地址 10 分钟 3 次） | Supabase `signInWithOtp` + `consents` |
| `completeSignIn(token)` | token | `{redirect}`（`next` → 未完成 Tier 0 时 `/onboarding` → `/me`） | `linkInvalid`、`linkUsed`、`linkExpired`（1 小时） | `/auth/callback`；建 `profiles`/`student_profiles`，合并匿名 onboarding |
| `signInWithGoogle` | `{age_confirmed, privacy_acknowledged, next?}` | `{redirect}` | 同上 | Google OAuth |
| `signOut()` | — | `{signed_out: true}` | — | `/auth/signout` |

### 6.2 Onboarding 与技能（`onboarding.ts`、`skills.ts`）
| action | 输入 | 输出 | 说明 / 映射 |
|---|---|---|---|
| `completeTier0` | `{university_id, degree_id, year}` | `{saved_to_profile, suggestions}` | **未登录可用**：存 `localStorage['sm-onboarding:v1']`，登录时 `mergeAnonymousOnboarding` 合并（对应架构"存 cookie，登录后合并"） |
| `completeTier1` | `{unit_codes: string[]}` | 同上 | 只替换 `source='inferred'` 行，不动已确认/自填 |
| `skipOnboarding` | `{tier: 'tier0'\|'tier1'\|'all'}` | 各 tier 状态 | FR-O3 |
| `confirmSkill(id)` / `removeSkill(id)` | id | `StudentSkill` | 删除即删，不留"拒绝"记录（R7） |
| `addSkill` | `{skill_slug}` | `StudentSkill` | `instrumentNotFound`、`skillAlreadyAdded` |
| `restoreSkill(skill)` | 原行 | `StudentSkill` | Undo |
| 读：`selectSkillBoard(db)` → `{confirmed, suggestions, next_steps, starting_out}`；`selectOnboarding`；`suggestNextSteps` | | | `student_skills` |

推断数据：`src/lib/demo/education.ts`（5 所大学，USyd 带 18 个 unit；8 个学位；`inferSkillProfile` 置信度上限 0.9、低于 0.3 丢弃）。**后端需要真实的 `universities` / `course_units` / `course_unit_skills` 种子**，现在的映射是示意。

### 6.3 Watchlist（`watchlist.ts`）
| action | 输入 | 输出 | 错误 |
|---|---|---|---|
| `addWatchlistItem` | `{instrument_slug, status: 'held'\|'watching', filter, metric?}` | `WatchlistItem`（写入 `baseline_value`） | `instrumentNotFound`、`rolesCannotBeHeld`、`alreadyWatching`（同标的 + 同 filter）、`watchlistFull`（30） |
| `updateWatchlistItem` | `{id, status?, filter?, metric?}` | `WatchlistItem` | filter / metric 变化会重置基线 |
| `removeWatchlistItem(id)` / `restoreWatchlistItem(item)` | | | Undo |
| 读：`selectWatchlist(db)` → `WatchlistRow {item, current, since_added, signal}`；`selectWatchlistGroups` → `{signals, held, watching}`；`findWatchItem` | | | `watchlist_items` + `signals` |

### 6.4 缺口诊断（`gap.ts`，纯函数）
`diagnoseGap(roleSlug, skills, filter = DEFAULT_FILTER, universityId?)` → `{role, filter, priorities (≤3), have, later} | null`。排序权重 `GAP_WEIGHTS = {relevance 0.5, entry 0.2, transfer 0.15, effort 0.15}`；每个优先项带相关性、entry-level 占比（`MetricReading`）、可迁移性、学习投入、获取途径（unit 来源可追溯；项目建议标注"非来源"）。不输出任何"准备度"分数。

### 6.5 隐私与设置（`privacy.ts`）
| action | 输入 | 输出 | 说明 |
|---|---|---|---|
| `updateProfile` | `{display_name, university_id, degree_id, year, visa_status}` | `StudentProfile` | 教育信息变化会重新推断；`visa_status` 可选（FR-A3） |
| `updateFieldVisibility` | `{field, visibility: 'private'\|'matched_practitioner'}` | 可见性表 | FR-A4 / FR-C11 |
| `updateEmailPreferences` | `{digest?, signal_alerts?}` | `email_prefs` | 请求类事务邮件不可关闭 |
| `setUiMode(mode)` | `'market'\|'plain'` | | Q7 无隐喻模式（关闭行情条、改用 Track 等字面措辞） |
| `requestExport()` | — | `StudentExport`（JSON，前端 Blob 下载）+ outbox `export_ready` | 生产：Storage + 24h 签名 URL |
| `requestDeletion` | `{confirmation: 'DELETE'}` | `{requested_at, purge_after}`（+30 天） | 取消未结请求、清空个人数据、登出、outbox `deletion_scheduled`；错误 `deleteConfirmMismatch` |
| 读：`selectConsents`、`buildExport` | | | `consents`、`account_deletions`、`data_exports` |

### 6.6 匹配与咖啡聊（`matching.ts`、`starters.ts`、`chat.ts`）

**`findCandidates({instrument_slug, filter, decision_question?, student_state?, student_id?, exclude_ids?}, db, now)`** → `{candidates (≤3), fallback: null | 'adjacent' | 'waitlist'}`（ARCHITECTURE §7.1）：
- 硬过滤：已验证、未暂停、未停权、双方未互相屏蔽、本月已接受数 < `monthly_cap`、有 ≥ 48 小时后的 open slot。
- 技能匹配：持有该技能；role 需持有前 5 个成分技能中的 ≥ 2 个或当前岗位即该 role。
- 打分（每项都生成 `MatchReason`）：持有 +40、入行 1–3 年 +25 / 4–6 年 +10、当前岗位属 top 岗位 +15、话题与决策问题关键词重合 +10、同州 +10、本月已接受 −5×n。
- 不足 3 人时用相邻技能（co-occurrence ≥ 0.3）补足并标 `adjacent_skill`；仍为空 → `waitlist`（前端给等待队列 + 从业者招募，永不出现空白页）。

**`generateStarters(ctx)`** → 恰好 3 条 `{id, vars}`，来自 18 条模板（文案在 `Starters.*`），确定性、无 LLM。

| action | 输入 | 输出 | 错误 |
|---|---|---|---|
| `createRequest` | `{instrument_slug, filter, signal, decision_question (15–500), practitioner_id, slot_id, starters (1–3, ≤280), shared_fields, agree_conduct: true}` | `ChatRequest`（slot `held`，`expires_at = min(created+72h, slot−12h)`，outbox `request_received`） | `slotTaken`、`candidateUnavailable`、`studentPaused`、`rateLimited`（每天 5 个） |
| `acceptRequest(id)` | | 状态 `accepted`，slot `booked`，outbox `request_accepted` | `chatStateChanged` |
| `declineRequest(id)` | 无理由字段 | 立即静默替换下一位（学生侧显示 "still looking"） | |
| `proposeReschedule` | `{id, slot_id}` | `reschedule_proposed` | |
| `acceptReschedule(id)` / `declineReschedule(id)` | | `accepted` / `cancelled` | |
| `cancelRequest` | `{id, as: 'student'\|'practitioner'}` | `cancelled` | `tooLateToCancel`（已确认的需提前 ≥ 24h） |
| `confirmAttendance` | `{id, as, attended: boolean}` | 出席 → 等对方或 7 天后 `completed`；缺席 → `no_show_*` | `tooEarlyToConfirm` |
| `submitDebrief` | `{id, vote: 'more_keen'\|'no_change'\|'less_keen', note ≤140}` | 一次点击完成 L0（FR-R1） | |
| `joinWaitlist` / `leaveWaitlist` | `{instrument_slug, filter}` / id | `WaitlistEntry` | |

读：`selectStudentRequests(db, now)` → `{needs_you, upcoming, waiting, past}`（无拒绝计数、无回复率）；`selectPractitionerInbox(db, practitionerId, now)`；`selectRequest(db, id)`；`openRequestFor`；`selectDebriefsFor(db, slug)`（技能页"你的咖啡聊记录"，仅本人可见）；`canCancel`。

**状态机**（`src/lib/chat/machine.ts`，对应 SQL `transition_chat_request`）：

| from | event | 允许的 actor | to |
|---|---|---|---|
| — | create | student, system | pending |
| pending | accept / decline / propose_reschedule | practitioner | accepted / declined / reschedule_proposed |
| pending | expire | system | expired |
| pending | cancel | student | cancelled |
| reschedule_proposed | accept_reschedule / decline_reschedule / cancel | student | accepted / cancelled / cancelled |
| reschedule_proposed | expire | system | cancelled |
| accepted | confirm_attended | student, practitioner | accepted（等待另一方） |
| accepted | complete | system | completed |
| accepted | confirm_absent | practitioner / student | no_show_student / no_show_practitioner |
| accepted | cancel | student, practitioner | cancelled |

`studentStatus()` 把 `declined`、`expired`、从业者取消统一映射为 `still_looking`（FR-C7/C8）。

### 6.7 从业者（`practitioner.ts`）
| action | 输入 | 说明 |
|---|---|---|
| `joinAsPractitioner` | `{agree_18: true, agree_conduct: true}` | 建草稿记录 |
| `sendWorkEmailCode` | `{email}` | 6 位码，10 分钟有效、30 秒重发间隔；免费邮箱域名（gmail、outlook 等）拒绝并引导人工审核。**预览中验证码写在 outbox 里**，生产应哈希存 `work_email_verifications` |
| `verifyWorkEmailCode` | `{code: /^\d{6}$/}` | 最多 3 次；成功 → `verified` |
| `requestManualReview` | `{email, linkedin_url, note?}` | → `manual_review`，进入 `/admin/review` |
| `updatePractitionerProfile` | `{current_title, current_role_slug, employer, entry_year, location_id, skills (1–12), topics (1–5), path, bio?, meeting_link (https) \| null}` | FR-P2 |
| `updateAvailabilityTemplate` | `{timezone, windows: {weekday 1–7, start, end}[] ≤14}` | 每段 ≥ 20 分钟、同日不重叠（`availabilityProblems`）；slot 由模板生成未来 28 天 |
| `setPaused(bool)` / `updateCap(1–4)` | | FR-P6 |
| `finishPractitionerSetup()` | | 加入 practitioner 身份并切换 |
| `setActingPractitioner(id)` | | **仅预览**：让演示者以种子从业者身份处理请求 |
| 读 | `selectMyPractitioner`、`selectActingPractitioner`、`joinStepFor`、`selectDeskStats`（仅本人可见）、`selectPractitionerSlots` | |

### 6.8 安全（`safety.ts`）
`reportUser({target_kind, target_id, request_id, reason: harassment|inappropriate|no_show|spam|safety|other, details})`（other 需 ≥ 10 字；每天 10 次）；`blockUser({target_id})`（关闭双方之间的未结请求，学生侧显示 still looking）；`unblockUser(id)`；读 `selectMyBlocks`、`hasBlocked`。被屏蔽者不再出现在候选人中。

### 6.9 管理后台（`admin.ts`，仅 admin）
`resolveReport({id, status: resolved|dismissed, resolution})`、`suspendUser({practitioner_id, report_id})`（30 天）、`liftSuspension(id)`、`approvePractitioner(id)`、`rejectPractitioner({id, note})`、`rerunJob(job)`、`upsertAlias({alias, instrument_slug})`（与已有别名/名称冲突时报 `conflict`）、`removeAlias(id)`；读 `selectReports`、`selectReviewQueue`、`selectPipeline`、`selectFunnel(db, now)`（North Star 与漏斗，含定义与分子分母，样本 < 10 时警示）、`selectAliases`。

## 7. 后台任务（`src/lib/api/jobs.ts`、`chat-jobs.ts`）

| 任务 | 规则 | 生产对应 |
|---|---|---|
| `refreshSlots` | 按每位从业者的模板生成未来 28 天的 20 分钟 slot，删除过期或模板外的 open slot | `availability_slots` 生成 job |
| `runChatJobs` | pending 到 `expires_at` → `expired` 并**静默替换**下一位（跳过 `tried_practitioner_ids`，记 `replaced_by`，邮件 `request_still_looking`）；reschedule 72h 未答 → `cancelled`；slot 前 24h 提醒（一次）；slot 结束 1h 后发出席/复盘邮件（一次）；一方确认出席 7 天后 → `completed`；从业者 30 天内 ≥ 2 次缺席 → 停止匹配 30 天，学生同理暂停发起 | `expire_chat_requests()`、reminder / reliability jobs |

常量：`REPLY_WINDOW_MS=72h`、`EXPIRY_BEFORE_SLOT_MS=12h`、`CANCEL_NOTICE_MS=24h`、`AUTO_COMPLETE_MS=7d`、`NO_SHOW_LIMIT=2`、`NO_SHOW_PAUSE_MS=30d`。

## 8. 邮件模板（outbox）

`magic_link`、`work_email_code`、`request_received`、`request_accepted`、`request_rescheduled`、`request_still_looking`、`reminder_24h`、`debrief_prompt`、`attendance_prompt`、`waitlist_match`、`signal_alert`、`digest`、`export_ready`、`deletion_scheduled`。主题行文案在 `messages/en/common.json` 的 `Outbox.templates`，变量见各 action 的 `enqueue` 调用。

## 9. 后端需要补的字段 / 与架构的差异（待拍板）

| # | 问题 | 现状（预览的临时做法） | 建议 |
|---|---|---|---|
| 1 | `blocks` 缺 `blocker_id` | 从业者屏蔽把 id 编进行 id（`blk:<practitioner>:…`） | 表加 `blocker_id uuid` |
| 2 | `chat_requests` 没有学生共享字段的快照 | 从业者视图读实时资料 | 加 `shared_snapshot jsonb`（创建请求时按 `shared_fields` 冻结，FR-C11 更严格） |
| 3 | 人工审核证据（LinkedIn URL、备注） | 类型扩展 `PractitionerRecord` | `practitioner_profiles.review_evidence jsonb` 或独立表 |
| 4 | 学生停权 | 只能停权从业者；学生缺席仅暂停发起请求 | `profiles.suspended_until` |
| 5 | 取消没有邮件模板 | 取消不通知对方 | 新增 `request_cancelled` 模板 |
| 6 | magic link token / 频率限制 | 存在 outbox 的 `vars` 中 | 生产由 Supabase Auth 处理；频率用 `rate_limits` 表 |
| 7 | 技能 `growth_12m` | fixture 追踪起点设为 2024-06，所以技能也显示 12 个月变化 | 真实数据按 `available_after_days=730` 自动隐藏（机制已在 registry 与 engine 中） |
| 8 | ANZSCO 代码 | 只填了有把握的 11 个，其余显示"无单一代码" | M1 种子时核对 |
| 9 | 学习投入 / 可迁移性 | catalog 中的编辑估计，界面已注明"不是测量值" | 需人工维护或数据支撑 |
| 10 | 环境变量 | 无新增 | — |

## 10. 已知限制

- 全部数据为演示：市场数字合成，人物与雇主虚构（邮箱域名均为 `.example`），没有真实认证、邮件、存储或服务端鉴权；管理后台的权限只在客户端判断。
- 一个浏览器只有一个演示账号；删除账号后重新登录会新建。
- "All" 盘面的变化列混合了技能的 4 周变化与岗位的 12 个月变化（列头有说明）。
- 法律页为草稿，需法律审阅。
- 如需与设计稿核对：本分支未更新 Figma。
