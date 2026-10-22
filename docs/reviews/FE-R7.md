# FE-R7 审查

审查范围：`git diff dev...fe-r7`（3 个 commit，1c37d84、84a958e、8fdf97e）。依据：用户要求的改动（`/market` 去掉 Filter，旧 `?f=` 重定向；去掉度量下拉旁可见的 "Measure"）、`docs/DESIGN.md`、`docs/GLOSSARY.md`、PRD §10、CLAUDE.md 质量底线。按用户偏好，本轮不跑 e2e。

## Round 1 — 退回

验收命令结果：`pnpm lint && pnpm typecheck && pnpm test:unit` 全部通过（lint 0 错误；tsc 0 错误；vitest 26 个文件、281 个测试全过）。`next-env.d.ts` 没有改动。

已确认没问题的部分：
- 重定向：`canonicalMarketQuery` 只在 `f` 非空时返回字符串，重定向后的 URL 里没有 `f`，所以不会循环。`type`、`sort`、`view`、`metric`、`layer`、`q` 都会保留，`type=watching` 也一样，因为它只删 `f`。有单元测试。
- `/market` 页面始终用 `DEFAULT_FILTER`。Watching 表、BoardRows、BoardCards 都拿到默认 filter，所以 `instrumentPath` 生成的行链接不带 `f`。`typeHref`、`resetHref`、`keep` 都不再带 `f`。
- `CompareSelectionProvider`、`compareHref` 已去掉 `f`，测试也已更新。`/compare` 仍用 `FilterBar` 默认的 bar 样式，不受影响。详情页标题筛选（`instrument-title-filter.tsx`）用的是 `InstrumentPage.titleFilter.button`，不受删掉的 `Filter.button*` 键影响。
- 可访问名称：`MetricSwitcher` 的触发按钮读作 "Measure: Demand"。`SharedMetricSelect` 有 `aria-label="Measure"`，选中项由 select 自己读出。
- 删掉的键（`sharedMetricHint`、`filterScopeLabel`、`Filter.button`、`buttonLabel`、`buttonLabelActive`、`scopeReset`）和 `activeConditionCount` 在 src、tests、e2e 里都已没有引用。首页、desk、onboarding、not-found、signout、people 里指向 `/market` 的链接都不带 `f`。

### 必须修复（阻断）

1. [src/features/market/instrument-view.tsx:57、59] 详情页面包屑仍然生成带 `f` 的链接：`hrefWith('/market', { f })` 和 `hrefWith('/market', { type, f })`。
   - 为什么是问题：用户在详情页设了筛选后点 "Market" 或类型面包屑，会先多跳一次重定向。这也违反了本轮"生成的链接都不带 `f`"的要求。这是最常走到的入口。
   - 怎么改：去掉 `f`，改成 `'/market'` 和 `hrefWith('/market', { type })`。

2. [src/app/search/page.tsx:90、128、143] 搜索页的三个 "Browse all" 或空结果链接仍然是 `hrefWith('/market', { f })`。
   - 为什么是问题：原因同上，这里也生成了带 `f` 的 `/market` 链接。
   - 怎么改：三处都改成 `href="/market"`。如果 `/search` 自己的 `f`（第 84、95、114 行）还要留给详情链接用，可以保留，只是不要传给 `/market`。

### 建议（不阻断）

- **e2e 过期**（本轮没跑，合并 main 前要修），合并 main 前一定会失败：
  - `e2e/frontend.spec.ts:103-121` 测的是已经删掉的 Filter 按钮、范围复述和 "Reset filter"。可以改成断言 `/market?type=role&f=…` 落到 `/market?type=role`。
  - `e2e/round2.spec.ts:35-58` 通过 `/market` 的 Filter 按钮测 remote-anywhere 开关和 Advanced 展开。应改到详情页标题筛选，或改到 `/compare` 的 FilterBar。
  - `e2e/frontend.spec.ts:90、196` 用的是 `/Measure\s*Demand/`。现在的可访问名称是 "Measure: Demand"，中间有冒号，匹配不上。可以改成 `/Measure:?\s*Demand/`。
  - `e2e/responsive.spec.ts:38` 里的 `/market?f=…` 现在只是重定向，可以删掉。
- [src/app/market/page.tsx:121、src/features/market/watching-board.tsx:83] 没有名称筛选（`q` 为空）时，空状态仍显示 "Clear the name filter"，点了也不会有变化。以前这种情况来自筛选，现在基本只在 Watching 或数据异常时出现。建议只在有 `q` 时显示这个按钮。
- [src/features/market/watching-board.tsx:31] 注释 "under the page's filter" 已经过时。`filter` 这个 prop 现在总是 `DEFAULT_FILTER`，可以在组件里直接用这个常量。
- [src/features/market/logic.ts:225] `?f=`（值为空）不触发重定向，空参数会留在 URL 里。不影响结果，只是 URL 不干净。如果希望规范化，可以改判 `'f' in sp`。
- 重定向用的是 `redirect()`（307）。这是对旧链接的永久性规范化，可以考虑改用 `permanentRedirect()`（308）。

## Round 2 — 通过

审查范围：`git diff 8fdf97e..fe-r7`（2080a2f、c66bfa8）。

验收命令结果：`pnpm lint && pnpm typecheck && pnpm test:unit` 全部通过（lint 0 错误；tsc 0 错误；vitest 26 个文件、282 个测试全过）。按用户偏好，本轮不跑 e2e。

Round 1 阻断项的复查：
1. 已修复。详情页面包屑（`instrument-view.tsx:57、59`）改用 `marketHref()` 和 `marketHref(type)`，不再带 `f`。
2. 已修复。搜索页三处链接（`search/page.tsx:90、128、143`）都改用 `marketHref()`。`/search` 自己的 `f` 仍然只用在 `/search` 和详情页链接上，没问题。

其他检查：
- 在 `src` 里搜了所有 `/market` 链接，没有一处带 `f`。剩下的 `hrefWith('/market', …)` 只有 `page.tsx:43–44`（`keep` 里已经没有 `f`）和 `marketHref` 本身。
- `marketHref` 有单元测试，覆盖默认、`all`、`role`、`watching` 四种情况。
- 页面和 Watching 表的空状态现在只在有 `q` 时显示 "Clear the name filter"。没有 `q` 时只显示 "Nothing on this board right now."。

### 必须修复（阻断）
无。

### 建议（不阻断）
- Round 1 列出的 e2e 过期问题还在，合并 main 前要修：
  - `e2e/frontend.spec.ts:103-121`
  - `e2e/round2.spec.ts:35-58`
  - `e2e/frontend.spec.ts:90、196` 的 `/Measure\s*Demand/`
- `watching-board.tsx:31` 的注释已经过时。`?f=`（值为空）不触发重定向。重定向可以改用 308。这几条同 Round 1，都不影响结果。
