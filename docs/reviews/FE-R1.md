# FE-R1 审查记录（前端反馈第 1 轮 · batch A，分支 `fe-feedback-r1`）

## Round 1 — 退回

审查对象：`git diff dev...fe-feedback-r1`（HEAD 89e7c8f，4 个 commit，34 个文件）。范围与验收以主会话给出的 A1–A9 为准，参照 `docs/GLOSSARY.md`、`docs/PRD.md` §10、`CLAUDE.md` 质量底线。

验收命令结果：`pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build && pnpm test:e2e` 一次跑通，退出码 0。
- lint 0 错误；typecheck 0 错误
- vitest：15 个文件，137 个测试全部通过
- build 成功
- Playwright：44 个通过，2 个按设计跳过（仅桌面端的 nav/头像菜单用例在 mobile 下 skip），axe 无 serious 问题
- `test:db` 按要求未跑（需要 Supabase）

另外在生产构建（`pnpm start`）上手动测了几项：在 390/700/900/1280px 宽度下，`/market` 行内的名称列最窄 175px，不再塌缩；`/market` 上 from→to 那一行一处都没被截断；Demand 定义弹窗的实际渲染内容见阻断项 1。

### 必须修复（阻断）

1. [src/components/market/metric-info.tsx:45-55，调用处 src/features/market/board.tsx:42、:49 以及 src/app/page.tsx:90] 列头/区块标题上的 Demand 弹窗会显示一个百分比，但没有说明这是哪一项的占比。`BoardColumnHeader` 和首页 "Most asked-for skills" 都把第一行的 reading（`sample?.metric` / `skills.rows[0]?.metric`）传给了 `MetricInfo`，`shareLine` 于是渲染成类似 "That’s 30.0% of all 12,604 ads in this filter (share of ads)." 的句子。在生产构建上实测，`/market?type=skill` 的 "Job ads" 列头和首页都是这样，这里的 30.0% 其实是 Communication 一行的数，但弹窗里没有任何地方写出 Communication。
   — 为什么是问题：这是本批次新加的数字。它挂在整列的定义上，读者会以为是"整列/整个市场"的占比，或者根本读不懂。这违反 PRD §10.1 与 FR-D2（每个数字都要能解释自己，包括分子是谁）。GLOSSARY §3 让 share of ads 只作为"辅助说明"出现，前提是说明本身不能误导。
   — 建议：让 `MetricDefinition`/`MetricInfo` 区分两种场景。定义挂在列头或区块标题（不属于某一个 instrument）时，一律用 `ad_count.shareLineGeneric`：例如给 `MetricInfo` 加 `subject?: string` 参数，只有传了 subject 才显示带数字的 `shareLine`，并把名字写进文案（"That’s {share} of all {den} ads in this filter for {name}"），instrument 页和卡片上按需传入；或者列头干脆不传 reading 给这一行。`shareLine` 文案改动要放在 `messages/en/market.json`，另外补一个单测或 e2e，断言列头弹窗里不出现具体百分比。

### 建议（不阻断）

1. 首页 1024px 宽时，Demand 数值下面那行 "job ads in 28 days" 在 68px 宽的列里被截成 "job ads in…"（`src/components/market/metric-value.tsx` 的 `truncate`，实测 4 处）。单位 "job ads" 还看得到，也有 `title`，但时间窗被切掉了。可以给 `count` 类的 detail 用 `text-pretty` 让它换行，或者把 `@xl` 布局下的值列放宽一点。
2. 对比选择的状态放在客户端，切换 All/Skills/Roles 标签后仍会保留（同一路由软导航不会重置 state）。假设在 All 里选了一个 skill 再切到 Roles，所有行都会因为 type 冲突被禁用，而那个已选项在当前列表里看不到，只能靠底栏的 Clear 清掉。可以在 `CompareSelectionProvider` 里按 `type` 做 key，切换板块时重置；或者在底栏上显示已选项的名字。`src/features/market/compare-select.tsx:35`
3. 对比上限 2：`COMPARE_MAX` 与 `/compare` 只接收 `a`/`b` 这一点对得上。混选类型会被拦截，达到上限后会禁用并用 `title` 提示原因，`compareHref` 也带上了 `f`，处理得干净。只是被禁用的 checkbox 只靠 `title` 说明原因，键盘和读屏用户拿不到这个信息。可以把 `compareBlockedType`/`compareBlockedMax` 放进底栏的 `aria-live` 文案里。
4. `ThemeToggle` 的 `aria-label`/tooltip 在首次 effect 同步之前按 `resolvedTheme='light'` 渲染。系统是深色的用户在 hydration 前那一瞬间会读到 "Theme: Light. Switch to Dark"。图标本身靠 CSS `dark:` 变体，不会闪；hydration 后立即纠正，实际影响很小，记录在这里备查。
5. 实现者自己标出的遗留项，都不在本批次改动过的页面上，确认不阻断：
   - onboarding `mini-board.tsx` 仍写着 "Share of ads"
   - `src/lib/api/sample.ts:27-30` 里的示例 watchlist 仍用 `share_of_ads`，watchlist 页会显示一个已经不能在切换器里选到的 measure
   - `docs/FRONTEND_API_REPORT.md` 中 `getBoard` 的契约（`category`、`categories`、`sort: 'name'`）已经过时

   建议下一批统一清理，至少把 sample 改成 `ad_count`，免得演示账号一上来就看到一个"找不到入口"的 measure。
6. `/market?type=all&metric=share_of_ads` 会静默回退到 `ad_count`（`resolveBoardMetric`），而 `type=skill` 时保留 `share_of_ads`，只是切换器里没有对应选项被勾选。两种行为都能接受，但不一致，可以在代码注释或 `FRONTEND_API_REPORT.md` 里写明。

### 已核对、无问题的点（摘要）
- A1：`parseBoardType` 默认返回 `all`，`boardTypeParam` 让 URL 保持规范形式，`?type=skill|role` 仍然有效；面包屑改为显式 `type=skill`。
- A2：Filter 按钮带条件计数徽标，`activeConditionCount` 有单测；非默认筛选时显示一行 scope readback 和 Reset 链接；筛选仍编码在 `?f=` 里。
- A3/A4：`cat`、`categories`、`sort=name` 已彻底移除，没有残留引用；`?sort=az|name` 回退到 `value`；搜索框排在工具栏最前、宽度 `sm:w-80`。
- A5：注册表里 `ad_count` 的 `default_for: ['skill']`，`share_of_ads` 设为 `selectable: false`，但旧链接和 instrument 详情仍能算出它的 reading；fixture 引擎给 `ad_count` 设的 denominator 与 `share_of_ads` 用同一个 `universeCounts(filter)`，两者一致。文案都在 `messages/en/*.json` 里。
- A6：container query 下，行名列有 `minmax(150px|160px, …)` 的下限；Watch 按钮窄屏时文字变成 `sr-only`，可访问名称还在；axe 通过。
- A7：`parseStoredTheme` 把旧值 `'system'` 当作未设置；OS 监听只改 `systemDark`，已有显式选择时被 `resolveTheme` 忽略；`synced` 防止 SSR 的默认值覆盖首帧脚本；`THEME_SCRIPT` 已移到 `src/lib/theme.ts`，并有与之对照的单测；主题切换和设置页里都不再出现 System/Monitor。
- A8/A9：`PRIMARY_NAV` 只剩 Market、People；Sources 移到页脚的 "Data & safety"；`/compare`、`/sources` 路由保留；头像菜单不再出现 desk，`mobileMenuLinks` 去重后 desk 只出现一次，有单测。

## Round 2 — 通过

审查对象：`git diff 89e7c8f..a80ad14`（1 个 commit：`fix(market): name the instrument behind Demand's share line and tidy review follow-ups`）以及它改到的相关文件。

验收命令结果：`pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build && pnpm test:e2e` 一次跑通，退出码 0。
- lint 0 错误；typecheck 0 错误
- vitest：15 个文件，138 个测试全部通过（新增 `demandShare` 用例）
- build 成功
- Playwright：46 个通过，2 个按设计跳过（仅桌面端用例）；新增的列头弹窗用例确认列头弹窗里不出现未署名的百分比

Round 1 问题的处理情况：
- 阻断 1 已修复。`src/lib/metrics/demand.ts` 的 `demandShare(reading, subject)` 在没有 subject、metric 不是 `ad_count`、状态不是 ok 或分母为 0 时都返回 null。列头（`board.tsx`）、首页区块标题、onboarding mini-board、compare 行头都不传 subject，因此只显示通用说明。带数字的句子只出现在 instrument 页 hero、Key stats、Fundamentals 和 watchlist 行，这几处 reading 与 subject 属于同一个 instrument，文案 "{name} appears in {share} of all {den} ads in this filter" 写明了分子是谁。有单测，也有 e2e。
- 建议 1：`MetricValue` 的说明行改成 `text-pretty`，不再截断。
- 建议 2：`CompareSelectionProvider key={type}`，切换 All/Skills/Roles 时选择会重置。
- 建议 3：被禁用的 checkbox 通过 `aria-describedby` 关联一段 sr-only 的禁用原因。
- 建议 5：`sample.ts` 的 watchlist 与 onboarding 已改成 `ad_count`/Demand 措辞。
- 建议 6：`resolveBoardMetric` 与 `getInstrumentDetail` 只接受 `selectable` 的 metric，`?metric=share_of_ads` 在三类 board 和 instrument 页上都统一回退到默认 metric；有单测。

专项核对：(6) 会不会让 watchlist 的数值和它打开的页面对不上？
- watchlist 的链接（`src/features/student/desk/watchlist.tsx:179`、`:223`、`:232`）都经过 `instrumentPath(type, slug, filter)`，这个函数本来就不带 `metric`，所以 (6) 没有改动任何 watchlist 链接的行为。
- watchlist 行本身仍按 `row.item.metric` 计算数值（engine 仍支持 `share_of_ads`），旧条目会照常显示。
- 数值与页面不一致的情况在 dev 上就有：任何非默认 metric 的 watch 条目点进去都会落在默认 metric 上。对旧的 `share_of_ads` 条目来说，这是 A5 把默认值改掉带来的，不是 (6) 引起的。而且落地页 Demand 弹窗里就有带名字的 share 这一行，信息点一下就能看到。因此不阻断，见下面建议 1。

### 必须修复（阻断）
（无）

### 建议（不阻断）
1. 旧的 `share_of_ads` watch 条目：已存进 localStorage 的 demo DB，以及将来 Supabase 里的真实数据，都可能还有这种条目。它们在 watchlist 上显示百分比，点进去却看到 Demand 计数。可以二选一：
   - 让 watchlist 链接带上 `metric`（仅限 selectable 的 metric）；
   - 读取时把 `share_of_ads` 条目迁移成 `ad_count`，同时重置 baseline。注意两种度量的 baseline 不可比，不能只改 key。
2. `src/app/metrics/[key]/page.tsx:118`：`/metrics/share_of_ads` 的示例卡片仍链接到 `/s/<slug>?metric=share_of_ads`。经过 (6) 以后这个参数会被静默丢弃，卡片上显示的是 "4.1%"，打开的页面却是计数。可以改为：非 selectable 的 metric 链接到默认视图，并在该页和 `/metrics` 索引页注明 "Share of ads is explained under Demand"（GLOSSARY §3）；否则索引页仍把它列成一个独立的 common metric。
3. 示例 watchlist 改成 `ad_count` 以后，"since added" 显示的是原始计数的变化，会混进整个市场的涨落，而之前 `share_of_ads` 恰好能扣除这部分。这属于产品取舍，建议主会话在 `PROGRESS.md` 的"待拍板"里记一笔：watchlist 的 since-added 应该跟随 Demand，还是继续在后台用 share 计算。
