# GLOSSARY — 术语表

> 产品、界面、代码三套用词的对照。所有 agent 在写文案、命名变量、讨论需求前以此为准。
> 由主会话维护；用户拍板后更新。状态为"未定"的条目不得擅自落地为界面概念。

## 1. 标的（target）

| 中文 | 界面用词（UI） | 代码 / 数据 | 说明 | 状态 |
|---|---|---|---|---|
| 标的 | target（对外尽量不直接出现，用具体类型名） | `instrument`，类型 `instrument_type` | 可被追踪、可 watch 的对象 | 已定 |
| 技能 | Skill | `instrument_type = 'skill'` + `skill_layer` | 具体可学、可验证的能力。按 ASC 分两层：**Technology tool**（`technology_tool`，如 SQL、Excel、AutoCAD）和 **Specialist task**（`specialist_task`，如 data analysis、project management） | 原型（2026-10-06，参考 ASC） |
| 核心能力 | Core competency | `competencies.ts`（不是 instrument） | ASC 的 10 项通用能力（Oral communication、Teamwork 等）。每份工作都用，**不追踪需求、不配指标**；只在 role 页按 1–10 展示强度。Communication 归这里 | 原型（2026-10-06） |
| 职位 | Role | `instrument_type = 'role'` | 一组技能的加权组合（`RoleComponent.weight`），即"skill ETF"；ANZSCO 编码 | 已定 |
| 行业 | Industry | `instrument_type = 'industry'` | ANZSIC 第一层（Division，19 个） | 已定（2026-09-26） |
| 细分行业 | Sub-industry | `instrument_type = 'industry'` + `parent_id` | ANZSIC 下一层；数据模型预留，界面暂不展示 | 颗粒度未定 |
| 雇主 / 证书 | Employer / Credential | `'employer'` / `'credential'` | 仅类型预留，不做界面 | Post-MVP |
| 持仓构成 | Top holdings | `RoleComponent[]` | Role 页上展示的组成技能及权重 | 已定 |

## 2. 盘面（board）上的几个维度

| 中文 | 界面用词 | 代码 | 定义 |
|---|---|---|---|
| 筛选 | Filter | `FilterSpec`（`rules[]`、`seniority`、`work_rights`） | **作用于整张表**的范围：地区、工作方式、资历、工作权利。改筛选 = 改分母 |
| 纵轴变量 / 度量 | Measure；详情页图表左上角的下拉（"Job ads ▾"），Filter 面板里叫 **Y axis** | `MetricKey`（注册表 `src/lib/metrics/registry.ts`）；详情页只有一个参数 `?metric=`（旧链接 `?y=ads\|salary` 自动改写成 `metric=ad_count\|salary_median`）；度量 → 图表的映射是 `chartPlanFor`（`src/features/market/logic.ts`） | 每个标的显示的那个数字。详情页上 "Right now" 大数字和图表永远显示同一个度量（2026-10-22）。Y axis 选项 = 有周序列的水平量（`CHART_SERIES`）：Job ads、Median salary（无 industry）、Entry-level share、No PR stated、Employers hiring、Remote or hybrid、Contract share。变化量不是选项，但选中后图表要对：4-week change → Job ads、3M，前后两个 4 周窗口加阴影并标出 from → to；12-month change → Job ads、2Y，两个 12 个月窗口加阴影；Volatility → Job ads、1Y；Salary range、Skill premium → Median salary |
| 拆分 / 分布 | Breakdown；界面叫 **Split by** | `?by=experience\|rights\|mode\|none`（缺省 = Experience），注册表 `breakdown: 'stack'\|'lines'\|null` | 把一个 measure 按**一个**维度切开。**只能在标题打开的 Filter 面板里改**（2026-10-22），图表上没有拆分控件。维度：Experience · Work rights · Work mode（地点不是维度）。筛选已把某维度固定成一个桶时（Entry-level/Graduate → Experience；只选一种 work mode → Work mode），该选项置灰并注明 "Fixed by your filter"；占比按它自己的维度拆没有意义（Entry-level share × Experience 等），置灰并注明 "Not for this measure"。被固定的 `by` 不留在 URL 里（改成 `none`；缺省的 Experience 不写参数）。标题句子在拆分时加 "· by experience"。**可相加的量用堆叠面积，不可相加的量（中位数、占比、雇主数）用多条线**。详见 `docs/DESIGN.md` §6.3 |
| 经验段 | Entry / Mid / Senior / Expert | `experience`：0–2 / 3–5 / 6–9 / 10+ 年 | Expert = 用户说的 "master level"（10 年以上）；界面不用 Master 以免和硕士学位混淆 |
| 地点 | Places + "Also include remote jobs anywhere in Australia" | `FilterSpec.rules`（OR 合并） | 地点是整张表的筛选；开关 = 追加规则 `{remote, au}`。只有澳大利亚：All Australia（`au`）是固定底，不能选也不能删；只能缩小到州、城市或区域，删掉最后一个就回到 All Australia（2026-10-21）。详情页标题里的 "in …" 是整条筛选的一句话，比如 "SQL in [Sydney + remote · Entry-level ▾]"：地点总在前，其他条件只列缩小范围的那些，用 " · " 分隔，多规则时写 "custom places"。点它打开和行情表 Filter 按钮同一个面板；"in …" 字号小于标的名（2026-10-21，取代 10-17 的地点弹层和可删除条件标签） |
| 排序 | Sort | `sort`：`value` / `change` | 只有"按度量""按变化"两种；不提供 A–Z |
| 视图 | View | `view`：`list` / `cards` | 列表或卡片 |
| 信号 | Signal | `Signal`（`rise` / `fall` / `entry_open` / `since_added`） | 满足阈值的显著变化；不代表"应该去学" |

## 3. 度量（measure）用词

| 界面用词 | 代码 | 定义 |
|---|---|---|
| **Demand**（度量选择器里的名字） / **Job ads**（表格列头、数字单位） | `ad_count` | 时间窗内提到该标的的招聘广告数 |
| Share of ads（只在定义弹窗里作为辅助说明出现） | `share_of_ads` | 提到该标的的广告 ÷ 同筛选下的全部广告；用于扣除整体市场涨落 |
| 4-week change | `change_4w` | 近 4 周对比前 4 周的相对变化，并显示 from → to 原始计数 |
| 12-month growth | `growth_12m` | 同比变化 |
| Entry-level share | `entry_level_share` | 文本抽取，需标注方法与误差 |
| No PR required | `no_pr_required_share` | 文本抽取，需标注方法与误差 |
| Median salary | `salary_median` | role 和 skill（2026-10-17 用户决定 skill 也显示）。只统计写明薪资的广告。为避免把"岗位偏资深"误读成"学了就能拿"，skill 上默认按 Experience 拆分 |
| Skill premium | `skill_premium` | 仅 skill，进阶指标；同一 role 内有无该技能的受控对比 |

## 4. 其他产品用词

| 中文 | 界面用词 | 说明 |
|---|---|---|
| 工作台 | My desk | 学生 `/me`；从业者 `/practitioner` |
| 关注 | Watch / Watchlist | 不用"持仓""组合收益""仓位强弱"（PRD §10.7） |
| 我有这个技能 | I have this skill（desk 分组 "Held — skills you have"） | watch 的 `status = 'held'`，`instrument_type = 'skill'`。学生已经掌握的技能；不进"学习中"统计 |
| 我在这个岗位干过 | Worked in this role（desk 分组 "Worked in this role"） | watch 的 `status = 'held'`，`instrument_type = 'role'`（FE-R5，2026-10-22）。和 skill 共用 `held`，按标的类型区分文案；能否标记由 `canBeHeld` 判断（industry 不行）。标记后在 role 页邀请一次 "Join as a practitioner"（已是 practitioner 的不显示） |
| 咖啡聊 | Coffee chat | 20 分钟、异步预约，不是 IM |
| 从业者 | Practitioner | 主动加入、持有该技能的在职者 |
| 数据与安全 | Data & safety | 页脚入口，含数据来源（原 Sources 页） |
| 主题 | Light / Dark | 默认跟随系统；手动点选后记住用户选择；界面上不出现"System"状态 |

## 5. 未定概念（不得擅自落地）

- **什么算 skill**：按 ASC 三层做原型（见 §1），看过效果后定稿。
- **Breakdown**：v3（2026-10-22）：详情页只有一张图；图表左上是度量下拉，右上只有 3M / 6M / 1Y / 2Y；Y axis 和 Split by 都在标题打开的 Filter 面板里（在 "Currently showing" 之后、Work rights 之前），随 Apply 一起生效。v2 原型 https://claude.ai/artifact/72Ka23B5tHtKwUWCQfyE1V 。
- **细分行业颗粒度**：ANZSIC Subdivision 还是 Group。
