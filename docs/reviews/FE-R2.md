# FE-R2 审查记录（前端反馈第 2 轮：A2 · C3 · B2 · B1）

审查范围：`git diff f5da9fc..fe-r2`（6 个 commit），依据 `docs/DESIGN.md`（dev@c5e9a2c）、`docs/GLOSSARY.md`、PRD §10、CLAUDE.md 质量底线。

## Round 1 — 退回

验收命令结果：
- `pnpm lint`：0 错误
- `pnpm typecheck`：0 错误
- `pnpm test:unit`：19 个文件、182 个测试全部通过
- `pnpm build`：成功
- `E2E_PORT=3150 pnpm exec playwright test e2e/round2.spec.ts e2e/responsive.spec.ts`：53 通过、1 失败（`[mobile] onboarding basics`，axe `color-contrast: #radix-_r_2_`，bottom sheet 入场动画过程中采样）。单独重跑后 2/2 通过，判定为偶发失败，与本轮改动无关
- 补充自查：另起端口 3151 截图 `/r/data-analyst?metric=salary_median&by=experience`（浅色/深色，1440/375）、`/i/health-care?by=rights&f=…_npr`、375 宽筛选面板；375 宽下 `scrollWidth` 均为 375，没有横向滚动

逐项结论（通过的部分）：
- A2：`src`、`messages`、`e2e` 中已不再出现 Adzuna；fixture 来源 id 改成 `job-ads-fixture`，messages 里的名称同步改了
- C3：`communication` 已从 catalog、ROLE_COMPONENTS、教育先验、seed、`FIRST_STEPS` 中移除；`skill_layer` 覆盖所有 skill，role 和 industry 为 null；10 项核心能力不是 instrument，也没有任何度量；role 页按 ASC 原顺序展示（不排序，不像排名），有 "Illustrative"、量表说明 "not a judgement of any person" 和 ASC 署名；`/s/communication` 重定向到解释页；持久化 demo state 经 `dropUnknownInstruments` 清洗（`storage` 事件重载也会经过 `load()`）；聊天记录用 `instrumentLabel` 回退为文本；`/chat/new` 和 `/compare` 遇到未知 slug 不会崩溃
- B2：`toSimpleFilter` / `fromSimpleFilter` 能双向还原，经 URL codec 往返后也一致；remote 规则排在 URL 第一条时能识别；冗余开关会被吞掉；无法用简单控件表达的 spec 自动打开 Advanced；旧 URL 格式不变。空 modes 或空 places 的草稿会让 Apply 置灰，不会被悄悄改写
- B1：stack 各带之和等于 total（逐周取整误差在测试容差内）；三个维度的分桶都是对筛选单元格的划分（mode 用 `keepModes`，rights 权重之和为 1，experience = entry + other×split），所以与筛选交互正确；只显示筛选范围内的桶并注明 "Filtered to …"；salary 只对 role 画线，按 12 个月内标明薪资的样本量做门控，不足则断开，不插值；其他 measure 回退到 Job ads 并给出说明；experience 和 rights 维度标 "Estimated" 并附方法弹层；有表格视图、键盘游标、`aria-live` 读数、`SourceMark` 和窗口；面积图 y 轴从 0 开始；线图同时用虚线样式区分，不只靠颜色
- 文案全部在 messages 中；没有写死产品名；组件里没有写死十六进制颜色

### 必须修复（阻断）

1. [src/styles/theme.css:45-46, 85-86；用于 src/components/market/breakdown-chart.tsx:18-21] `series-ord-1` 和 `series-ord-2` 对 `surface` 的对比度不达标：浅色 ord-1 为 1.46:1、ord-2 为 2.53:1；深色 ord-1 为 1.50:1、ord-2 为 2.94:1。WCAG 1.4.11（非文本对比度）要求至少 3:1。

   为什么是问题：
   - 在 role 的 "Median salary by experience" 线图里，Entry 线（ord-1，实线）无论浅色还是深色模式都几乎看不见（已截图确认），Mid 线也很淡。
   - Entry 恰恰是学生最关心的一档。
   - 这违反 DESIGN §9 "对比度达到 WCAG AA"，也违反本轮明确要求的 "series token 对 surface 的 AA 对比度"。axe 不检查 SVG 描边，所以 e2e 发现不了。
   - 这组色值本身来自 DESIGN §2.2，实现忠实照抄了规范，但规范的取值有问题。

   建议怎么改：
   - 按 DESIGN 抬头的约定（"token 的真实取值以 theme.css 为准……先改 theme.css，再同步这里"），在 theme.css 里把两套主题的 ord 色板都调整到对 `surface` 至少 3:1，并保持由浅到深（深色模式由暗到亮）的有序关系。参考：浅色 ord-1 约 `#7486dd`（3.27:1）或更深，深色 ord-1 约 `#5263c2`（3.33:1）或更亮。
   - 然后由主会话同步 DESIGN §2.2 的色值表。
   - 在 `tests/` 里加一个纯函数测试：读取 theme.css，断言所有 `--series-*` 对 `--surface` 在两套主题下都 ≥ 3:1，防止回退。
   - 如果坚持保留浅色带用于面积图，至少要给线图单独使用 ≥ 3:1 的描边色。不过这样一来 "同一维度同一色" 就会被打破，不推荐。

### 建议（不阻断）

1. [src/lib/market/engine.ts:614] 同一页上，breakdown 写的是 "From 4,712 of 10,711 ads that state a salary"，主卡写的是 "4,713 of 10,712 ads"。原因是这里把各桶取整后的值相加，而主卡用的是未拆分的总量。建议直接复用 `computeMetric('salary_median')` 的 numerator 和 denominator，并把 0.44 收敛成一个共享常量，与 engine.ts:337 的 `0.44` 统一。
2. [src/lib/market/engine.ts:584 / breakdown-chart.tsx] stack 模式下，某个桶 4 周内少于 30 条时，图例显示 "Not enough ads"，但面积带和数据表里仍然画出、列出了具体数值（见 health-care 的 rights 维度里 Sponsorship 一档）。建议保持一致：要么在图例里注明 "count shown, below sample threshold"，要么在表格中对应格子也标出提示。
3. [src/features/market/breakdown-section.tsx:82] 筛选为 `graduate` 时，experience 维度会写 "Filtered to Entry · 0–2 yrs"，但实际只含 graduate 广告。建议这种情况下复述 filter 本身的措辞（例如 "Graduate roles only"）。
4. [src/components/shell/command-palette.tsx:57] 命令面板对前缀匹配也把核心能力排在最前面，例如输入 "pro" 时 Problem solving 排在 Project management 和 Product manager 之前，"rea" 时 Reading 排在 React 之前。建议与 `/search` 一致：只在完全匹配 alias 时置顶，否则排在 instrument 之后。
5. [src/app/metrics/page.tsx:100] `target:bg-signal-soft` 把荧光黄用在锚点高亮上，而 DESIGN §2.1 规定 `signal` 只用于信号。建议改用 `accent-soft`。
6. [src/components/market/breakdown-chart.tsx:152] 宽度小于 520px 时没有直接标注，只靠图例色块与面积带对应，好在图例顺序与堆叠顺序一致，位置本身也是线索。可以考虑在窄屏图例里给色块加上与堆叠层对应的序号，或者用细描边增强。
7. ASC 是 CC BY 4.0 许可，署名旁边可以补上许可名和链接，便于合规审查（目前只有 "Framework: Australian Skills Classification, Jobs and Skills Australia"）。
