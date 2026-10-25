# FE-R8 审查记录

审查范围：`git diff ec02399...fe-r8`（5 个 commit），只看改动文件。按主会话要求，本轮不跑 e2e / Playwright。

## Round 1 — 退回

验收命令结果：
- `pnpm lint`：通过（0 error，0 warning）
- `pnpm typecheck`（`next typegen && tsc --noEmit`）：通过
- `pnpm exec vitest run --maxWorkers=2`：307/307 通过（其中新增 `tests/market-intro.test.ts`，覆盖 `shouldShowIntro`、`isBareEntry`、`hasSessionCookie`、`introSeenCookie`、`hasIntroCookie`、`flipTarget`、`marketEntryHref`）
- 禁改文件（`nav-model.ts`、`watch-button.tsx`、`desk-view.tsx`、`messages/en/common.json`、`messages/en/community.json`）：diff 里都没有出现，未被改动

已核对、没有问题的部分：
- 重定向：`/` 用 `redirect(marketEntryHref(...))`，是 307；query 原样保留（数组取第一个值），`?f=` 在同一跳里去掉。到了 `/market`，`canonicalMarketQuery` 返回 null，不会再跳第二次；`f=` 为空或 `['', x]` 时也只走 `toQueryString`，不会循环
- 门控：由服务端判断（`cookies()` + `isBareEntry(sp)`），band 不会闪现。`hasSessionCookie` 只看 cookie 是否存在，排除了 `-code-verifier`，chunk 后缀也能识别。cookie 值固定写 `1`，不读用户输入，没有注入面。deep link 不写 cookie，`IntroSeenRefresh` 只给已有的 cookie 续期，或在 preview 登录态下补写
- Hydration：`IntroPager` 和 `IntroSeenRefresh` 都在 effect 里才碰 `document` / `window`，渲染时返回 `null`；`useDB()` 在 SSR 和 hydration 阶段返回 null，只影响 effect，不影响标记
- 自身滚动的识别（`pending` ±2px）、边缘 1px 容差、smooth 滚动被打断后重算、浏览器把目标位置 clamp 后不会再发 scroll 事件，所以没有死循环。所有监听器都是 passive，卸载时全部移除，并清掉 timer。没有 `scrollend` 时退回 120ms 防抖，iOS 的惯性滚动会不断重置这个 timer。手指按着时不会吸附。reduced-motion 下改为瞬时跳转。band 比视口高时 `boardAnchor()` 返回 null，吸附自动关闭
- 标题层级：sr-only 的 `h1` 在最前，接着是 band 的 `h2`、heat 的 `h3`、board 的 `h2`。CTA 是真正的 `<a href="#board">`，没有 JS 也能用；`#board` 带 `scroll-mt-[65px]`，和 JS 算出来的 anchor 一致。band 高度由 CSS 固定，`animate-rise` 只动 transform 和 opacity，不会引起 layout shift
- 文案：只放在 `messages/en/home.json`，删掉的 key 在别处都没有引用，剩下的 key 都有用到。没有写死产品名。`movers-carousel.tsx` 已删干净；`PractitionerJoinCard` 和 `AUTO_ADVANCE_QUERY` 别处还在用，保留合理

### 必须修复（阻断）

1. [src/features/market/intro-pager.tsx:62-77，配合 :35-41] 用键盘移动焦点引起的滚动也会被"翻页"纠正，焦点元素会被滚出视口；点 CTA 后焦点也没有跟到 board。
   - 为什么是问题：
     - band 下面露出来的是 board tabs。用户在 y=0 时按 Tab 进入 board 的第二、三个控件，浏览器只会滚动刚好够露出该控件的距离（几十到一两百 px），远小于 `anchor / 2`。滚动停下后 `settle()` 把页面拉回 0，刚获得焦点的控件就到了视口下方，看不见了（WCAG 2.4.11 Focus Not Obscured、2.4.7）
     - 反方向同理：用户在 board 时 Shift+Tab 回到 band，也会被弹走
     - CTA 用 JS 处理时调用了 `preventDefault()` 再平滑滚动，焦点留在 CTA 上。下一次 Tab 落到 "Personalise"，页面被拽回 band 中段，接着又被吸附。原生锚点跳转会把焦点起点移到 `#board`，这一点 JS 路径丢了（2.4.3）
   - 建议：
     - `settle()` 里加一道保护：如果 `document.activeElement` 在 `main` 内，并且按 `target` 滚过去后它会落在视口外，就不要吸附（或者改为吸附到包含它的那一页）。也可以在最近一次 `keydown` 或 `focusin` 之后的短时间内跳过吸附
     - `FlipToBoardLink` 滚动后把焦点移到 board：给 `#board` 加 `tabIndex={-1}`，调用 `focus({ preventScroll: true })`
     - 补一个单测，把"是否跳过吸附"写成纯函数来测

2. [src/features/market/intro.ts:69-73，src/features/market/intro-pager.tsx:73] `flipTarget` 只按"过不过半"来判断，不管滚动方向，导致小步滚动总被弹回原处。
   - 为什么是问题：
     - 1280×800 下 anchor 约 640px，要一次滚过约 320px 才能翻到 board
     - 鼠标滚轮一格约 100px，停顿超过约 150ms 就会触发 `scrollend`，页面被拉回 0；键盘方向键一次约 40px，单次按键永远离不开 band
     - 在 board 顶部往上滚一点，也会被拉回 board
     - 结果是滚轮用户和方向键用户会觉得页面在跟自己对抗。尤其是方向键用户，只能靠 Space、PageDown 或长按才能离开 band，这已经是键盘可操作性的问题
   - 建议：
     - 改成按方向判断：记录上一次静止时所在的页（0 或 anchor）。从 0 往下离开超过一个小阈值（如 `min(48px, anchor * 0.1)`）就翻到 board；从 anchor 往上离开超过阈值就翻回 band；没有离开静止页时，才用"过半"规则兜底
     - 签名可以改为 `flipTarget(y, anchor, restedAt)`，并补上单测
     - 这会改动 brief 里写定的"past half"规则，请主会话在 `docs/DESIGN.md` 里同步说明

3. [src/features/market/intro-band.tsx:19、45-47] 手机（`max-sm`）和矮屏上，`HEAT_HEAD` 用的是 `sr-only`，"All industries" 链接看不见，却仍然能被 Tab 聚焦。
   - 为什么是问题：键盘或开关控制的用户会聚焦到一个不可见的元素，焦点指示也看不见（WCAG 2.4.7）
   - 建议（二选一）：
     - 在这两种条件下让链接可见（只隐藏 kicker 的视觉）
     - 给链接加 `focus:not-sr-only`，并让它聚焦时出现在合理位置

### 建议（不阻断）

- `src/components/shell/wordmark.tsx:17`、`src/app/not-found.tsx:16`、`src/features/student/auth/signout-view.tsx:40` 仍然链到 `/`。现在每次点击都要多一次 307 往返（客户端导航也一样）。可以直接改成 `/market`，`/` 只留给外部入口。
- 手机上 `HeatmapSource` 被隐藏了，sr-only 表格里的数字在读屏路径上就没有来源和时间窗。可以把 source 文案也做成 sr-only 留着，或者把它放进表格的 caption。
- `IntroPager` 没有监听 `resize` / `orientationchange`。旋转屏幕后如果正好停在中间位置，要等下一次滚动才会纠正。不影响正确性，可以在 resize 结束后调一次 `settle()`。
- `boardAnchor()` 用 `document.querySelector('header')` 取第一个 `header`，目前确实是 `SiteHeader`。但这依赖 DOM 顺序，以后在它前面插入任何 `<header>` 都会算错。建议给站点 header 加一个 id 或 data 属性，再按它来取。

## Round 2 (Attempt 2) — 退回

审查范围：`git diff origin/main...fe-r8`（merge-base = `origin/main` = `2eb904e`），只看改动文件。未跑 e2e。

验收命令结果：
- `pnpm lint`：通过（exit 0，0 error）
- `pnpm typecheck`（`next typegen && tsc --noEmit`）：通过（exit 0）
- `pnpm exec vitest run --maxWorkers=2`：32 个文件，354 passed / 13 todo，0 失败

Attempt 1 各项核对：
- 阻断 1（键盘焦点与吸附）：已修。`skipSnap` 是纯函数，有单测；`keydown`/`focusin` 后 600ms 内不吸附；焦点只认 `:focus-visible`。CTA 滚动后 `#board.focus({ preventScroll: true })`，`#board` 有 `tabIndex={-1}`。自身 flip 到达时先判断 `pending`，再判断 skip，所以 CTA 回车不会被 skip 卡住
- 阻断 2（方向规则）：已按用户选择的方向规则实现，`flipTarget(y, anchor, restedAt)`、`flipThreshold`、`restingPage` 都有边界单测（阈值、边缘 1px、退化 anchor、null 时过半）。但 `restedAt` 的维护有问题，见下面阻断 1
- 阻断 3（sr-only 链接可聚焦）：已修。`cn()` 不会把 `[@media…]:sr-only` 和 `[@media…]:focus:not-sr-only` 合并掉（修饰符不同），`:focus` 的优先级更高
- 建议项：`/` 链接（wordmark、not-found、signout）改为 `/market`；`HeatmapTable withSource` 把来源和时间窗放进 caption（`Sources.kinds.ads` 存在，文案在 `messages/en/market.json`）；resize / orientationchange 结束后会重新 settle；`data-site-header` 已加。都已落实

已核对、没有问题的部分：
- 合并结果 `src/app/market/page.tsx`：相对 `origin/main` 只多了 `cookies` 导入、intro 两行导入、Fragment、`h1` 上移、`IntroBand`，以及 `#board` 的 `id`、`tabIndex`、`scroll-mt`。`SearchableBoard` 的 props、`CompareSelectionProvider`、`canonicalMarketQuery` 重定向、`WatchingTabCount` 都和 main 一致。`SearchableBoard` 在 `#board` section 里面，band 在 `Container` 外面。没有丢失 main 的导入或逻辑
- iOS 工具栏收放：band 高度用 `svh`，不随工具栏变化，anchor 不会变，`rest` 不会被误清。`boardAnchor` 的高度判断用 `innerHeight`，工具栏收起后只会更宽松。惯性滚动期间 `touching=false`，`scroll` 事件不断重置 timer，或者等到 `scrollend`；手指按着时 settle 直接返回
- 自身 flip：到达后 `remember` 先把 `rest` 更新为目标页，再按 `pending` 判断是不是自己触发的。anchor 在滑动途中变了也只会变成 `restedAt=null`，不会死循环
- workflow：curl 在不加 `-L` 时，`%{redirect_url}` 会按请求 URL 把相对的 `Location: /market` 解析成绝对地址，所以比较 `307 https://brewdex.app/market` 是对的。默认 shell 是 `bash -e`，`root=$(curl …)` 网络失败时 step 直接失败，HTTP 非预期时显式 `exit 1`。引号和 `[ … != … ]` 都正确
- 文案都在 `messages/en/*`，没有写死产品名；`src/app/page.tsx` 读了 `searchParams`，是动态路由，不会在构建时就固化成重定向

### 必须修复（阻断）

1. [src/features/market/intro-pager.tsx:80-84、94-112] 访客在中间位置停下后，`restedAt` 仍然指向上一次的静止页，方向判断用的是过期的起点，页面会往和用户刚才相反的方向翻。
   - 为什么是问题：`rest` 只在落到 0 或 anchor 时更新。下面两种情况会在中间位置停下，`rest` 却保持不变：
     - 我们自己的 flip 被打断。例：anchor=640，停在 band，滚轮下一格到 100，开始 smooth 滚向 640。途中用户反悔，在约 350 处往上滚一格，停在 250。settle 时 `pending` 不匹配，`flipTarget(250, 640, 'band')` → 640，又被送回 board。只要用户不一次退到 48px 以内，往回滚就总是被推回 board。iOS 上手指按住打断滑动、往上拖到 200 再松手，结果也一样
     - 吸附被 `skipSnap` 跳过。例：用方向键往下走到 200（每一下都在 600ms 内，全部跳过），然后改用滚轮往上一格到 100。`flipTarget(100, 640, 'band')` → 640：用户在往上滚，页面却翻到了 board
   - 方向规则本来就是为了解决"页面跟用户对着干"，这两种路径又把这个问题带了回来。
   - 建议：
     - 只要一次 settle 结束在中间位置并且留在那里（`skip` 为真，或者自己的 flip 被打断），就把 `rest.page` 置为 `null`。下一次判断会退回"过半"规则：上面第一个例子是 250 < 320，回到 band；第二个例子是 100，也回到 band
     - 这部分状态转移可以抽成纯函数（例如 `nextRest(prev, { y, anchor, outcome })`），补上单测：被打断的 flip 和被跳过的吸附都应该清空 `restedAt`

### 建议（不阻断）

- [src/app/market/page.tsx:59] `#board` 加上 `outline-none`，和 `main#main` 的做法一致。现在用键盘回车点 CTA 时，程序会把焦点移到 `#board`。按 Chrome 的启发式规则，这时会匹配 `:focus-visible`，`theme.css:190` 会给整个 board 画一圈 accent 外框。
- [src/features/market/intro-pager.tsx:36-41、115] `keyboardFocusRect` 没有排除不随页面滚动的元素。如果焦点停在 sticky header 或固定的手机 tab bar 上（键盘用户第一次按 Tab 通常先落在 header），`skipSnap` 会以为这个元素会被滚出视口，结果往下（header）或往上（tab bar）的 flip 全被跳过，直到焦点离开为止。不会跟用户对着干，但 flip 会失效。建议只对 `main` 内、并且不在 sticky/fixed 祖先里的元素做检查。
- [src/features/market/intro-pager.tsx:146] `focusin` 也会被鼠标点击触发。`#board` 和 `main` 都是 `tabIndex=-1`，在 board 里任何空白处点一下都会聚焦它们，于是接下来 600ms 内不吸附。影响很小，可以只在 `keydown` 时记录，或者 `focusin` 时检查 `:focus-visible`，并把变量名改得和实际行为一致。

## Round 3 (Attempt 3) — 通过

审查范围：`git diff 6b01d1a..fe-r8`（`791586a`），只看改动文件。未跑 e2e。

验收命令结果：
- `pnpm lint`：通过（exit 0）
- `pnpm typecheck`：通过（exit 0）
- `pnpm exec vitest run --maxWorkers=2`：32 个文件，362 passed / 13 todo，0 失败（一次跑通）

### Attempt 2 阻断项核对：已修

`settleStep` 是纯函数，逐条核对如下：
- **自己的 flip 被打断**：`pending` 不为 null，且 y 离目标超过 2px 时，`restedAt` 视为 null，按"过半"判断。
  - 例 A：band → 100 → 开始 flip，被打断后停在 250，结果回到 band。
  - iOS 手指按住拖到 200，结果相同。
  - 继续往下过半（400），结果到 board。
  - 往上翻的 flip 被打断，对称处理。
  - 这几种情况都有单测。
- **吸附被否决**：返回 `rest.page = null`。
  - 例 C：方向键走到 40、200，再用滚轮往上到 100，结果回到 band。有单测。
  - e2e 里也补了一步"停在中间后往上一点回到 0"。
- **其他会留下过期状态的路径**：
  - fit guard 生效（`anchor === null`）时，`rest` 和 `pending` 全部清空。
  - anchor 变化后，旧的 `rest` 不再被采信。
  - 手指按着时 settle 直接返回，状态不变，松手后再 settle。
- **2px 落点容差**：只在 `pending` 不为 null 时生效，作用是把落点归到目标页。
  - 最多让页面停在离边缘 2px 以内，看不出来，也不会再次触发 flip。
  - 如果 `pending` 是旧 anchor，而 anchor 已经变了，落点会被判成中间位置，然后按"过半"吸到新 anchor 一次，之后就收敛了。
- **mount 时只记录不吸附（`settle(false)`）**：
  - 停在边缘时，记录对应的页。
  - 停在中间时，`rest` 为 null，不会滚动。
  - 之后浏览器恢复滚动位置时会触发 scroll 事件，正常走一次 settle。
- **`registerFlip`**：
  - mount 时设置，unmount 时置 null。
  - React 在同一次 commit 里，会先执行所有 passive unmount，再执行 mount。所以 StrictMode 的双次 effect 和客户端导航换页都不会留下过期回调。
  - 页面上最多只有一个 `IntroBand`，所以不会同时挂两个 pager。
  - CTA 回车：到达时按落点判断，在调用 `skip` 之前就返回，不会被键盘静默期卡住。CTA 的滑动被打断时，同样按"过半"判断。

### Attempt 1 修复：无回归

- `skipSnap` 及其单测没有改动。
- `keyboardFocusRect` 现在排除 `main` 外的元素和位于 fixed/sticky 祖先内的元素，attempt 2 的建议 2 已落实。
- `focusin` 只在目标匹配 `:focus-visible` 时才记一次键盘操作；Tab 本身仍由 `keydown` 记录，attempt 2 的建议 3 已落实。
- `#board` 加了 `outline-none`，attempt 2 的建议 1 已落实。

### 必须修复（阻断）

无。

### 建议（不阻断）

- [src/features/market/intro-pager.tsx:57、156] cleanup 里无条件执行 `registerFlip = null`。目前只有一个 pager，所以没有问题。如果以后可能同时挂多个 pager，建议改成只在 `registerFlip` 仍是本实例的回调时才清空。
- [src/features/market/intro-pager.tsx:68] 如果点击 CTA 时页面已经在 anchor，`scrollTo` 不会产生滚动，`pending` 会一直留到下一次 settle。影响只有一次：下一次判断按"过半"规则，而不是按方向规则。可以在 `registerFlip` 之前判断 `Math.abs(window.scrollY - anchor) > 2`。

## 整合复查 — 2026-10-24

- 范围为原七个 FE-R8 提交（含 `18c5eb2`）与 main 累计功能；上面的 Round 1 是历史发现。
- 键盘输入静默期、焦点可见性检查、CTA 后转移焦点已实现，避免吸附把键盘焦点移出视口。
- 窄屏和矮屏的行业链接聚焦后可见，来源信息保留在读屏表格标题里；resize / orientationchange 监听使用专用站点 header 标记。
- 过半才翻页仍是现有产品规则，慢拨滚轮可能回到开场区块；保留供用户体验后决定，不擅自改交互。
- 发布健康检查已跟随 FE-R8 新增的根路径重定向；模糊搜索的 SearchableBoard 与首访开场区块同时保留。
- 原型 cookie 只用于开场展示，不是认证边界。真实 Supabase 会话读取仍待接入。
- 本地与 PR CI 结果在交接时记录；尚未完成的浏览器检查不记为通过。

## Follow-up — instant flip & always-on landing — 退回（RETURN）

范围：`git diff bec4f18..fe-r8`（`14c0e48`..`875d5da`，4 个提交）。

验收命令结果：
- `pnpm lint`：通过（exit 0）
- `pnpm typecheck`：通过（exit 0）
- `pnpm exec vitest run --maxWorkers=2`：32 个文件，376 passed / 13 todo，0 失败（一次跑通）
- e2e 按要求未跑。另用 headless Chromium 对 `localhost:3008` 做了只读探针。注意 `127.0.0.1:3008` 上 dev 资源被拦，页面不 hydrate。
  - 滚轮：band 上一格滚到 anchor（643），board 内往下为原生滚动，anchor 处往上回到 0，ctrl+滚轮不翻页。
  - 触摸：拖 80px 后松手，翻到 anchor，期间 root 为 `overflow:hidden`，结束后恢复为 `''`；拖 30px 弹回。翻页中途再按下手指，overflow 立即释放；`touchcancel` 后由 settle 收尾；翻页中途切换路由，overflow 恢复。
  - 五个 board tab 的字体、字号、颜色、字重一致，底边对齐（1280 / 375 两种宽度都量过）。

### 必须修复（阻断）

1. [src/features/market/intro-pager.tsx:215] 滚轮路径没有判断页面缩放，双指缩放后无法用滚轮平移，用户会被困住。
   - 为什么：触摸路径会检查 `visualViewport.scale > 1.01`，滚轮路径只排除了 `ctrlKey`（即缩放手势本身）。桌面 Chrome / Safari 在触控板上双指放大后，普通双指滑动用来平移 visual viewport；现在这些滚动被 `preventDefault`，直接翻页。放大阅读 band 的低视力用户无法用触控板看到 band 的下半部分：往下一滑就翻到 board，往上又翻回 band 顶部。
   - 建议：`onWheel` 里加与触摸相同的缩放判断，放大时一律走原生。最好把 `zoomed` 作为 `wheelStep` 的输入并补单测。
2. [src/features/market/intro-pager.tsx:218-221] 对不可取消的 wheel 事件仍然启动翻页和锁，tween 会和原生惯性同时滚动。
   - 为什么：Chrome（WebKit 类似）的规则是，一个滚动序列的第一个 wheel 事件没有被 `preventDefault`，后续事件就以 `cancelable: false` 异步派发，`preventDefault` 无效（控制台会提示 intervention）。典型场景是已知偏差 1：在 board 内（y > anchor+1）开始一次向上的触控板手势，前几个事件走原生；越过 anchor 时调用 `flip(0)`，但这次和锁期内的"吞掉"都不生效。原生惯性和每帧的 `jumpTo` 同时改 `scrollY`；easeOutCubic 末段速度趋近 0 时惯性仍在，页面会逐帧往回跳，落点附近抖动。
   - 建议：`!e.cancelable` 时不翻页、不上锁，按 native 处理，由 settle fallback 收尾。或者对这类事件像触摸一样在 tween 期间锁住 root 的 overflow，但要注意桌面滚动条消失导致的横向跳动。纯逻辑部分可以把 `cancelable` 传进 `wheelStep` 并补单测。
3. [src/app/market/page.tsx:50 与 src/components/market/use-url-state.ts 的 `router.replace`] band 现在对所有人常驻，而在 band 下方操作 board（搜索 `?q=`、Sort、List/Cards、Skills 的 layer）会把 URL 变成 deep link，band 在用户操作时被卸掉，内容整体上移约一屏。
   - 为什么：Chromium 探针里，翻到 board 后在搜索框输入 "dat"，band 消失，`scrollY` 从 643 变为 32。Chrome / Firefox 靠 CSS scroll anchoring 把视口保持住了。Safari / iOS（目标用户主要在手机上）没有可靠的 scroll anchoring：`scrollY` 保持不变，刚点的控件和正在输入的搜索框会被推出屏幕外约 600px；清空搜索时 band 又插回来，再跳一次。
     - 这个问题以前只在首访出现，cookie 移除后每次访问都会遇到。
     - 用户要求的"deep link 不显示 band"指的是打开的入口，不是在 landing 上操作控件。
   - 建议（二选一，或交主会话拍板）：
     - (a) 同一个页面实例里，band 不因页面内的 `router.replace` 消失。例如由客户端记住"本次进入时是 bare"，或给页面内控件的导航带上保留标记。
     - (b) band 卸载 / 插入时显式补偿滚动：用 layout effect 记录 `#board` 的视口位置，变化后恢复；浏览器已经做过 anchoring 时，补偿为 no-op。
     - 无论哪种，都给逻辑部分补单测，e2e 补一个"board 上改 sort 后 tab 仍在视口内"的断言。

### 建议（不阻断）

- [src/components/shell/site-footer.tsx:10] footer 的 Market 链接仍指向 `/market`（landing），header、手机菜单和 tabbar 的 Market 都指向 `/market#board`。如果要统一，改成 `MARKET_BOARD_HREF`；如果有意让 footer 回 landing，可以不改。
- [src/features/market/intro-pager.tsx:217] 每个 wheel 事件都调用 `boardAnchor()`，会读 `getBoundingClientRect`、`getComputedStyle(header)` 和 `scrollHeight`。而且 window 上挂了 non-passive 监听，整页滚轮都要等主线程。
  - Lighthouse 的 passive 审计只标记不调用 `preventDefault` 的监听，这里不会被标记。
  - 优化方向：在 resize / settle 时缓存 anchor；或者在 `y` 远大于 anchor 且 `dy > 0` 时，不读布局就直接走 native。
- [src/features/market/intro-pager.tsx:34] 项目没有全局 `scroll-behavior: smooth`，`'auto'` 的效果和 `'instant'` 相同。老 WebKit 认识 `behavior` 字典成员但不认识 `'instant'` 时会抛 TypeError；如果不打算支持这些版本，可以不改。
- [src/features/market/intro-pager.tsx:218] 锁期内的事件不经过 `ownedElsewhere`，打开的对话框或内层滚动区里的滚轮也会被吞掉。锁只有约 570ms 加静默期，实际很难碰到，记录一下。
- 已知偏差 1（从 board 深处往上滚、越过 anchor 时直接翻到 band）：方向与用户意图一致，可以接受。阻断项 2 修复后，这条路径多数会变成原生滚动加 settle 收尾，行为请在真机触控板上再确认一次。
- 已知偏差 2（数量保留为 sr-only 的 `aria-live`）：可以接受。搜索结果数量播报对读屏用户有用，视觉上没有多余文字。
- 移除 board 的 Measure 选择后，FR-M4 的指标切换只在详情页图表中提供（`instrument-chart.tsx`），`?metric=` 深链仍然有效。建议主会话在 PROGRESS 里注明这项需求改由详情页满足。

### 已核对、无问题
- cookie、30 天、会话门控的代码、`IntroSeenRefresh`、`MetricSwitcher`、`SharedMetricSelect`、`signalCount` 和 Metrics 菜单的文案 key 都已删干净，src / messages / tests / e2e 中没有残留引用。`metricsFor` / `sharedMetrics` 仍被查询层和测试使用，应当保留。
- Wordmark：
  - 改为 client 组件；`usePathname` 在 SSR 和客户端一致，不会出现 hydration 差异。
  - 名称来自 `appName` prop，没有写死产品名。
  - 修饰键点击、中键点击、`defaultPrevented` 都放行给浏览器。
  - 不在 `/market` 时交给 Next 默认滚动到顶部；在 `/market` 时：有 pager 就用 tween，没有 pager（board tab）就立即跳到 0。
  - footer 中的 Wordmark 同样适用。
- `isCurrent`：
  - 桌面 nav、手机 sheet、账户菜单统一使用 `isCurrent`，tabbar 继续用 `isActive('/market')`，结果一致。
  - 不带 `match` 的 hash 链接不会被标为当前，与原来的行为一致；有单测。
- `#board` 的 `scroll-mt-[65px]` 与 sticky header 高度一致。
- 触摸路径：
  - 双指、`touchcancel`、缩放、fixed 或 dialog 目标都排除在外。
  - 翻页中途按下手指，`stop()` 会释放 overflow。
  - unmount 和路由切换时，cleanup 调用 `stop()`。
  - 只有 wheel 监听是 `passive: false`，其余监听都是 passive，cleanup 完整。
- tween：
  - `anim !== current` 防止旧帧继续运行。
  - settle 在 tween 期间直接返回，结束后用 `settle(false)` 记录落点，不会循环。
  - 减少动态时直接跳到目标，不锁 overflow。
- Watching tab 与其他 tab 共用 `TAB`、`TAB_CURRENT`、`TAB_OTHER` 三个常量，实测一致。
- 新增逻辑（`wheelPixels`、`wheelFlipTarget`、`wheelStep`、`touchTarget`、`tweenAt`、`isCurrent`、`isBareEntry`）都有单测。

### Attempt 2 — 退回（RETURN）

范围：`git diff e8ab671..fe-r8 -- . ':!docs'`（`3a0b49c`、`8ceb7ac`、`b3b9252`）。

验收命令结果：
- `pnpm lint`：通过（exit 0）
- `pnpm typecheck`：通过（exit 0）
- `pnpm exec vitest run --maxWorkers=2`：32 个文件，380 passed / 13 todo，0 失败
- e2e 未跑。改用只读探针，在 scratchpad 里用 `git archive` 导出 `fe-r8` 与 `bec4f18`，各起一个 dev server（3028 / 3018），没有改动 worktree。

#### 上轮阻断项核对
1. 缩放：已修。`isZoomed` 由滚轮和触摸共用，放大时 `wheelStep` 不论是否在锁期内都返回 native，有单测。
2. 不可取消的事件：已修。`cancelable: false` 返回 native，不翻页也不上锁，有单测。
3. 在 band 下方改动 board：landing 场景已修。翻到 board 后输入搜索词，band 保持显示，`scrollY` 保持 643，搜索框仍在 168。新增的 e2e 断言覆盖了这一场景。但同一类问题在反方向仍然存在，见下面的阻断 2。

#### 必须修复（阻断）
1. [src/app/market/layout.tsx:13-15] band 被 Suspense 推到文档末尾才流式输出，导致无 JS 时看不到 band，有 JS 时 band 晚到并把 board 往下推。
   - 现象：
     - `IntroBand` 是 async server component，现在包在 `<Suspense fallback={null}>` 里，SSR 先输出 `<!--$?--><template id="B:0">` 占位，band 本体出现在 `<div hidden id="S:0">` 中。
     - 实测 bare `/market` 的 HTML 中，`id="board"` 在 17830 字节处，`id="intro"` 在 374853 字节处，前面是约 357KB 的 board；`bec4f18` 中 band 在 17629 字节处，按正常顺序输出。
   - 为什么是问题：
     - 禁用 JS 时 band 一直隐藏，探针结果为 `#intro` 不可见，`bec4f18` 为可见。这破坏了"无 JS 也是普通锚点页面"的既有设计。
     - 有 JS 时，board 先绘制在顶部，band 等末尾的数据块到达后才插到它上方。弱网环境下这一屏的位移更明显；本地节流探针里也录到 1 帧"有 board、无 band"（board 顶部在 97px），之后 band 才出现。
     - layout 注释写的"band never flashes"与实际不符。
   - 建议：
     - 让 Suspense 边界内不再有会挂起的内容。在 layout 里先 `await` band 需要的翻译和数据，传给一个同步渲染的 band；`StickyBand` 只用 `useSearchParams` 控制显隐，动态渲染下它不会挂起。
     - 或者换一种不依赖 Suspense 流式输出的结构。
     - 修完后核对两点：HTML 中 `id="intro"` 在 `id="board"` 之前，且外面没有 `hidden` 包裹；无 JS 时 band 可见。
     - 补一个 e2e：`javaScriptEnabled: false` 时 band 可见。
2. [src/features/market/intro.ts `keepBand` 与 src/features/market/sticky-band.tsx] "query 一旦重新变成 bare，band 就回来"会在用户操作时，把 band 插到 board 上方。
   - 现象：在 Chromium 中直接打开 `/market?q=data`，此时没有 band，`scrollY` 为 0，搜索框在 200。清空搜索框后，URL 变成 `/market`，band 插入，搜索框被推到 811，超出 800 高的视口，tab 被推到 756。
   - 为什么是问题：
     - 页面在顶部（y=0）时，浏览器的 scroll anchoring 不起作用，所以 Chrome 也会跳，Safari 更不用说。
     - 这和上轮阻断 3 是同一类问题，只是方向相反：用户正在操作的控件被推出屏幕。
     - 清空搜索、把 sort / view / layer 切回默认值，都会让一个 deep link 变成 bare，从而触发。
   - 建议（二选一）：
     - (a) band 只在"进入 `/market`"时决定是否显示：首次加载、从其他页面导航进来、或点 wordmark。页面内的 query 变化既不移除 band，也不插入 band。wordmark 可以显式请求显示 band，例如带一个一次性的客户端标记，`flipToTop` 已经在负责回顶部。
     - (b) 页面内变化导致 band 插入时，在 layout effect 里按 band 高度补偿滚动，让 board 留在原位，band 留在上方，用滚轮往上就能翻回去。
     - 补对应的单测或 e2e：deep link 清空搜索后，搜索框仍在视口内。

#### 其余核对
- 只有 `/market` 一个路由使用这个 layout，没有其他路由会意外带上 h1 或 band。page 里的 h1 已删除，探针中每个状态下 h1 都只有 1 个。
- `keepBand` 的重置：
  - 离开 `/market` 时 layout 会卸载。从 `/people` 客户端导航到 `/market?type=role`，不显示 band，正确。
  - 浏览器后退回到之前显示过 band 的 `/market?type=role` 时，band 不再出现，因为 layout 重新挂载、状态重置。这个结果可以接受。
- `#board` 与 pager：
  - 从 `/people` 点 Market，落到 `/market#board`，`scrollY` 为 643，tab 在 header 正下方（113）。
  - 在 landing 上切到 Roles，band 保持显示，`scrollY` 为 643；在 `?type=role` 的 board 顶部往上滚一格，翻回到 0。pager 在 layout 中工作正常。
- footer 的 Market 链接已改为 `#board`；anchor 每帧缓存一次；`behavior` 已改为 `'auto'`；锁期内落在对话框里的滚轮事件放行。这几项都没有问题。
- "Maximum update depth exceeded"不是这次 follow-up 引入的：
  - `bec4f18` 的 bare `/market` 上同样出现，每次加载 1 次，调用栈也相同，都是 `updateDehydratedSuspenseComponent` → `enqueueConcurrentRenderForLane`。
  - 在 `bec4f18` 带上 `intro_seen` cookie、不显示 band 时也会出现；`?type=role` 和 `/people` 上不出现。
  - 所以它与 band 无关，来源是 bare All board 上某个 dehydrated Suspense 边界在 hydration 期间收到更新。当前分支出现的次数和调用栈与 `bec4f18` 一致，没有变严重。
  - 不作为本轮阻断，建议单独开一个 fix 排查。
