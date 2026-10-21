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
