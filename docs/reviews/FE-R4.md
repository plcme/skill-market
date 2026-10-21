# FE-R4 审查记录（前端反馈第 4 轮：精简首页 / market / people，Fundamentals 整格可点，Watch 成为主按钮）

审查范围：`git diff dev...fe-r4-cleanup`（8 个 commit，e500a13..85012e4）。依据：用户反馈 8 条、`docs/DESIGN.md`、PRD §10 与 NFR-3（WCAG 2.2 AA）、CLAUDE.md 质量底线。按用户偏好，本轮不跑 e2e。

## Round 1 — 退回

验收命令结果：
- `pnpm lint && pnpm typecheck && pnpm test:unit`：全部通过（lint 0 错误，tsc 0 错误，vitest 23 个文件 243 个测试全过）
- `next-env.d.ts` 没有被改动，工作区干净

逐项结论（通过的部分）：
- **/market**：PageHeader 和 SignalsStrip 已删，保留了 sr-only `h1`。`getSignalsNow` 和它的单测（`tests/market-pages-logic.test.ts:189`）还在。`signals-strip.tsx` 已删除，没有残留引用。`useSignalMove` 和 `SignalTag` 在别处仍有使用。e2e 里 `main h1, main h2` 的可见性检查对 sr-only 元素仍然成立（1px 盒子）
- **首页 hero**：kicker 已删；`formatDate` 的 import 也一起删了
- **"What we won't do" 和 /people 的 "How it works"**：都已删除，对应的 message key 也删了。代码里没有引用已删 key 的地方。首页自己的 `Home.howKicker` 仍然有效
- **PractitionerJoinCard**：两页共用，用的是 `People.join*` 文案和 `PractitionerCta`（已登录的从业者会跳到 `/practitioner`）。卡片用 `h2`，标题层级没有问题
- **movers 主卡**：只有一个 stretched link（放在 `h3` 里，可访问名就是 instrument 名）。焦点环画在 `::after` 上，有 hover 态。prev/next 保留。reduced-motion 时不轮播。hover 或 focus 时暂停（`onBlur` 用 `relatedTarget` 判断是否真的离开了区域）。`aria-live` 的逻辑没有变
- **Fundamentals**：
  - 卡片结构：每格一个 absolute 链接，带 `aria-label="Show {metric} at the top"`，名字里包含格子里能看到的 metric 名。当前格有 `aria-current="true"`，并保留了 inset 指示条
  - 层叠：ⓘ 通过 `infoClassName="relative z-10"` 浮在链接之上。MetricValue 和 SourceBadge 里都没有可交互元素或定位元素，不会出现嵌套交互或点击被吞
  - 滚动：`#now` 自带 `scroll-mt-24`，`scrollIntoView` 会遵守它
  - 滚动和导航的时序：`onClick` 同步调用 `scrollToNow()`，之后 Next 的 Link 才执行 `preventDefault`，并在 transition 里 push。因为 `scroll={false}`，Next 既不会做 segment 滚动，也不会做 hash 滚动，不会和手动滚动打架。`pushState` 本身不会滚动
  - 路由切换：该路由下没有 `loading.tsx`，切换 `?metric=` 时旧 UI 会一直保留，直到 RSC 返回，所以 `#now` 不会消失。`#now` 上方的 header 不依赖 metric，平滑滚动的目标位置不会被 RSC 提交打乱
  - 点击当前格是纯 hash 变化：Next 不会请求服务端，手动滚动照常生效
  - 修饰键点击（新标签页）不会触发滚动
- **WatchButton**：
  - 默认变体：逐分支核对过。不传 `prominent` 时，size、variant（subtle / outline / primary）、`w-[108px]`、chevron 的 `-ml-px` 和 icon 尺寸都与 dev 完全一致
  - `prominent`：未关注是 accent 实心，已关注是 outline。skill 的拆分按钮是 `flex-1` 加 chevron，`cn` 会解决 px 冲突
- **详情页头部**：
  - 375px 下动作区是 `w-full` 的单列，下面的文字链接行可以换行
  - lg 下是 `auto` 列加 `sm:w-[340px]`
  - "Talk to someone" 的 `aria-label`（`talk.*`）以可见文字开头，满足 label-in-name；e2e 里 `/Talk to someone working in this industry/` 仍然能匹配到
  - 全局 `:focus-visible` 保证两个文字链接有焦点环
  - `talkNote` 已删除
- **文案**：新增的 `talkShort` 和 `showMeasureLabel` 都在 messages 里，没有写死的 UI 文案
- **PRD §10**：
  - 第 1 条：首页和 market 去掉了周日期后，时间窗仍在每个数字的 ⓘ 里一次点击可见；market 底部保留了 "Sources and method"
  - 没有引入排名或赤字式表达

### 必须修复（阻断）
1. [src/features/home/movers-carousel.tsx:71-80] **触屏用户无法停止自动轮播，违反 WCAG 2.2.2 Pause, Stop, Hide（A 级），也就违反 PRD NFR-3 的 WCAG 2.2 AA。**
   - 现状：主卡每 8 秒自动切换，和其他内容同时展示。去掉暂停按钮后，唯一的暂停手段是 hover 或 focus。手机上没有 hover；iOS Safari 点按钮时也不会给按钮焦点。所以触屏用户没有任何办法停下轮播，读到一半卡片就会被换掉
   - 修法：不需要把按钮加回来，也能同时满足用户要求和标准。任选一种：
     - (a) 只在 `(hover: hover) and (pointer: fine)` 的设备上自动轮播，可以和 reduced-motion 一起放进 `useSyncExternalStore` 判断
     - (b) 区域内任意一次 `pointerdown` 或 prev/next 点击后，本次会话不再自动轮播
   - 如果主会话和用户明确接受这个合规风险，请记入 PROGRESS.md 的"待拍板"，再把本条降级
2. [e2e/frontend.spec.ts:214-223] **e2e 用例 "movers carousel states its rule, advances and can pause" 必然失败。** 第 219 行断言 `Resume rotation` 按钮可见，而这个按钮在本分支已经删掉。本轮虽然不跑 e2e，但上 main 前的全量 e2e 会红。
   - 修法：删掉这条断言；把用例改为验证三件事：reduced-motion 下不轮播；Next 能切换；主卡的 `h3` 内链接指向 `/s|r|i/<slug>`
   - 建议同时给 Fundamentals 加一条 e2e：点击非当前格后，URL 带上 `metric=`，`#now` 进入视口，该格变为 `aria-current`

### 建议（不阻断）
1. [src/features/market/measure-cell-link.tsx:53-57] **焦点管理。** 用键盘或读屏点格子后，视口滚到了 `#now`，焦点却还留在 Fundamentals 里：下一次 Tab 会把页面滚回下方，读屏用户也听不到标题数字已经变了。建议导航完成后，把焦点移到 `#now-h`（加 `tabIndex={-1}`，用 `focus({ preventScroll: true })`）。实现上可以用 `useEffect` 监听 metric 的变化，或者在 `#now` 区加 `aria-live="polite"` 播报新的度量名
2. [src/features/market/instrument-view.tsx:610-617] **点击区域偏小。** 头部两个文字链接是 13px、行内排布，高度大约 20px。按 2.5.8 的间距例外可以算合规，但在手机上偏小。建议给链接加 `py-1`，或加 `min-h-6`
3. [src/features/market/measure-cell-link.tsx:9-16] **reduced-motion 判断重复。** `scrollToNow` 里的判断和 movers-carousel 的 `readReducedMotion` 是两份。可以抽到 `src/lib` 共用。纯属整洁问题
4. [src/features/community/practitioner-join-card.tsx:6] `className` 参数目前没有调用方用到。可以留着，也可以删

## Round 2 — 通过

审查范围：`git diff 85012e4..fe-r4-cleanup`（e247e26..650e6cf，共 10 个 commit）。

验收命令结果：
- `pnpm lint`：0 错误
- `pnpm typecheck`：0 错误
- `pnpm test:unit`：
  - 首次全量跑时，`tests/student-auth.test.ts` 里的一个用例 5s 超时。当时机器 load 约 5.7，本分支没有改动这个文件
  - 这个文件单独跑：6/6 通过
  - 再次全量跑：24 个文件、251 个测试全部通过。判定为负载导致的偶发失败
- 按用户偏好没有跑 e2e。e2e 用例已随改动同步更新（见下）
- `next-env.d.ts` 没有变化

### Round 1 阻断项复核
1. **触屏无法停止轮播：已修复。**
   - 只有 `(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)` 时才自动轮播
   - SSR 快照为 false，首屏不会轮播
   - 区域内任何 `pointerdown`、`keydown` 或 prev/next 都会把 `stopped` 置为 true，本次会话不再重置
   - hover 和 focus 时仍然暂停
   - 停止后 `aria-live` 变为 `polite`，用户自己翻页时会被播报
   - 结论：鼠标用户可以靠 hover 暂停，键盘用户可以靠 focus 暂停，触屏设备不轮播，满足 WCAG 2.2.2
2. **e2e 用例：已修复。** `frontend.spec.ts` 的轮播用例删掉了 `Resume rotation` 断言，改为检查主卡 `h3` 里的链接 href 匹配 `/^\/(s|r|i)\/…$/`

Round 1 的建议也已采纳：
- 点击 Fundamentals 格子后，焦点用 `preventScroll` 移到 `#now-h`（`tabIndex=-1`）
- 头部两个文字链接加了 `py-1`
- reduced-motion 的判断抽成了 `prefersReducedMotion()`

### 新范围逐项结论
- **标题即筛选入口（`TitleFilter` + `FilterBar trigger`）**
  - 可访问名：`aria-label` 是 "{in + 句子}. Change filter"，以可见文字开头，满足 label-in-name。Radix `DialogTrigger` 会补上 `aria-haspopup`、`aria-expanded` 和 `aria-controls`
  - ref 传递：项目用的是 React 19，ref 作为普通 prop 经 `...rest` 落到 `<button>` 上，Radix 能拿到 triggerRef
  - 焦点归还：Apply 时先 `setOpen(false)`，焦点回到标题按钮，然后才在 transition 里 `router.replace`。按钮所在的组件树不会重新挂载（`InstrumentView` 没有随筛选变化的 `key`），客户端导航时 `useSearchParams` 也不会让它重新进入 Suspense，所以焦点不会丢到 body。Esc 和关闭按钮走的是同一条路径
  - 375px：按钮是 `inline`，按 button 的规则实际表现为 inline-block，长句会在按钮框内换行；`h1` 有 `break-words`，不会横向溢出（对应的 e2e 375px 用例已更新）
- **URL 参数保留**：`useSetParams` 复制现有的全部参数，只改 `f`，所以 `metric`、`y`、`by` 都会保留。e2e 断言了 Reset 再 Apply 之后，`y=salary` 和 `by=mode` 仍在
- **/market 的 Filter 按钮**：`variant="button"` 分支没有改动，没有回归
- **吸顶 readback**
  - 吸顶的参照是 `SheetContent` 的滚动容器（`overflow-y-auto px-5 py-5`）。`-top-5 -mt-5 -mx-5` 加上 `px-5 pt-5` 正好抵消容器的内边距，底色是和容器相同的 `bg-surface`，`z-10`。吸住以后上沿在滚动区之外，滚动的内容只会从它下面经过，不会透出来
  - 手机底部 sheet 和桌面侧栏用的是同一个 `SheetContent`
  - `FilterEditor` 目前只有两个调用方，都在 `SheetContent` 里（FilterBar 和 watchlist 的编辑弹层）
- **面板顺序和地点**
  - 顺序符合要求：Work rights → Level → Places/Work mode/开关 → Advanced
  - 没有缩小地点时，显示一个不可删除的 "All Australia" 描边 pill，加 "Narrow to a state or city"；缩小后显示 chip 和 "Add another place"
  - 删掉最后一个 chip 时，`placesOrAllAustralia` 会回到 `['au']`。Advanced 规则里也一样，所以 `placeRequired` 和对应文案可以安全删除
  - 选择器只列 `PICKABLE_LOCATIONS`，即 au 下的州、市和区域，有单测
- **去掉 NZ**
  - locations、engine 权重、薪资系数、seed 里的从业者（改成 Brisbane）、时区白名单都已清理
  - `supabase/`、`scripts/`、`messages/` 里没有残留
  - 旧分享链接里如果带 `nz`，`decodeFilter` 会用 `getLocation` 过滤掉；规则因此为空时，`normaliseFilter` 会回落到默认值，不会报错
- **Split by 的维度禁用**
  - `fixedSplitDimensions` 的判断：seniority 不含 `other` 时固定 experience；rights 只剩一个桶时固定 rights；所有 pair 只有一种 mode 时固定 mode
  - route 里用 `effectiveSplit`，与筛选冲突的 `by` 会画成不拆分。菜单里对应选项为 disabled，副标题显示 "Fixed by your filter"
  - 单测覆盖了 entry、graduate、单 mode、"两个 mode"、"一个 mode 加 remote-anywhere" 和 npr 这几种情况
  - 原来的 `graduateOnly` 重命名逻辑删掉了。现在只要 seniority 不是 `all`，experience 就被禁用，所以这段逻辑已经用不上，删除是对的
- **被删的 helper 和 key**
  - 代码里已没有引用：`isAllAustralia`、`clearScopeCondition`、`resetPlaces`、`instrument-places.tsx`、`ScopeChips`、`places.button/title/close/reset`、`scope.*`、`graduateBucket/Short`、`filteredToGraduate`、`placeRequired`、`addPlace`
  - `levels.country` 已删；`INDENT` 里虽然还留着 country，但选择器不会列出 country 级别，不会用到这个 key
- **文案**：新文案都在 messages 里，`titleFilter.workModes` 的 6 种组合都齐了

### 必须修复（阻断）
（无）

### 建议（不阻断）
1. **需要用户拍板：筛选 "No PR stated" 时是否仍允许按 Work rights 拆分。**
   - implementer 的做法：npr 下还剩 `not_stated` 和 `sponsorship_ok` 两个桶，所以不禁用。语义上说得通，engine 也会给出 `filtered_to`，图下会显示 "Filtered to Not stated, Sponsorship OK"
   - 问题：在演示模型里，`sponsorship_ok` 只占开放岗位的 6%（`src/lib/market/engine.ts:157`）。多数标的、尤其是窄地点时，这一档会被标为 thin，图上几乎只剩一条带
   - 两种选择：(a) 保持现状；(b) npr 下也禁用 rights，副标题写 "Fixed by your filter"
   - 建议记入"待拍板"
2. [src/lib/filters/spec.ts，`titleFilterLabel`] **标题句子会出现字面矛盾。** 简单筛选带 remote-anywhere 时，句子会读成 "Sydney + remote · On-site or hybrid"（单测 `oh.au-nsw-sydney*r.au_entry_npr` 就是这个结果）："+ remote" 后面紧跟 "On-site or hybrid"。两种改法：
   - 在 `includeRemoteAnywhere` 时把 mode 写进地点前，例如 "On-site or hybrid in Sydney + remote anywhere"
   - 或者在这种情况下省略 mode 段
3. [src/components/market/filter-builder.tsx:251] **吸顶的负边距写死了 `SheetContent` 的 `px-5 py-5`。** 如果以后有人把 `FilterEditor` 放进别的容器，负边距就会溢出。可以把 readback 改为 `SheetContent` 的一个固定（不滚动）slot，或者在注释里写明只能在 `SheetContent` 内使用
4. [src/features/market/instrument-chart.tsx:70] **URL 里的 `by` 会悄悄留下。** 如果 URL 里的 `by` 被筛选固定了（画成不拆分），在菜单里选 None 不会清掉它，因为 `next === by` 都是 null，URL 会继续带着 `by=mode`。放宽筛选后拆分会自动回来，可以视为特性；如果想让 URL 干净，可以在 `by` 无效时写入 `by=none`
