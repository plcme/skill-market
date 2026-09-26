# FE-R1-B 审查（分支 `fe-industry`，9dce296，相对 `dev`）

## Round 1 — 通过

验收命令结果：
- `pnpm lint`、`pnpm typecheck`：0 错误
- `pnpm test:unit`：全量跑时 157 个中 11 个失败，均为 `student-auth` / `student-privacy` 中的 5s 超时（与另一审查并行，属负载问题）；单独重跑这两个文件 10/10 通过；`tests/industry.test.ts` 19/19 通过
- `pnpm build`：通过
- `pnpm test:e2e`：3140 端口被另一进程占用，改用 `E2E_PORT=3147`：62 通过、2 跳过、2 失败（`sample student: desk, skills and gap diagnosis`，desktop 和 mobile 各 1）；单独重跑 2/2 通过，判定为负载问题

### 必须修复（阻断）
无。

### 核对要点
- squarify：面积按比例缩放，末行/末列吸收浮点余量，因此不会溢出；非正值和非有限值会被丢弃；排序稳定（相同值保持输入顺序），结果是确定的；有 proportional / 重叠 / 边界情况 / 确定性测试。
- 颜色分档：<2% 为中性，2–10% 为中等，≥10% 为强；橙/蓝发散配色，对色盲友好；样本不足时显示斜纹灰色；图例的档位文案取自 `HEAT_BANDS`，因此标注与实际一致。图例里有来源和统计窗口，另有表格作为备用视图，手机端用网格展示。
- Movers：要求 `status==='ok'` 且 `from >= min_sample`，所以小基数突增进不来；把"最大变化"理解为 |相对变化| 可以接受，有 ≥30 的基数门槛兜底，而且规则已在可见文案中写明。
- 轮播：有 `aria-roledescription` 和暂停/播放（`aria-pressed`）；悬停或获得焦点时停止自动切换；reduced-motion 下默认不自动播放；`aria-live` 在播放时为 off、暂停时为 polite，符合 APG 规范；焦点不会被困住。
- `INSTRUMENT_PREFIX`：`/s`、`/r` 保持不变。行业不可 held（API 和 `WatchButton` 两处都有限制）。matching 改走 `componentsOf()`。行业页不显示薪资，只保留具体技能，不含软技能。

### 建议（不阻断）
1. `messages/en/home.json`：`leadKicker`/`leadWhy`/`leadIn`/`leadTalk` 已不再使用，可以删掉（`leadOpen` 仍被 movers-carousel 使用）。
2. `src/components/market/heatmap.tsx` 的 `HeatmapLegend`：在行业页（`kind==='industry_skills'`）里，`change_4w` 的 `MetricInfo` 也传了 `type="industry"`，定义弹层的主语可能对不上，建议按 kind 选择。
3. `src/app/page.tsx`：`moversRule` 文案用的是 `MIN_SAMPLE_DEFAULT`，而筛选实际用的是每条读数的 `min_sample`；如果以后各指标的门槛不一样，文案会和规则对不上，建议从数据里取值。
4. `api/watchlist.ts`：行业被拒时返回的错误键仍是 `rolesCannotBeHeld`，文案对行业不准确。

### 合并冲突热点（仅提示）
与 `fe-responsive` 可能冲突的文件：`src/app/page.tsx`（hero 整段被替换）、`src/styles/theme.css`（新增 heat 变量）、`messages/en/home.json`、`messages/en/market*.json`、`e2e/frontend.spec.ts`。`playwright.config.ts` 本分支没有改动。
