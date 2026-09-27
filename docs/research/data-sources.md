# 数据源调研：招聘广告数据从哪里来

> 2026-09-27，主会话。回答四个问题：不用 LinkedIn / SEEK，数据从哪来；中小企业缺口有多大；覆盖偏差怎么量化和展示；哪些来源可以谈授权。
> 标注 **[已核实]** 的内容有下方链接为据；**[待核实]** 的内容在上线前必须人工确认；本文不构成法律意见。

## 0. 结论先行

1. **阻断性发现：Adzuna 免费 API 不能支撑我们的核心指标。** 它的条款只允许免费用于"展示 Adzuna 广告列表""展示 Jobsworth 薪资估算""个人研究"；商业机构的其他用途只有 14 天试用，且**明确禁止以原始或聚合形式（包括职位计数、平均薪资）交付任何持续性工作**，除非获得书面同意 [已核实]。另外，免费限额是每天 250 次、每月 2,500 次 [已核实]，低于架构 §6.7 假设的每天 400 次。
   → 架构 §6.2 / §6.7 以 Adzuna 为技能级主力的方案，**在没有书面授权前不能上线**。M1 的前置条件要改（见 §6）。
2. **可行的替代主力：招聘系统（ATS）的公开职位 API。** Greenhouse、Lever、Ashby、Workable、SmartRecruiters、Recruitee、Workday 等都提供无需认证的公开职位接口，本意就是让外部读取和转发职位 [已核实为公开接口；各家条款待核实]。这是第一手数据，职位下架即消失，没有僵尸广告。美国的 LinkUp 就是靠"只采集雇主官网"做成了数据生意。
3. **官方数据当"总量标尺"。** JSA 的 Internet Vacancy Index（IVI）覆盖 SEEK、CareerOne 和 Workforce Australia，月度更新，2006 年起有数据，细到 ANZSCO 4 位 × 州 / SA4 [已核实]。SEEK 的信号只能通过它合法拿到，但只到职业级。
4. **中小企业缺口是实打实的。** 2023–24 年，0–19 人的小企业雇用了私营部门约 39% 的员工（超过 500 万人），建筑业高达 62% [已核实，ASBFEO 引用 ABS]。它们大多没有 ATS，只在 SEEK、Indeed 等平台上发广告。ATS 路线会系统性低估中小企业密集的行业和技能（例如 Xero、MYOB、建筑、零售、护理）。
5. **因此必须把覆盖率做成一等公民**：每个"职业 × 州"每月计算一次覆盖率，按覆盖率分级展示或隐藏信号（见 §4）。这比假装数据完整更符合 PRD §10.1。

## 1. 来源清单与评级

| 层 | 来源 | 内容与粒度 | 许可 / 条款 | 用途 | 评级 |
|---|---|---|---|---|---|
| 官方 | **JSA IVI** | 新发布广告数；ANZSCO 4 位 × 州 / SA4；月度；2006 起；来源为 SEEK、CareerOne、Workforce Australia | JSA 出版物普遍使用 CC BY 4.0；**IVI 数据集本身的许可待核实**（官网抓取超时） | role 的 `ad_count` 与长期历史；覆盖率分母；按职业重新加权 | ✅ 主力（职业级） |
| 官方 | **JSA Total New Vacancies（TNV）** | 季度"全部新增岗位"估计，由 IVI 和雇主招聘调查（REOS）合成，包含不走网络招聘的岗位 [已核实] | 同上，待核实 | 回答"网络广告只占招聘的多少"；解释覆盖率 | ✅ 背景校准 |
| 官方 | **ASC / National Skills Taxonomy** | ASC 有三层：10 项核心能力；1,925 项专业任务，归入 279 个技能簇、29 个技能簇族；88 项技术工具 [已核实，NSC 页面]。JSA 正在制定新的 National Skills Taxonomy，目前处于讨论稿阶段 [已核实] | CC BY 4.0（待核实） | skill 定义框架（GLOSSARY §5）；技能字典种子；role 成分权重初值 | ✅ 分类体系 |
| 公开指数 | **Indeed Hiring Lab**（GitHub） | 职位总量指数、远程占比、AI 词占比、广告薪资增速等；多国，其中远程指数明确包含澳洲 [已核实] | **CC BY 4.0，注明出处即可** [已核实] | 中小企业比重较高平台的趋势参照；远程占比校准 | ✅ 参照 |
| 第一手 | **ATS 公开职位 API**：Greenhouse、Lever、Ashby、Workable、SmartRecruiters、Recruitee、Workday | 单条职位：标题、地点、部门、全文、申请链接，部分有薪资 | 接口公开、无需认证 [已核实]；**各家服务条款与商用限制逐家待核实** | 技能级计数、entry-level、工作权利、远程、存活判断 | ✅ 技能级主力（需先核条款） |
| 第一手 | **PageUp**（澳洲大学、政府和大雇主常用）、SuccessFactors | 雇主招聘页 | 是否有公开接口待核实 | 补大学和政府岗位 | ❓ 待查 |
| 政府职位板 | APSJobs、各州政府职位板 | 公共部门岗位 | 条款与数据源待核实 | 补公共部门（约占总就业的 17%，待核实） | ❓ 待查 |
| 需授权 | **Adzuna** | 聚合广告；有付费的 "Adzuna Intelligence"：分析门户、自定义聚合、结构化数据、API，8 年历史，**最少 12 个月授权** [已核实]；它还给 Workforce Australia 和英国统计局供数 [已核实] | 免费 API 禁止聚合统计商用 [已核实] | 如谈成：广度补充、薪资 | 🔶 需谈 |
| 需授权 | **Employment Hero** | 澳洲中小企业 HR、薪酬和招聘系统，自带职位板；已发布基于 30 万家企业薪酬数据的 SME 指数 [已核实] | 无公开数据授权 | **补中小企业缺口的最佳候选** | 🔶 需谈（有用户规模后） |
| 需授权 | JobAdder（猎头常用）、大学就业中心平台（如 CareerHub） | 猎头和校园岗位 | 待谈 | 补猎头和校园缺口 | 🔶 远期 |
| 禁用 | LinkedIn、SEEK、Indeed 网站抓取 | — | 服务条款禁止；CLAUDE.md 已定约束 | 不用 | ⛔ |

## 2. 为什么不碰 LinkedIn / SEEK

- **hiQ v. LinkedIn 的真实结局** [已核实]：hiQ 在"爬公开页面是否违反 CFAA"这一点上曾经胜诉，但 2022 年 12 月双方以同意判决结案：hiQ 承担 50 万美元判决，理由包括违反 LinkedIn 用户协议、用假账号访问需要登录的页面等；hiQ 须删除全部 LinkedIn 数据，未经许可不得使用、分发或出售。这个案子不是"爬取合法"的先例，而是反例。
- **澳洲隐私监管** [已核实]：OAIC 与 11 个监管机构在 2023 年 8 月发布联合声明，直接致函包括 LinkedIn 在内的平台，强调**公开可见的个人信息仍受隐私法保护**；2024 年 10 月又发布了后续声明。招聘广告里常有招聘人员的姓名和联系方式，我们无论从哪个来源采集，都要在入库前剥离这些个人信息（APP 3 数据最小化）。
- **商业风险**：一个公开展示数据的商用产品很容易被发现和取证；平台还可以直接封禁，数据源随时会断；而我们的核心卖点是"可信"。

## 3. 竞品的数据从哪来（回答"为什么他们能卖数据"）

| 公司 | 来源 | 客户 | 对我们的启示 |
|---|---|---|---|
| **LinkUp** | 每天直接采集 7.5 万到 8 万家雇主官网，2007 年起有历史，追踪职位的上架和下架 [已核实] | 系统化对冲基金、资产管理和私募（招聘数据属于"另类数据"）[已核实]；与 S&P 合作编制职位指数 | 证明"只用雇主官网"的数据可以做成高质量数据；它的卖点正是没有重复和僵尸广告 |
| **Lightcast** | 抓取全球 22 万多个网站，包括雇主官网、招聘平台、聚合站、政府站；去重后最多剔除约 80% 的记录 [已核实] | 大学、政府、企业 HR | 规模化抓取加法务团队；**JSA 自己的部分分析产品也用 Lightcast 数据**（据搜索结果，具体范围待核实） |
| **Adzuna Intelligence** | 自家聚合的广告 | 政府统计部门（英国统计局、Workforce Australia）、企业 | 我们的"免费午餐"正是它的付费产品，所以它的条款才会禁止聚合统计商用 |

**我们是不是在免费送出值钱的东西？** 它们卖的是原始明细、多年历史、API 和定制报告，一份年费动辄几万美元起；我们免费展示的是面向学生的汇总趋势。另外，从授权数据派生的汇总本来就不能转售。我们独有、别人没有的是"市场信号 × 人"的数据：学生关注什么、从业者说了什么、聊完之后学生改了什么方向。按 PRD 的中立防火墙，将来可以给大学提供匿名汇总洞察，但个人数据永不出售。

## 4. 覆盖偏差：怎么量化、怎么展示

**4.1 偏差从哪来**

| 覆盖好 | 覆盖差 |
|---|---|
| 有 ATS 的中大企业：科技、银行、咨询、大学、graduate program | 小企业（私营就业的 39%，建筑业 62%）、猎头、只在 SEEK 发广告的岗位 |

偏差**不是稳定的**：它随行业变化，也随经济周期变化（例如加息时中小企业往往先收缩招聘）。"只看占比和变化就不怕漏"的假设不成立。

**4.2 覆盖率指标（建议写进架构，作为 M1 的硬指标）**

- `coverage_ratio(anzsco4, state, month)` = 我们在该格子里去重后的新增广告数 ÷ IVI 在该格子的新增广告数。
- 局限：IVI 本身只统计三个招聘平台，不是"全部岗位"。两个来源的人群高度重叠但并不相同，所以这个比值是**近似的相对覆盖率**，不是精确的抽样率。TNV 可以用来说明"网络广告本身只覆盖多少招聘"。
- **重新加权**：skill 的 `share_of_ads` 按职业 × 州用 IVI 占比做事后分层加权，纠正"大企业和科技行业过度代表"的问题。**修不了的**：同一职业内部，中小企业和大企业用的技能不同（例如小所会计用 Xero，大企业用 SAP），这部分我们观察不到。

**4.3 展示规则（对应 PRD §10.1）**

| 覆盖率 | 展示 |
|---|---|
| ≥ 40%（阈值待用真实数据标定） | 正常显示 |
| 15–40% | 数字旁显示覆盖说明："We see about X% of ads for this occupation; small businesses may be under-counted." |
| < 15% 或样本不足 | 不显示信号和变化，只显示"Not enough coverage yet" |

skill 的覆盖率取其所在主要职业覆盖率的加权值。industry 页展示该行业的整体覆盖率。

**4.4 对产品范围的影响**

- 首发的悉尼大学工程与 IT × 软件和数据方向，是 ATS 覆盖最好的领域，MVP 不受影响。
- 本轮 fixture 新增的非 tech 行业（建筑、零售、护理等），上线时大概率落在覆盖率偏低或不足的档位。要么带着说明上线，要么等 Employment Hero 这类中小企业来源谈下来再开放，**需要用户拍板**。

## 5. 采集方式要点（给 M1 实现参考）

- **雇主登记表**：`employers(name, abn?, ats, board_token, anzsic, size_band, verified_at)`。种子从 ASX 200、四大、银行、大学、各级政府、澳洲科技公司人工整理；每家记录它用的 ATS 和公开接口地址。
- **每天每家一次请求**：拉取全部在招职位；新出现 = 新增，消失 = 关闭（这就是 live data）。对雇主服务器的压力可以忽略；遵守 robots.txt 和各家限速，带可识别的 User-Agent。
- **去重**：同一职位可能同时出现在多个 ATS 或渠道中，按 `(employer, normalized_title, location, 描述 hash)` 去重。
- **隐私**：入库前剥离个人姓名、邮箱、电话；只保留派生字段（沿用架构 §6.2 的 30 天原文保留期）。
- **可替换**：继续沿用架构的 `AdsSource` 接口，Adzuna 若谈成，作为另一个 source 接入。

## 6. 建议的决策（写入 PROGRESS 待拍板）

1. **M1 数据主力改为"ATS 公开 API + JSA IVI 校准"**，Adzuna 从主力降为"谈成再接"。影响：架构 §6.2、§6.7 与 M1 范围要重写（新增雇主登记表、ATS 适配器、覆盖率计算）；M1 估算可能上调。
2. **覆盖率成为一等指标**：`coverage_ratio` 进入指标注册表，并按 §4.3 规则展示。
3. **上线前人工核实清单**（用户 / Codex）：JSA IVI 与 ASC 数据集许可；Greenhouse、Lever、Ashby、Workable、SmartRecruiters、Workday 的服务条款中关于商用和聚合的条款；PageUp 是否有公开接口；APSJobs 与州政府职位板条款。
4. **对外沟通（由用户本人发出）**：
   - 现在：给 Adzuna 发邮件，询问初创和教育类用途能否书面授权聚合计数；筹码是注明出处、按条款展示 "Jobs by Adzuna" 链接给他们导流（展示广告列表本来就是允许的免费用途）。
   - 有用户规模后：Employment Hero（中小企业）、SEEK、大学就业中心。
5. **非 tech 行业上线策略**：带覆盖说明上线，还是等中小企业来源谈下来再开放。

## 附：来源

- Adzuna API Terms of Service — https://developer.adzuna.com/docs/terms_of_service
- Adzuna Intelligence（付费数据授权）— https://www.adzuna.co.uk/adzuna-intelligence/ ；G-Cloud 服务说明 — https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/499953347032977
- JSA Internet Vacancy Index 与方法 — https://www.jobsandskills.gov.au/data/internet-vacancy-index ，https://www.jobsandskills.gov.au/data/internet-vacancy-index/methodology
- JSA Total New Vacancies — https://www.jobsandskills.gov.au/news/new-measure-job-vacancies-launched-today
- JSA National Skills Taxonomy — https://www.jobsandskills.gov.au/data/national-skills-taxonomy
- ASC 结构（NSC）— https://www.nationalskillscommission.gov.au/reports/australian-skills-classification-10/part-3-methodology/32-structure-classification-and-its-coverage
- ASBFEO（引用 ABS Australian Industry 2023–24）— https://www.asbfeo.gov.au/small-business-data-portal/contribution-australian-employment
- Indeed Hiring Lab 数据（CC BY 4.0）— https://github.com/hiring-lab ，https://www.hiringlab.org/indeed-data-faq-2/
- Greenhouse Job Board API — https://developers.greenhouse.io/job-board
- ATS 公开接口比较 — https://dev.to/primeflowio/how-to-pull-every-open-job-from-greenhouse-lever-ashby-and-smartrecruiters-with-public-apis-and-55l5
- LinkUp — https://www.linkup.com/products/raw ，https://www.linkup.com/industry-solutions/capital-markets
- Lightcast 数据方法 — https://kb.lightcast.io/en/articles/7124763-data-collection-and-processing-methodology ，https://kb.lightcast.io/en/articles/6957661-how-does-lightcast-handle-duplicate-postings
- hiQ v. LinkedIn 结案 — https://natlawreview.com/article/hiq-and-linkedin-reach-proposed-settlement-landmark-scraping-case ，https://en.wikipedia.org/wiki/HiQ_Labs_v._LinkedIn
- OAIC 数据爬取联合声明 — https://www.oaic.gov.au/news/media-centre/global-expectations-of-social-media-platforms-and-other-sites-to-safeguard-against-unlawful-data-scraping ，https://www.oaic.gov.au/news/media-centre/global-privacy-authorities-issue-follow-up-joint-statement-on-data-scraping
- Employment Hero SME Index — https://employmenthero.com/sme-index/
