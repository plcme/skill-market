# GLOSSARY — 术语表

> 产品、界面、代码三套用词的对照。所有 agent 在写文案、命名变量、讨论需求前以此为准。
> 由主会话维护；用户拍板后更新。状态为"未定"的条目不得擅自落地为界面概念。

## 1. 标的（target）

| 中文 | 界面用词（UI） | 代码 / 数据 | 说明 | 状态 |
|---|---|---|---|---|
| 标的 | target（对外尽量不直接出现，用具体类型名） | `instrument`，类型 `instrument_type` | 可被追踪、可 watch 的对象 | 已定 |
| 技能 | Skill | `instrument_type = 'skill'` | 具体可学、可验证的能力，如 SQL、Excel、AutoCAD。泛化软技能（communication 等）是否算 skill 见 §5 | 部分未定 |
| 职位 | Role | `instrument_type = 'role'` | 一组技能的加权组合（`RoleComponent.weight`），即"skill ETF"；ANZSCO 编码 | 已定 |
| 行业 | Industry | `instrument_type = 'industry'` | ANZSIC 第一层（Division，19 个） | 已定（2026-09-26） |
| 细分行业 | Sub-industry | `instrument_type = 'industry'` + `parent_id` | ANZSIC 下一层；数据模型预留，界面暂不展示 | 颗粒度未定 |
| 雇主 / 证书 | Employer / Credential | `'employer'` / `'credential'` | 仅类型预留，不做界面 | Post-MVP |
| 持仓构成 | Top holdings | `RoleComponent[]` | Role 页上展示的组成技能及权重 | 已定 |

## 2. 盘面（board）上的几个维度

| 中文 | 界面用词 | 代码 | 定义 |
|---|---|---|---|
| 筛选 | Filter | `FilterSpec`（`rules[]`、`seniority`、`work_rights`） | **作用于整张表**的范围：地区、工作方式、资历、工作权利。改筛选 = 改分母 |
| 纵轴变量 / 度量 | Measure | `MetricKey`（注册表 `src/lib/metrics/registry.ts`） | 每个标的显示的那个数字，也是图表的 y 轴 |
| 拆分 / 分布 | Breakdown | 尚无（设计中） | 把一个 measure 按某个维度切开（如 PR / 非 PR、entry / senior）。**可相加的量用堆叠面积，不可相加的量（中位数、占比）用多条线** |
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
| Median salary | `salary_median` | **仅 role**；skill 不提供原始薪资（会把"岗位偏资深"误读成"学了就能拿"） |
| Skill premium | `skill_premium` | 仅 skill，进阶指标；同一 role 内有无该技能的受控对比 |

## 4. 其他产品用词

| 中文 | 界面用词 | 说明 |
|---|---|---|
| 工作台 | My desk | 学生 `/me`；从业者 `/practitioner` |
| 关注 | Watch / Watchlist | 不用"持仓""组合收益""仓位强弱"（PRD §10.7） |
| 咖啡聊 | Coffee chat | 20 分钟、异步预约，不是 IM |
| 从业者 | Practitioner | 主动加入、持有该技能的在职者 |
| 数据与安全 | Data & safety | 页脚入口，含数据来源（原 Sources 页） |
| 主题 | Light / Dark | 默认跟随系统；手动点选后记住用户选择；界面上不出现"System"状态 |

## 5. 未定概念（不得擅自落地）

- **什么算 skill**：候选框架为 Jobs and Skills Australia 的 Australian Skills Classification（core competencies / specialist tasks / technology tools 三层）。倾向：后两层做成可追踪标的，core competencies 另行展示、不配指标。待用户拍板。
- **Breakdown 的具体维度与图形**：等"什么算 skill"与数据可得性确认后设计。
- **细分行业颗粒度**：ANZSIC Subdivision 还是 Group。
- **"master level"**：资历分层中的含义待用户澄清。
