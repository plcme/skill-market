# FE-R3 审查记录（前端反馈第 3 轮：详情页单图、标题地点、skill 薪资）

审查范围：`git diff dev...fe-r3-chart`（base 65367fb，3 个 commit：abd3d7a、5e9a0db、f3ed4e8）。依据 `docs/GLOSSARY.md`（2026-10-17 更新）、`docs/DESIGN.md`、PRD §10、CLAUDE.md 质量底线。

## Round 1 — 退回

验收命令结果：
- `pnpm lint`：0 错误
- `pnpm typecheck`：0 错误
- `pnpm test:unit`：全量跑时 21 个文件、200 个测试中有 1 个失败：`tests/community-chat.test.ts`「pauses a practitioner after two no-shows」5s 超时。当时机器 load 约 7。该文件单独重跑 19/19 通过。本分支没有改动它，判定为负载导致的偶发失败
- 因机器负载高，没有跑 `pnpm build` 和全量 e2e。implementer 报告 build 通过；e2e `--workers=1` 131 通过，1 个失败，是没改动过的 onboarding axe 对比度偶发失败
- 补充自查（用端口 3003 的 dev server）：
  - 用 Playwright 脚本只靠键盘操作，检查 Split by、Y axis、scope chip 操作后焦点落在哪里（结果见阻断 2）
  - `curl /compare?a=python&b=java`，确认阻断 1
  - 看过 `artifacts/fe-r3/` 下的截图：桌面浅色/深色、375 宽、各个菜单

逐项结论（通过的部分）：
- **URL 解析**
  - `?y=`：只认 `salary`，其余（含 `salary_median`、缺省）都回落到 ads。按类型校验由 `resolveChartMeasure` 完成，`/i/mining?y=salary` 得到 `{ y: 'ads', measures: ['ads'] }`，Y axis 显示为静态标签
  - `?by=`：`none` 得到 null；无效值和缺省都回落到 experience
  - `breakdownParam` / `chartYParam` 与解析函数能往返，有单测
  - 图表已和 `?metric=` 完全解耦：`metric=salary_median` 时图表仍是 ads/stack，有单测
- **筛选语义**
  - `fromSimpleFilter(next, filter)` 改地点时保留 seniority 和 work_rights
  - 删掉最后一个地点会回到 `au`
  - All Australia 在选择器里显示为空，选一个地点会替换它
  - 开关仍是追加 `{remote, au}` 规则（GLOSSARY §2）；places × modes 已经覆盖时，开关置灰并保持打开
  - 多规则 spec 显示 "custom places"，弹层里给出 readback 和 "All Australia" 重置；重置保留 seniority/work_rights。对多规则 spec，work modes 无法拆出来，所以一并重置，可以接受
  - scope chip 逐个移除，有单测和 e2e
- **图表数字**
  - 不拆分时，Job ads 的 `all` 序列等于 total，最新值等于 Job ads 数字
  - 不拆分时，salary 线的最后一点等于 `computeMetric` 的 Median salary。`overall.value` 是 1000 的整数倍，`base*wave` 再按 500 取整后精确相等；样本门槛与数字卡用同一套取整后的计数。两者都有单测
  - 拆分时各带之和等于 total，与 FE-R2 一样在逐周取整的容差内
  - `filtered_to` 在 by=null 时为 null
  - 样本不足时：拆分状态显示 gaps/thin 提示；整体不足时改为 `SampleWarning`，不画图
- **skill 薪资**
  - `deriveSkillSalary` 按权重平均、结果确定，没有任何 role 时用 DEFAULT 兜底，有单测
  - `salaryOf` 不影响 role 和 industry；`salary_p10_p90`、`skills_per_ad` 仍只适用于 role
  - `/metrics` 示例变为 4 条，indexLede 和定义文案都已更新
  - `src` 和 `messages` 里已经没有 "roles only" 一类说法
- **PRD §10 / DESIGN**
  - Y axis 旁有 MetricInfo，图下有来源 SourceBadge、窗口和标薪样本说明
  - experience/rights 拆分时标 "Estimated" 并附方法说明
  - 没有双轴；stack 的 y 轴从 0 开始
  - 线图同时用虚线样式区分，不只靠颜色
  - 新代码里没有十六进制颜色，`fill-ink/[0.07]` 是 token，深色截图正常
  - 375 宽没有横向滚动，菜单在手机上是 bottom sheet，选项高度 ≥ 44px
- 新文案都在 messages 里，没有写死产品名

### 必须修复（阻断）

1. **[src/features/market/compare-view.tsx:156；messages/en/market-pages.json（dev 第 119 行被删）] `/compare` 的图表标题变成了原始 key `InstrumentPage.chartCaption`**
   - 原因：本轮删掉了 `InstrumentPage.chartCaption`，但 compare 页仍在用 `ti('chartCaption', …)`
   - 已用 `curl /compare?a=python&b=java` 确认，返回的页面里出现了 `InstrumentPage.chartCaption`
   - typecheck 和单测都抓不到，因为 next-intl 的 key 没有类型约束
   - 这是对线上已有页面的回归，图表的可访问名称和说明文字都坏了
   - 修复：恢复 `InstrumentPage.chartCaption`（原文 `"{metric} · 4-week rolling, weekly to {end}"`），或者移到 `Compare` 命名空间并改调用处
   - 建议同时加一个防回归测试：在测试/e2e 环境里让 next-intl 的 `onError` 遇到 MISSING_MESSAGE 就 throw，或者写一个单测，扫描 `src` 中静态的 `t('…')` key 并核对 messages

2. **[src/features/market/instrument-chart.tsx:123-162、:139；src/features/market/instrument-places.tsx:107] 键盘操作后焦点丢到 `<body>`**
   - 已用 Playwright 只靠键盘复现，下面三处操作后焦点都落到 `BODY`：
     - 在 "Stop splitting"（×）上按 Enter
     - 在 "Not split. Choose a split" 菜单里选 Work mode
     - 移除 scope chip（"Remove Entry level"）
   - 只有 Y axis 正常：焦点回到 "Y axis: Median salary. Change"
   - 原因：
     - Split by 槽在 `by ? … : …` 两个分支里各渲染一个 AdaptivePopover 和 trigger。URL 一变，分支切换，原 trigger 被卸载，Radix 原本会还给 trigger 的焦点就没了
     - × 按钮和 chip 的移除按钮都是点完后自己被卸载
   - 为什么是问题：
     - 违反 WCAG 2.4.3。键盘和读屏用户每改一次拆分或删一个条件，都要从页面顶部重新 Tab 到图表
     - 本轮明确要求检查 "Keyboard and focus work in the new AdaptivePopover"
   - 修复：
     - Split by 只保留一个 AdaptivePopover 和一个稳定的 trigger 元素，两种状态只改 trigger 的内容、样式和 aria-label
     - × 点击后用 ref 把焦点移到这个 trigger（必要时在 URL 更新后的 effect 里补一次 focus）
     - ScopeChips 移除后，焦点移到下一个 chip 的移除按钮；没有下一个时，移到标题里的 places 按钮
     - 在 `e2e/detail-chart.spec.ts` 加断言：上述操作后 `document.activeElement` 不是 body

### 建议（不阻断）

1. **[commit abd3d7a] 单独 checkout 时 typecheck 不过**
   - 原因：`Breakdown.by` 改成可空，但 `breakdown-section.tsx` 要到下一个 commit 才删掉
   - 只影响 bisect 和逐个 commit 回滚；分支 HEAD 正常，合并后不影响 dev
   - 不要求改写历史。以后同类改动请把类型和消费者放进同一个 commit

2. **[src/lib/metrics/registry.ts:57；messages/en/market.json:157；docs/DESIGN.md:208] skill 的 Median salary 现在也会不拆分地出现**
   - 出现位置：board 列、MetricSwitcher 的 "Right now" 大数字、Fundamentals 卡片（深色截图里 SQL 显示 "$117k"）
   - 这与 DESIGN §10「不要给 skill 直接标薪资」矛盾
   - GLOSSARY §3 的缓解办法「skill 上默认按 Experience 拆分」只覆盖了图表
   - caveat 只说 "senior roles state it less often"，没有提醒 skill 的中位数反映的是要这个技能的岗位和级别构成，不是「学了能拿多少」（PRD §10.5）
   - 建议：
     - 给 skill 加一条专用 caveat，例如 "Reflects the roles and levels that ask for this skill — not what learning it pays"
     - 主会话更新 DESIGN.md:208，并决定 board/Right now 是否也要露出 skill 薪资（记入「待拍板」）

3. **[docs/PRD.md:185；docs/ARCHITECTURE.md:646] 文档未同步**
   - PRD 的有效性矩阵仍写 `salary_median` 对 skill 为 ❌（「技能无薪资」）
   - ARCHITECTURE 仍写只适用于 role
   - PRD 由用户负责，ARCHITECTURE 由主会话负责：请在 PROGRESS「待拍板」里请用户改 PRD，并由主会话同步 ARCHITECTURE

4. **[src/components/market/filter-builder.tsx:150] compact 模式下开关没有任何说明**
   - 在 All Australia 加全部 work mode 时，开关是置灰且打开的状态（见 int-desktop-places.png），用户看不出为什么不能操作
   - 建议：compact 时仍显示 `remoteAnywhereCovered`（一行很短），至少作为 `aria-describedby` 提供

5. **[src/features/market/instrument-places.tsx:52] 标题里地点按钮的可访问名称只有地点文字**
   - 读屏念出来是 "All Australia, button"，听不出这是换地点的入口
   - 建议加 `aria-label`，例如 "Places: {label}. Change"，与 Y axis 和 Split by 的写法一致

6. **[src/features/market/instrument-chart.tsx:139] 触屏上误触 ×**
   - × 按钮是 28px，触屏下 `::after` 会扩展到 44px，盖住左侧 "Experience" trigger 末端约 8px
   - 点 trigger 右侧边缘时可能直接清掉拆分
   - 建议：两者之间留至少 8px 间距，或者限制 × 按钮 `::after` 的水平扩展

7. **[messages/en/market-pages.json:126] chip 文案与筛选口径不一致**
   - chip 写的是 "No PR required"，而筛选的定义是 "No PR or citizenship requirement stated"
   - chip 的说法更绝对，像是保证不需要 PR
   - 建议改为 "No PR stated" 或与 `Filter.workRightsOptions` 一致

8. **[src/components/ui/adaptive-popover.tsx:35] 菜单打开后焦点先落在 Close 按钮**
   - 建议用 `onOpenAutoFocus` 把焦点移到当前选中的 MenuOption，减少一次 Tab

9. **[src/lib/queries/market.ts:138] `detail.series` 已无用**
   - 详情页不再用它，但每次请求仍在计算
   - 如果没有其他消费者，可以删掉这个字段

## Round 2 — 通过

审查范围：`git diff 178fa60..cdd3c19`（eeba0fb、cdd3c19）。

验收命令结果：
- `pnpm lint`：0 错误
- `pnpm typecheck`：0 错误
- `pnpm test:unit`：22 个文件、202 个测试全部通过（新增 `tests/i18n-keys.test.ts`）
- `E2E_PORT=3161 pnpm test:e2e e2e/detail-chart.spec.ts --workers=1`：10/10 通过（desktop 和 mobile 各 5 个，含新增的纯键盘焦点测试）
  - `.next` 的 BUILD_ID 生成于 15:40，晚于所有改动文件的修改时间（不晚于 15:39:13），所以测的是最新代码
- `curl /compare?a=python&b=java`（3003 dev server）：标题正常显示为 "… · 4-week rolling, weekly to …"，页面中没有 `InstrumentPage.chartCaption` 或 `ComparePage.chartCaption` 这类原始 key

阻断项复核：
1. **已修复**：compare 页图表标题
   - `compare-view.tsx:156` 改用 `ComparePage.chartCaption`，messages 里已补上这个 key
   - 新增 `tests/i18n-keys.test.ts`：按作用域解析 `useTranslations`/`getTranslations` 的绑定，校验 `src` 中所有静态 key（断言 >500 个），并自带一个解析器的单测。以后再删掉仍在使用的 key 会直接失败
2. **已修复**：键盘操作后焦点丢失
   - Split by 现在只有一个稳定的 trigger（`instrument-chart.tsx` 中带 `splitTrigger` ref 的按钮），两种状态只改内容、样式和 aria-label
   - ✕ 成为独立的 44×40px 段，不再与 trigger 的触控区重叠（顺带解决了 Round 1 建议 6）
   - 点 ✕ 时先把焦点移到 trigger，再改 URL；从菜单里选拆分时，Radix 把焦点还给同一个 trigger
   - scope chip 移除前，先把焦点移到下一个 chip 的移除按钮；没有下一个时移到标题里的 places 按钮（`PLACES_TRIGGER_ID`）
   - e2e 在桌面和手机上都断言了焦点落在这些位置，不是 body

回归检查：
- Round 1 的建议 4、5、7 已处理：
  - 置灰的远程开关显示 "Already included."
  - places 按钮的 aria-label 为 "{places}. Change places"，以可见文字开头，符合 2.5.3
  - rights chip 改为 "No PR or citizenship stated"，与筛选口径一致
- `frontend.spec` 已同步新文案
- 其余逻辑没有变化

### 必须修复（阻断）

（无）

### 建议（不阻断）

1. [src/features/market/instrument-places.tsx:58] h1 的可访问名称被拉长
   - places 按钮的 aria-label 会参与 h1 的命名，标题列表里会读成 "SQL in All Australia. Change places"
   - 可以接受。如果想让标题更干净，可以把 "Change places" 改为通过 `aria-describedby` 提供
2. [src/features/market/instrument-places.tsx:104-111] 删最后一个 chip 时焦点去向
   - 删掉的是最后一个 chip、但前面还有其他 chip 时，焦点会跳到标题里的 places 按钮，而不是前一个 chip
   - 可用，但更顺手的做法是回落到前一个 chip
3. Round 1 建议 1、2、3、8、9 仍然有效
   - 其中 skill 薪资是否在 board、Right now、Fundamentals 上不拆分地显示，已交给用户拍板
