# FE-R1-C2 审查（分支 `fe-responsive` vs `dev`，最后提交 6c38ad1）

## Round 1 — 通过
验收命令结果：
- `pnpm lint`、`pnpm typecheck`、`pnpm test:unit`、`pnpm build`：全部通过
- `E2E_PORT=3130 pnpm test:e2e`：90 passed / 2 skipped / 2 failed。失败的是 `e2e/frontend.spec.ts:103`（Filter button … Reset filter 之后 `toHaveURL(/\/market$/)`，desktop 和 mobile 都挂）。本分支没有改这个 spec，也没有改 `/market` 页面和 filter 相关代码；desktop 1280 fine pointer 下新加的 `::after` 规则不生效。我用独立脚本在 1280 下复现同样的流程，Reset 链接能正常点中，也能正常跳转（`elementFromPoint` 取到的就是 `<a>`，`pointer: coarse` 为 false）。跑 `market board` 这组用例（8/8）时通过；当时机器负载 load avg 约 28，而第一次单独重跑时仍然失败，所以判定为负载下 hydration 前就发生点击导致的 flake，不是回归。

### 必须修复（阻断）
（无）

### 建议（不阻断）
1. [src/styles/theme.css:193-206] 全局 44×44 `::after` 热区在 `(pointer: coarse), (max-width: 767px)` 下会向四周外扩。两个小按钮间距小于（44 − 自身尺寸）时，热区会重叠，DOM 顺序靠后的控件会抢走重叠区域的点击，例如图标按钮组、分页、chip 行。目前 e2e 没有发现问题，建议之后在 chip/pill 行上确认间距 ≥ 8px，或者对这类行局部改用 `min-h-11` 而不是外扩。`:where()` 的特异性为 0，放在 `@layer base`，所以 `absolute`/`fixed`/`sticky` 这些 utility 仍然覆盖得了 `position: relative`，不会破坏定位上下文；stretched-link（`after:absolute after:inset-0`）只用在 `<a>` 上，不受影响。宽度小于 768 的窄桌面窗口也会带上这个规则，影响可接受。
2. [src/lib/hooks/use-media-query.ts:14] SSR 快照为 `false`，所以手机端首帧先渲染桌面版的三个 select，再切换成 sheet 列表，没有 hydration mismatch（useSyncExternalStore 会处理），但可能出现一次布局闪动，同时桌面分支里 `autoFocus` 可能在手机上先触发一次聚焦或拉起键盘。可以考虑在 hydration 完成前渲染骨架，或者用 CSS（`sm:hidden`/`hidden sm:grid`）同时输出两套结构。
3. [playwright.config.ts:8] desktop 忽略了 `responsive.spec`，所以任务范围里提到的 1024/1440 sanity 没有自动化覆盖。现有用例没有丢失：desktop/mobile 仍然跑其余 spec，mobile 另外跑 responsive，tablet 只跑 responsive；`E2E_PORT` 也照常使用。
4. 文案：五处 key 都改成了 "No one can pay to change what the market shows"，MVP 阶段属实，没有承诺未来功能，也没有写"雇主可以付费"。`market-pages never.n2` 里"any conflict of interest is disclosed"是一项持续性承诺，建议在 PROGRESS 里登记，等以后出现收入来源时落实披露位置。
