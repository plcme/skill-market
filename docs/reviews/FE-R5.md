# FE-R5 审查记录（前端反馈第 5 轮：首页精简、行情条、技能标志、头部账户菜单、文案审查层、按符号定方向、岗位 held、详情页单一度量）

审查范围：`git diff dev...fe-r5`（11 个 commit，8b196e9..289ece6）。依据：用户批准的 9 项改动、`docs/DESIGN.md`、`docs/GLOSSARY.md`、PRD §10 与 NFR-3（WCAG 2.2 AA）、CLAUDE.md 质量底线。按用户偏好，本轮不跑 e2e。

## Round 1 — 退回

验收命令结果：
- `pnpm lint && pnpm typecheck && pnpm test:unit`：全部通过，退出码 0。vitest 27 个文件、275 个测试全过
- 工作区干净：`next-env.d.ts` 没有改动，没有新增未跟踪的代码文件
- 额外做了一次生产构建：把仓库拷到 scratchpad，跑 `next build --webpack`，没有动仓库里的 `.next`。结果如下：
  - 构建通过
  - `.next/static` 和 `.next/server` 里搜不到 `copy-review-v1`、`copy-review-active`、`Copy decisions`、`data-review-id`、`Clear all copy review`。审查层已从生产产物里摇掉
  - `simple-icons` 在客户端 chunk 里只剩映射表里的 25 个图标（一个约 48 KB 的 chunk），全量图标集没有打进去

逐项结论（通过的部分）：
- **1–2 首页**：图例那句说明已删，只保留色块和 source/window 那一行；"How it works" 整段删除，对应的 `Home.how*`、`Home.step*` key 一起删了，没有残留引用。`Heatmap.size*`、`colour*`、`thinNote` 也删了，`parentName` 这个 prop 一并去掉
- **3 行情条**：
  - 只在 `AUTO_ADVANCE_QUERY` 成立时滚动，条件是 hover:hover、pointer:fine，且没有设置减少动态效果（reduced-motion）
  - 指针悬停或获得焦点时暂停；`onBlur` 用 `relatedTarget` 判断焦点是否真的离开了行情条
  - 在条内发生任何 pointerdown 或 keydown，本次会话就不再滚动
  - 其余情况是静态的、可横向滚动的一条。复制出来的第二行带 `aria-hidden`，链接是 `tabIndex=-1`
  - SSR 时媒体查询为 false，渲染静态条，不会出现 hydration mismatch
  - `tapePause`、`tapePlay` 两个 key 已删
- **4 标志**：
  - 显式映射，用具名 import（上游删掉某个图标时构建会直接失败）
  - `InstrumentMark` 套在 `Monogram` 里（`aria-hidden`），svg 也是 `aria-hidden` + `focusable=false`，用 `currentColor`，只显示单色
  - role 和 industry 永远用字母
  - ARCHITECTURE 数据源表已登记：CC0、商标说明、nominative use；DESIGN 写明了"所有者反对就撤下"
  - 测试覆盖：映射存在，role、industry 不会拿到标志
- **5 头部**：
  - 一个触发器，内容是头像 + "My desk" + ▾；手机上只显示头像，"My desk" 保留为 sr-only，可访问名正确，头像本身是 `aria-hidden`
  - 菜单第一项是 desk，并带 `aria-current`
  - 移动端汉堡菜单只列主导航，账户链接和 Sign out 只在账户菜单里出现一次，不再重复
- **6 文案审查层**：
  - `COPY_REVIEW_ENABLED = NODE_ENV !== 'production'`，生产产物里已确认不存在
  - 开发环境、审查层未激活时，`ReviewText` 原样返回 children（fragment），不改动文本
  - `useSyncExternalStore` 的 server snapshot 是 `false`，hydration 时和服务端一致，激活后才在客户端重渲染，不会 mismatch
  - 本地存储读取有防御，有单测
- **7 方向**：
  - `direction()` 按显示精度（0.1pp）判断，只有四舍五入到 0.0% 才是 ■
  - 热力图 0 档只给 0.0%，图例去掉了"持平"
  - 用到方向的地方仍然是 `DirectionGlyph`，带 sr 读出的词，或用 `WithGlyph`；颜色之外始终有字形
  - 有单测
- **8 岗位 held**：
  - `canBeHeld` 统一了 API（add、update）、WatchButton、desk 行菜单三处的判断
  - `selectWatchlistGroups` 新增 `worked` 分组，held 的 role 不会进"技能"组
  - 只有 industry 会被拒绝
  - nudge 按 role 记住关闭状态；首屏和 SSR 都按"已关闭"处理，不会闪一下
  - `?role=` 在 `ProfileForm` 里会校验必须是已知 role slug，否则忽略
  - 已删除的 `rolesCannotBeHeld` 没有残留引用
  - 有单测
- **9 详情页**：
  - `chartPlanFor`：4-week change → Job ads，3M，两个 4 周窗口都做阴影，并标出 from → to
  - 标记取的是 `total[n-1-4]` 和 `total[n-1]`，即 4 周滚动和，和 `computeMetric(change_4w)` 的 from、to 来源相同，数字一致
  - 12-month change → Job ads，2Y，阴影覆盖 104 周，正好是两个 52 周窗口；Volatility → 1Y；Salary range 和 Skill premium → Median salary；没有序列的度量回退到 Job ads
  - 引擎新增的周序列：
    - 分子、分母的切片规则和 `computeMetric` 一致：各自在自己的维度上覆盖筛选，其他维度仍受筛选约束
    - 不拆分时，最后一个点等于 headline（有测试）
    - 分母低于 `min_sample` 时值为 `null`，曲线断开
    - share 存的是 0–1，显示时用 `formatShare`，坐标刻度是百分比，上限不超过 100%
  - 按自身维度拆分 share 会退化，所以画成不拆分，Filter 面板里对应选项置灰并注明 "Not for this measure"
  - 重定向：`?y=` 折进 `?metric=`（显式的 `metric` 优先）；被固定的 `by` 改成 `none`，或在 Experience 时直接删掉；其他参数保留；结果收敛，第二次请求返回 `null`，不会循环（有测试）。用的是 `redirect()`，即 307
  - 面板草稿：每次打开都从 props 重新初始化；Apply 一次性写入 `f`、`metric`、`by`，并删掉 `y`；草稿的复述句同步加上 "· by …"
  - 图表下拉切换时用 `nextByParam` 清理 `by`；Fundamentals 链接保留当前 split
  - 标题句子：remote anywhere + 部分 work mode 时，把模式放进地点后的括号，不再自相矛盾（有测试）
  - `MetricSwitcher` 只从详情页移除，/market 仍在使用，不算孤儿代码
- **文案与次级标签**：新文案都在 messages 里。审查层的英文标签是开发专用、写死的，代码注释写明了原因，可以接受。图表头部去掉了 "Y axis" kicker 和胶囊，只剩下拉和范围胶囊，符合 "Avoid unnecessary secondary labels"
- **PRD §10**：没有新增排名或赤字表述。图表脚注保留 SourceBadge、窗口，以及 salary 的样本说明

### 必须修复（阻断）

1. **[src/features/market/instrument-chart.tsx:123, 92–99, 111–117；src/components/market/breakdown-chart.tsx:251] 用图表下拉切换度量后，焦点丢失（WCAG 2.4.3 回退）**
   - 问题：
     - 度量下拉的触发器作为 `headerStart` 渲染在 `BreakdownChart` 内部
     - `BreakdownChart` 的 `key` 是 `${metric}-${by}-${kind}`，包含 `metric`
     - 选中新度量后，Radix 会先把焦点还给触发器；随后 `router.replace` 带回新的 `detail.metric`，`key` 变化，整个 figure 重新挂载，刚拿到焦点的触发器被卸载，焦点掉到 `<body>`
     - 从样本不足的分支（`unsplitThin`）切到正常分支时，DOM 结构本身也不同，同样会卸载
   - 为什么是问题：
     - 键盘和读屏用户每换一次度量，都要从页面顶部重新 Tab 回来
     - 旧实现专门为 Split by 做过"稳定触发器"（注释里引用了 WCAG 2.4.3），这次把它丢了
     - 本轮审查重点里明确列了 focus return
   - 建议（任选其一）：
     - 把 `headerStart` 渲染在带 key 的子树之外，比如由 `InstrumentChart` 自己渲染头部行，范围胶囊作为 prop 或回调交给 `BreakdownChart`
     - 或者不用 `key` 重置范围：在 `BreakdownChart` 里记住上一次的 `initialRange`，变化时 `setRange`
     - 同时让 `unsplitThin` 分支和正常分支的头部共用同一个父节点位置，保证触发器在两种状态之间是同一个 DOM 节点

     修完后，用组件测试或手动操作确认：选中 → URL 更新 → `document.activeElement` 仍然是度量触发器。

### 建议（不阻断）

1. **岗位的 12-month change 图表来源和 headline 不同**（`src/features/market/logic.ts` `chartPlanFor`）
   - 现状：role 的 `growth_12m` 来源是 official，图表画的是 Job ads（ads），并给两个 12 个月窗口加了阴影
   - 风险：
     - fixture 里两者恰好同源；接入真实数据后，阴影对比出来的趋势可能和 headline 相反
     - 脚注的 SourceBadge 会显示 ads，所以没有违反"数字有来源"，但阴影会暗示"这就是 headline 的两段"
   - 建议：给 role 的 growth_12m 不画阴影，或者在官方序列接入后改画官方序列。记入 PROGRESS 的待拍板
2. **`formatChange` 对四舍五入到 0 的值仍然带正负号**
   - 现状：例如 0.0004 会显示成 "■ +0.0%"
   - 建议：`signed()` 在显示值为 0 时不加号，和 `direction()` 保持一致
3. **`InstrumentChart` 的 props 类型里还声明了 `type`，但函数没有解构使用，调用方还在传**
   - 建议：删掉这个 prop
4. **图表的 sr-only caption 不再说明是 "4-week rolling" 还是 "rolling 12 months"**
   - 现状：可见的脚注里有窗口天数，读屏用户也能读到脚注，所以不阻断
   - 建议：把窗口写回 `captionBy` 和不拆分时的 caption
5. **RolePractitionerNudge 对已经是 practitioner 的用户也会显示**
   - 现状：`personas` 里已经有 `practitioner` 的用户，仍会看到 "Join as a practitioner"
   - 建议：这种情况下隐藏 nudge，或者把 CTA 换成指向 `/practitioner`
6. **术语还没有补进 GLOSSARY**
   - 现状：PRD 的术语表把 `held` 定义为"我有的技能"，本轮扩展成"我在这个岗位干过"，但 `docs/GLOSSARY.md` 没有对应条目
   - 建议：主会话补一条 GLOSSARY（Worked in this role ↔ `held` + role），并在 PROGRESS 里提出 PRD 措辞调整
7. **标志的商标说明只写在了内部文档里**
   - 现状：CC0 不要求署名
   - 建议：在 `/sources` 的数据源署名区加一句 "Logos are trademarks of their respective owners and are used only to identify the technology."，和 ARCHITECTURE 里的说明对齐
8. **WCAG 2.2.2 的解读**
   - 现状：桌面端键盘用户只要不进入行情条，就没有办法让它停下（hover 只对鼠标有效）
   - 结论：这和已批准的首页 movers 规则一致，所以不阻断
   - 建议：如果以后做正式的无障碍审计，再评估是否加回一个可见的暂停控件
9. **e2e 过期**：已知的 e2e 里很可能引用了已删除的东西（tape pause 按钮、首页 "How it works"、详情页 MetricSwitcher、`?y=`）。合并 main 前要一起修
10. **几处删 import 后留下了空行**：`movers-carousel.tsx`、`watchlist.tsx`、`ticker.tsx`，属于小问题

## Round 2 — 通过

审查范围：`git diff 289ece6..fe-r5`（5 个 commit，3bbbdda..d208550）。

验收命令结果：
- `pnpm lint && pnpm typecheck && pnpm test:unit`：全部通过，退出码 0。vitest 27 个文件、278 个测试全过
- `next-env.d.ts` 未改动

Round 1 的阻断项已修复：
1. 度量下拉切换后焦点丢失（`src/features/market/instrument-chart.tsx`）：
   - 头部行（度量下拉 + 范围胶囊）移到了带 key 的 `BreakdownChart` 之外，现在是外层 div 的第一个子节点
   - 样本不足和正常两种状态共用同一棵树，只有图表本身（`key={chartKey}`）或 `SampleWarning` 会被替换，所以触发器在切换度量前后是同一个 DOM 节点
   - 范围改为受控：`syncChartRange` 在 render 期间做派生状态，度量或拆分变化时回到 plan 的默认范围，不再需要靠重新挂载来重置。有单测
   - `BreakdownChart` 已删掉 `headerStart`、`initialRange` 和它自己的范围状态，没有残留

Round 1 的建议，处理情况：
- "0.0%" 不再带正负号：`signed()` 判断显示文本里没有非零数字时去掉符号，调用方只有 `formatChange` 和 `formatPp`。有单测
- 未使用的 `type` prop 已删，调用方也一起改了
- sr caption 恢复了滚动窗口："4-week rolling"、"rolling 12 months"，由 `rollingWindow(window_days)` 生成。有单测
- practitioner 邀请：已经是 practitioner 的用户（`my_practitioner_id`，或 personas 里有 `practitioner`）不再显示
- GLOSSARY 补上了 skill 和 role 两条 held 词条
- `/sources` 加了标志来源和商标说明，文案走 messages
- 未处理但不阻断的：role 的 12-month change 图表来源问题（待拍板）、e2e 过期、删 import 后留下的空行

### 必须修复（阻断）
无

### 建议（不阻断）
1. `src/features/market/logic.ts:121` 的注释放错了位置：`/** How the detail chart shows the selected measure */` 现在挂在 `ChartRangeState` 上面，而 `ChartPlan` 失去了自己的文档注释。建议把这行注释挪回 `ChartPlan` 前面

## Round 3 — 退回

审查范围：`git diff 5380b80..fe-r5`（5 个 commit，6e05cc2..ec9550a）。

验收命令结果：
- `pnpm lint && pnpm typecheck && pnpm test:unit`：全部通过，退出码 0。vitest 26 个文件、280 个测试全过，`copy-review` 测试已随 overlay 删除
- `next-env.d.ts` 没有改动

逐项结论（通过的部分）：
- **审查层清理**：
  - `src/features/dev/` 已整体删除
  - 在 `src`、`tests`、`e2e` 里搜 `ReviewText`、`CopyReview`、`copy-review`、`features/dev`，都是 0 处
  - `layout.tsx` 已恢复到 dev 的样子
  - 解包后保留下来的文本，逐处和 dev 对比过，结构和 key 都一样：market 计数行、orderNote、people 规则正文、行里的 category 和 SignalTag、supplyDefinition、advancedNote、payRange、payCaveat、locationsNote、competencies 的两段、demandIsOneInput、noAnzsco、compNote.role / industry
- **删除与转进 ⓘ 的文案**：
  - 删除的 key 都没有残留引用：`skillsKicker`、`rolesKicker`、`noSignal`、`nextBody`、`supplyAvailableDetail`、`compNote.skill`、`fund*`、`Heatmap.band.*`、`Heatmap.legendLabel`
  - 新 key `Common.aboutSection`、`statsTitle`、`statsAction` 都有使用
  - `compNote.industry` 仍在使用，不是孤儿
- **InfoPopover**：
  - 基于 Radix Popover：Esc 关闭，焦点会进入内容、关闭后回到触发器，`aria-expanded` 自动处理
  - 可访问名是 "About {section}"
  - 触发器放在标题元素之外，不会污染标题的可访问名
  - 移动端宽度是 `min(360px, 100vw-24px)`
  - 触发器和 MetricInfo 一样是 20px 的圆，周围有间距，可以按 WCAG 2.5.8 的间距例外处理
- **Compare / Talk**：
  - 改成两个 outline 按钮，`auto-fit` 网格，窄屏会换行
  - Talk 的 `aria-label` 包含可见文字 "Talk to someone"，满足 2.5.3
- **Statistics 改名**：
  - 组件名、`stats-h`、文案、DESIGN、GLOSSARY、注释都已一致
  - 代码、e2e 和文档里只剩 GLOSSARY 那一处有意写的"旧名 Fundamentals"
  - `SectionHeader size="lg"` 和 DESIGN 的字号表对得上
- **picked 格子**：
  - 选中状态有三处表达：`bg-picked` 背景、2px 墨色内边框、`aria-current`（在 MeasureCellLink 上），不只靠颜色
  - 对比度测试覆盖了每个配色方案下 picked 底上的 ink、ink-2、muted（≥ 4.5:1）和 up、down（≥ 3:1）
  - 格子里唯一用 up / down 颜色的是 ChangeBadge 的首个 span，已经放大到 32 / 40px，属于 large text，3:1 够用；绝对计数那一行是 muted
- **热力图**：
  - 每块都有方向字形和带符号的百分比
  - 链接的 aria-label 和 desktop 的 `title` 都说明了 "up/down X% in 4 weeks (from → to)"
  - 样本不足的块显示 "Too few ads"（小块显示 "—"，并有 title）
  - 列表的 aria-label 写明了 "size = job ads, colour = 4-week change"
  - 还有 HeatmapTable 可用
  - 结论：没有图例，颜色本身仍然可以理解，可访问性也没有问题

### 必须修复（阻断）

1. **[src/components/market/heatmap.tsx:56–67 `HeatmapSource`] 热力图上的百分比没有可见的定义入口了（PRD §10："每个数字有定义与来源"）**
   - 问题：
     - 旧图例那一行的开头有 `MetricInfo metric="change_4w"`，这次和色块一起删掉了
     - 现在剩下的只有 `ad_count` 的 ⓘ（解释的是格子大小）
     - 首页标题是 "Industries this month"，在可见层面没有任何地方说明格子里的 "▲ 12%" 是 4-week change，也看不到它的分母和窗口
     - 手机上的格子没有 `title`，连悬停提示都没有
     - 文件顶部注释写的是 "definition and source, one click away under the tiles"，现在只对格子大小成立
   - 建议：在 `HeatmapSource` 里把 `<MetricInfo metric="change_4w" type={type} reading={sample?.change} filter={filter} />` 加回来，放在 `ad_count` 的 ⓘ 旁边。只是一个 ⓘ，不加回色块，也不需要新文案

### 建议（不阻断）
1. `Heatmap.adsShort`、`Heatmap.tableToggle`、`Home.sampleNote` 在 dev 上就已经没人引用了，不是这一轮引入的。可以顺手删掉
2. InfoPopover 的内容区域没有可访问名（Radix 给它的 role 是 `dialog`）。可以给 `PopoverContent` 加 `aria-label={label}`，和 MetricInfo 的做法对齐（如果 MetricInfo 有的话）
