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
