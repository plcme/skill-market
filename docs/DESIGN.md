# DESIGN — 视觉与交互规范

> 前端设计的唯一依据。新页面、新组件、新图表开工前先读这份，再读 `docs/GLOSSARY.md`（用词）和 `docs/PRD.md` §10（UX 原则）。
> 由主会话维护；用户拍板后更新。**token 的真实取值以 `src/styles/theme.css` 为准**，本文件解释它们的用途和规则；两者不一致时，先改 theme.css，再同步这里。
> 状态：v1（2026-10-06），由现有实现整理而来，并补充了图表 series 色和 breakdown 规则。标为"待定"的条目不得擅自落地。

## 0. 一句话

**一张编辑部印出来的市场行情表。** 暖纸色底、墨色文字、细线分隔、衬线大数字、等宽小标签。它像报纸的财经版，而不是交易软件或 SaaS 仪表盘：读起来要安静、可信、每个数字都站得住。

面向的是焦虑的学生。设计的任务是**降低焦虑、提高判断力**，所以克制比刺激重要。

## 1. 原则

1. **每个数字都会自我解释**：有定义、窗口、样本量和来源。点开就能看到（`MetricInfo`），不需要跳页（PRD §10，FR-D2）。
2. **颜色克制**：界面主体只用墨色加一个钴蓝强调色。荧光黄只留给"信号"。涨跌用绿和红，但永远同时带箭头和文字。
3. **颜色不是唯一信号**：任何靠颜色区分的信息，必须同时有形状、文字、位置或图案。
4. **不排名、不打分**：不出现学生之间的名次、百分位或分数。标的列表按度量排序，那只是"排序"，不是"排行榜"。
5. **诚实优先于好看**：估算值标 "estimated"；样本不足就留空，不做插值，也不美化；推断出来的内容标 "suggestion"，并给置信度。
6. **永远有下一步**：每个页面、空状态、错误状态都给出一个可点的去处。
7. **手机能用**：375px 宽不出现横向滚动，触控目标至少 44px。
8. **动效服务数据**：只用来表达"变了什么"，不做装饰性动画（见 §7）。

## 2. 颜色

### 2.1 基础 token

每个 token 都有浅色和深色两套值，组件里只用 token，**禁止写死十六进制颜色**。Tailwind 工具类与 token 同名，例如 `bg-paper`、`text-ink-2`、`border-rule`。

| token | 用途 | 规则 |
|---|---|---|
| `paper` | 页面底色 | 暖纸色；深色模式下是近黑的暖灰 |
| `surface` | 卡片、弹层、输入框底色 | 比 paper 略亮，只用来抬高一层 |
| `sunken` | 凹陷区域：skeleton、表头、hover 底 | 不用于大面积背景 |
| `ink` / `ink-2` | 主文字 / 次要正文 | 正文默认用 `ink-2`，标题和数字用 `ink` |
| `muted` / `faint` | 标签、说明 / 更弱的辅助信息、"未说明"类数据 | `faint` 不用于需要读清的正文 |
| `rule` / `rule-strong` | 细分隔线 / 区块顶部的粗线 | 用细线分隔，不用阴影分隔 |
| `accent`（含 `-hover`、`-soft`、`-ink`） | 链接、可交互元素、选中态、对比时的第二条序列 | **整个界面唯一的强调色**，不拿来做装饰 |
| `signal`（含 `-soft`、`-ink`） | 荧光笔：信号标记、`.hl` 高亮、文字选中 | **只用于信号**。一屏里出现超过 3 处，说明用得太多 |
| `up` / `down`（含 `-soft`） | 上涨 / 下跌 | 必须配箭头和文字，例如 "▲ +38% (120 → 166)"。方向只看显示出来的数值的正负：显示为正就是 ▲ + up 色，为负就是 ▼ + down 色；只有四舍五入到 0.0% 才用灰色 ■。不设 "±2% 算持平" 的灰区（2026-10-22） |
| `warn`（含 `-soft`） | 样本不足、数据延迟、需要注意 | 不用于错误；错误用 `down` |
| `src-official` / `src-ads` / `src-practitioner` | 数据来源标记（`SourceMark`） | 三种来源颜色固定，不另作他用 |
| `night` / `night-ink` | 反色区块（如行情滚动条） | 每页最多一处 |
| `overlay`、`shadow-float` | 弹层遮罩、弹层阴影 | **只有浮层可以有阴影** |

### 2.2 图表 series 色

这是 breakdown 和多序列图使用的颜色，在 `theme.css` 里定义浅色和深色两套。

| token | 用途 | 浅色 | 深色 |
|---|---|---|---|
| `series-ord-1..4` | **有序**维度（Experience：Entry → Expert），由浅到深 | `#7486dd #5068d6 #2f45b8 #1b2a7a` | `#5263c2 #7385e6 #9fb0ff #cdd6ff` |
| `series-cat-1..3` | **无序**维度（Work rights、Work mode） | `#2a45d0 #b0761c #2c7a74` | `#9daeff #e0aa52 #6cc4bb` |
| `faint` | "Not stated / 未说明"这类桶 | 永远是灰 | 永远是灰 |

规则：
- **每个 series 色对 `surface` 的对比度 ≥ 3:1**（WCAG 1.4.11，图形对象），由单测守住。最浅一档也要看得见，不能为了"渐变好看"牺牲可读性。
- 有序维度用单色渐变，无序维度用分类色，**不要混用**。
- 一张图最多 4 个序列。超过 4 个时，合并成 "Other"，或者改用表格。
- 单序列图一律用 `ink`；两个对象对比时，用 `ink` 对 `accent`。
- 热力图使用独立的发散色带 `heat-dn2 … heat-up2`（蓝对橙，色盲安全）。每一档都自带文字色，以保证 AA 对比度；无数据的格子用 `heat-na` 斜纹。分档按正负：10% 以内用最浅的涨 / 跌档，10% 及以上用深档；`heat-0` 只给恰好 0.0% 的格子，图例里不再列"持平"档；灰色斜纹只表示样本不足。

### 2.3 深浅模式

- 主题由 `html[data-theme]` 决定，并在首帧渲染前确定（`ThemeScript`），避免闪烁。
- **默认跟随系统**。头部只有太阳和月亮两个状态，用户手动点选后记住选择；界面上不出现"System"选项（GLOSSARY §4）。
- 新增的颜色必须同时给出深色值，并在深色模式下截图检查一次。

## 3. 字体

| 字体 | 变量 | 用途 |
|---|---|---|
| **Newsreader**（可变衬线，自托管） | `font-serif`，`.display`，`.serif-num` | 页面标题、区块标题、大数字 |
| **Geist Sans** | `font-sans`（默认） | 正文、按钮、表单 |
| **Geist Mono** | `font-mono`，`.kicker` | 标的代号（PY、SQL）、全大写小标签、列头 |

### 字号阶梯

只用下表这些字号，不要临时发明新的。

| 角色 | 字号 | 写法 |
|---|---|---|
| 开场区块大标题 | 46 / 64 / 76 px（手机 / sm / lg） | `.display` |
| 页面 h1 | 40 / 56 px | `PageHeader` |
| 大数字（主卡） | 56 / 64 px | `.serif-num`，`leading-[0.9]` |
| 主区块标题 h2（详情页 Statistics） | 32 / 40 px | `SectionHeader size="lg"` |
| 区块标题 h2 | 26 px | `SectionHeader` |
| 统计数字 | 28 px | `Stat` |
| 卡片标题 | 22 px | `font-serif` |
| 导语（lede） | 17 px | `text-ink-2`，`leading-relaxed` |
| 正文 | 15 px | body 默认，行高 1.55 |
| 次要文字、表格 | 13–14 px | |
| 标签（kicker） | 11 px 等宽、全大写、字距 0.08em | `.kicker` |

规则：
- 所有数字都用 `tabular-nums`（`.num` 或 `.serif-num`），保证列对齐。
- 标题用 `text-wrap: balance`，段落用 `pretty`，这已经写在全局样式里。
- 一个页面只有一个 h1，标题层级不跳级。

## 4. 布局与间距

- **容器**：`Container` 最大宽度 1240px。左右留白：手机 16px，sm 24px，lg 40px。
- **区块**：区块之间用 `mt-16`，每个区块用 `SectionHeader` 开头，标题上方是一条 2px 的 `rule-strong` 粗线。这条"报纸分栏线"是整个风格的骨架。
- **对齐**：一律左对齐，不做居中的营销式排版。
- **留白**：留白宁多勿少。信息密度靠表格承担，不靠压缩间距。
- **圆角**：小控件 3–5px，卡片 `rounded-md`（6px），胶囊和头像用 `rounded-full`。不使用大圆角。
- **分隔**：用 `border-rule` 细线分隔，不用阴影和色块分隔。
- **网格**：详情页首屏在 lg 下按 5 : 7 分成"数字区"和"图表区"，手机上纵向堆叠。
- **开场区块**（FE-R8，2026-10-25 改）：没有单独的首页，`/` 直接进 `/market`。不带参数的 `/market` 最上面永远是一屏开场（所有人，不分登录、不记次数）：标语 + lede + 行业热力图，主按钮 "Explore the market" 翻到盘面，次按钮 "Personalise"。高度不超过一屏（扣掉行情条、吸顶 header、手机 tab bar），盘面的类型 tabs 从底部露出来，让"往下滑"直接滑进盘面。小屏放不下热力图时隐藏热力图块。深链接（带 `type` / `q` 等参数）不显示开场。点 wordmark 永远回到开场顶部；nav 的 Market 去 `/market#board`，直接落在盘面。盘面之外不放"今日信号"、榜单预览之类和盘面重复的内容；盘面工具栏不放度量下拉和"N skills… · M with signals"计数行（固定 Demand）。

## 5. 组件

可用组件以 `src/components/ui/*`、`src/components/market/*` 和 `src/features/*` 的代码为准。这里只写使用规则。

- **按钮层级**：
  - 每个视图最多一个 `primary`（墨色实心）。
  - `accent` 用于转化动作，例如"约咖啡聊"。
  - 详情页头部只有一个大按钮：Watch（`WatchButton prominent`，未关注时 `accent` 实心，已关注时 `outline` 的 "Watching"）。"Compare with…" 和 "Talk to someone" 是它下方一行带图标的文字链接。
  - 其余动作用 `subtle`、`outline` 或 `ghost`。
  - `signal` 按钮只出现在信号相关的入口。
  - 危险操作用 `danger`，并且必须二次确认。
- **整卡可点**：用 stretched link（`relative` 的卡片 + 一个 `after:absolute after:inset-0` 的链接，或一个覆盖全卡、带 `aria-label` 的 absolute 链接），只保留一个可访问链接；卡内的 ⓘ 等按钮加 `relative z-10` 浮在链接之上。要有 hover 态和焦点环。详情页 Statistics 格子按此处理（点 Statistics 格子 = 把该度量切到顶部 "Right now" 并滚回去）。当前选中的格子整格用 `bg-picked` 着色并加 2px 墨色内边框，不只顶边一条线；`--picked` 上正文 ≥ 4.5:1、涨跌大数字 ≥ 3:1（`tests/theme-contrast.test.ts`）。其他格子 hover 只用浅 `bg-sunken/50`。
- **标的符号框**：统一用 `InstrumentMark`（`src/components/market/instrument-mark.tsx`）。Skills and tools with a recognisable logo show it, monochrome in ink, in the symbol box; everything else keeps letters. Logos identify the technology only (nominative use), never brand colours; drop a logo if its owner objects. 标志来自 Simple Icons（CC0），映射表在 `src/lib/market/logos.ts`，只收录图标集里确实存在的那一项技术；role、industry 永远用字母。符号框是装饰（`aria-hidden`），名称总在旁边。
- **数字**：一律通过 `MetricValue` 和 `MetricInfo` 渲染，不要裸写数字。
- **涨跌**：用 `ChangeBadge`，它永远显示原始计数 from → to。
- **筛选**：作用于整张表。行情表（`/market`）没有筛选，永远是 All Australia · All levels · 任意 work rights；旧链接里的 `?f=` 会被重定向去掉（FE-R7，2026-10-22）。行情表的度量下拉不加可见的 "Measure" 标签（只有 aria-label）。筛选只在详情页：没有单独的筛选按钮，标题里的 "in …" 就是筛选入口（"SQL in [Sydney · Entry-level · by experience ▾]"），点开是同一个 Filter 面板。Filter 面板从上到下：吸顶的 "Currently showing" 复述 → （仅详情页）Y axis + Split by → Work rights → Level → Places + Work mode + remote 开关 → Advanced。Y axis 与图表的度量下拉同步；Split by 只能在这里改，默认 None（不写 `by`），被筛选或度量固定的维度置灰并写明原因；两者和筛选一起随 Apply 生效。标题与复述在拆分时加 "· by experience"，不写 Y axis。打开了 "remote anywhere" 又只选了部分 work mode 时，模式写在地点后的括号里（"Sydney (on-site or hybrid) + remote"），避免和 "+ remote" 自相矛盾。Places 以不可删除的 "All Australia" 为底，只能缩小到州、城市或区域。
- **详情页度量**：只有一个参数 `?metric=`，"Right now" 大数字和图表一起变。"Right now" 区块不再有度量下拉；切换度量用图表左上的下拉或点 Statistics 格子。
- **空、加载、错误三种状态**都必须设计：
  - 加载：用 `Skeleton`，形状和最终内容相同；
  - 空：用 `EmptyState`，并给出下一步；
  - 错误：用 `Notice`，并给出重试入口。
- **手机**：引导流程和较长的选择用 bottom sheet（`SheetContent`）；导航用底部 tab bar。

## 6. 数据可视化

### 6.1 按问题选图

| 用户想知道 | 用什么图 |
|---|---|
| 一个标的随时间怎么变 | 折线图（`TrendChart`），带"查看表格"切换 |
| 列表里每行的走势 | sparkline，不带坐标轴，只看形状 |
| 两个标的对比 | 两条线，`ink` 对 `accent`，同一 y 轴 |
| 能相加的量（广告数）按维度拆开 | **堆叠面积图**，各带之和等于总量 |
| 不能相加的量（中位数、占比）按维度拆开 | **多条折线**，每个桶一条 |
| 一个行业里哪些技能大、哪些在涨 | 矩形树图热力图：面积表示规模，颜色表示变化 |
| 广告分布在哪些地区 | 横向条形图 |
| 核心能力的强度（1–10） | 横向条形，数字写在条旁边 |

### 6.2 硬规则

1. **计数和面积图的 y 轴从 0 开始。** 折线展示占比或中位数时可以不从 0 开始，但要明确标出刻度。
2. **不用双 y 轴。** 两个量纲不同的指标，就分成两张图。
3. **一次只按一个维度拆分**。详情页只有一张图。图表头部：左边是度量下拉（纯文字 "Job ads ▾"，中等字重、墨色，不加 "Y axis" 标签也不做胶囊），右边只有范围胶囊 3M / 6M / 1Y / 2Y；375px 下两者同一行，下拉文字过长时截断。Split by（`?by=`）只在标题打开的 Filter 面板里改。
4. **变化量要画出比较的两个窗口**：4-week change 画 Job ads、默认 3M，最近 4 周和之前 4 周两段加浅色阴影并标出 from → to 两个值；12-month change 画 Job ads、默认 2Y，两个 12 个月窗口加阴影。
5. **直接标注优先于图例**：空间够时，标签写在线尾或面积带右端；空间不够时，在图下方列出图例，并附最新数值和占比。
6. **样本不足 = 断开**：不连线、不插值，旁边注明原因（`SampleWarning`）。
7. **估算必须标注**：从广告文本里抽取的维度（经验、工作权利）标 "estimated"，并在定义弹层里写明方法和误差。
8. **筛选优先**：筛选已经限定的维度，在 breakdown 里只显示筛选范围内的桶，并注明 "Filtered to …"。
9. **每张图都能换成表格**（无障碍要求），表格和图使用同一份数据。
10. **来源在图上**：每张图附 `SourceMark`，以及数据窗口和更新时间。
11. 线宽：主序列 1.75–2px，sparkline 1.5px，线端和拐角用圆角；堆叠带之间用 1px 的 `surface` 色描边。

### 6.3 Breakdown 维度（v1 原型）

| 维度 | 桶 | 色板 |
|---|---|---|
| Experience | Entry（0–2 年，含 graduate）· Mid（3–5）· Senior（6–9）· Expert（10 年以上） | `series-ord-1..4` |
| Work rights | Requires PR/citizenship · Not stated · Sponsorship offered | cat-1 · `faint` · cat-2 |
| Work mode | Onsite · Hybrid · Remote | `series-cat-1..3` |

- 地点**不是** breakdown 维度。地点只作为整张表的筛选：选择地方 + "Also include remote jobs anywhere in Australia" 开关。
- "Expert" 就是用户说的 master level（10 年以上）。界面上不用 "Master"，避免和硕士学位混淆。

## 7. 动效

| 名称 | 时长与曲线 | 用途 |
|---|---|---|
| `fade` | 180ms ease-out | 弹层、提示出现 |
| `rise` | 350ms `cubic-bezier(.2,.7,.2,1)`，位移 6px | 内容首次进入视口 |
| `tape` | 110s 线性循环 | 顶部行情滚动条，**全站唯一的循环动画** |
| `live-dot` | 2s 呼吸 | "数据仍在更新"的小圆点 |
| 按钮按下 | 150ms，`translate-y-px` | 按压反馈 |
| 翻页 | 约 420ms，easeOutCubic（rAF 补间） | 开场区块 ↔ 盘面：滚轮 / 触控板一动就翻，一次手势一页（动画期间吞掉惯性）；手机松手瞬间按方向判断，滑出 `min(48px, 10% 距离)` 就翻，否则回原页 |

规则：
- 动效只用来表达数据或状态的变化：数字切换、图表随筛选重绘、新信号出现。
- 不做视差，不做无意义的滚动劫持，不做弹跳。**唯一例外是开场区块 ↔ 盘面的翻页**（用户明确要求，2026-10-25）：只在两页之间那一段拦截滚轮，进了盘面完全原生滚动；触摸不拦截拖动，只在松手后接管；缩放、横向、弹层与内部滚动区不拦截；键盘操作（按键或焦点移动后 600ms 内）不翻页，焦点不会被滚到屏幕外；开场区块比屏幕高时关闭；遵守 reduced motion（直接跳）。
- 所有动效必须遵守 `prefers-reduced-motion`；全局已经关闭动画，新代码也不要绕过它。
- 第 1 轮反馈里的三项要等用户提供参考后再设计，届时在这里补规范：live data 动画、滚动效果、模仿推特书签里的交互。**待定**。

## 8. 文案语气

- 白话、具体、短句；英式和澳式拼写（modelling、organisation）；标题用 sentence case。
- 用词以 `docs/GLOSSARY.md` 为准。例如度量选择器里叫 "Demand"，列头叫 "Job ads"。
- 不说"你应该学 X"，只说市场上看到了什么。需求只是做决定时的一个输入。
- 不制造焦虑，不夸张：不写 "hot"、"skyrocketing"、"don't miss out"。
- 被拒或超时永远说成 "still looking"，不说 rejected。
- 数字要带单位和窗口，例如 "Job ads, last 4 weeks"。
- **更新时间**：每个数据面都标出数据时间，用绝对时间："Updated today, 2:14 am"，跨天写 "Updated 21 Oct, 2:14 am"（用户时区）。不用 "15 hours ago"：每天结算一次的指标到傍晚会显得旧。放在来源行里，不单独占一行。行情条上的职位事件例外，用相对时间（"2 h ago"），因为事件本身是新的（2026-10-23 用户决定）。
- 产品名只从 `APP_NAME` / `useAppName()` 读取；所有界面文案放在 `messages/en/*.json`。
- 标语和开场动画：**待定**（候选见 PROGRESS）。

## 9. 响应式与无障碍

- 必须检查的宽度：375（手机）、768（平板）、1440（桌面）。`e2e/responsive.spec.ts` 守住"不出现横向滚动"。
- 表格在手机上收起次要列，用"Applies to"之类的行内说明替代。
- 触控设备和窄屏下，小控件通过 `::after` 扩展出至少 44×44px 的点击区（theme.css 里已经统一处理）。
- 焦点环：2px `accent`，偏移 2px，不允许移除。
- 文字对比度达到 WCAG AA。异步结果用 `aria-live` 播报。所有控件都有 label。

## 10. 不要做

- 渐变背景、光斑、玻璃拟态、emoji 装饰、紫色 SaaS 风。
- 卡片阴影（只有浮层可以有阴影）、大圆角、居中的营销式布局。
- 用荧光黄做装饰；用红绿以外的颜色表示涨跌；只靠颜色表达涨跌。
- 排行榜、名次、"Top 10 skills to learn"之类的说法。
- 双 y 轴、3D 图、饼图（份额用条形或堆叠面积）。

## 11. 海报

海报用一页展示这套视觉语言：色板、字体阶梯、一张行情卡、一张 breakdown 图、"不要做"清单。**等用户确认本文件后再做**，届时以这里的 token 为准生成。

## 12. 待定

| 项 | 状态 |
|---|---|
| 标语与开场动画 | 待用户拍板 |
| live data 动画、滚动效果、推特书签式交互 | 等用户发参考链接 |
| Breakdown v1 | 原型开发中（`fe-r2`），看过效果后再定稿 |
| 覆盖率提示的视觉（三档） | 暂缓（用户 2026-10-06 决定 A3 暂不做） |
