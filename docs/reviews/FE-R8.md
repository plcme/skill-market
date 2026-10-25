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
