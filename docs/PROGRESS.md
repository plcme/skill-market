# PROGRESS

> 进度账本。会话中断或上下文被压缩后，从这里恢复。由主会话维护。
> 结构：当前状态 → 里程碑 → 待拍板（只列还开着的）→ 上 main 前必须做 → 前端反馈轮次 → 日志。

## Onboarding 继续调整：注册前置与分步内容（2026-10-25，fe-r9）

- 用户明确要求注册在个性化之前：未登录的 Get started 进入 `/auth/login?next=%2Fonboarding`；直接访问 onboarding 也先转登录。完成现有预览邮箱链接流程后才进入 Basics → Skills → Your board，保留三步可点击导航。这覆盖此前“无需账户”的界面方向；当前仍是浏览器演示账户，不声称已接真实邮箱或 Supabase。
- 第 2 步仅展示 Skills you probably have；每行使用书签图标关注与红框删除，板块标题旁复用 WatchAllButton。第 3 步仅展示 Roles that ask for these 和 Close to what you have，两块各有自己的 Watch all；大标题右侧直接进入 Market，移除末尾注册/保存卡。
- 357 个单元测试、静态/类型检查、生产编译通过。新 8 项手机/平板测试验证注册前置、真实预览注册回跳、步骤往返、三个批量关注分别变为 All watched、删除焦点与 Undo、内容隔离、横向溢出和 axe。初次手机 axe 报告发生于入场动画半透明帧；改为等待有限时长动画完成后审计，8 项全过。
- 独立桌面测试验证 Market 按钮在标题右侧且链接可用，无页面运行错误；截图在 `/private/tmp/onboarding-skills-separated.png` 与 `/private/tmp/onboarding-recommendations-separated.png`。用户侧浏览器控制当前被设置禁用，未声称成功刷新用户标签页；3019 服务已切换到最新构建。
- 自 `869621a` 以来的流程修改尚未额外提交、推送或合并。

## Onboarding 流程更新（2026-10-25，fe-r9）

- 按用户预览反馈，改为三步：Basics → Skills → Your board。技能检查页独立为第 2 步，标题显示所选学位；顶部步骤可点击，尚无基础答案时 Skills 暂不可用。
- 移除 onboarding 的 units 页面、入口和专用说明；技能列表不再显示 Job ads 标题与招聘广告数量，改用现有 WatchButton 和红色边框删除按钮。/me/skills 的旧 units 入口同步指回基础答案页。
- 用户本轮已明确取消课程勾选页，因此当前界面不再执行 PRD FR-O2；PRD 由用户维护，未擅自改写。底层课程数据、已有画像中的 unit_codes 和相关契约操作保留，契约 UI 映射已标明无当前入口。
- 本轮静态/类型检查、357 个单元测试、6 项手机/平板 onboarding 浏览器检查通过；隔离生产构建退出码 0。同一 3019 预览已更新并目视核对。上一轮 50 项响应式结果对应上一提交，本轮只重跑与变化相关的 6 项。
- 本轮变更尚未提交、推送或合并；前一次文案删减已提交为 `869621a`。

## 当前状态（2026-10-24）

- 模糊搜索整合分支已同步菜单、Watch all 与主干规则；等待 PR CI 全绿后合并，尚未发布。原分支验证记录见 `docs/FUZZY_SEARCH_IMPLEMENTATION.md`。

- M0 本地完成（云端接入未完成，见 `docs/SETUP.md`）。之后一直在做前端原型迭代：FE-R1 到 FE-R7 已全部进入 `main` 并上线（`brewdex.app`，Cloudflare）。
- **Git 流程（2026-10-23 起）**：只有 `main` 一条长期分支，短分支 → PR → 用户授权合并（仅集成）→ 另经发布授权推送 `v*` tag 才上线；`dev` 停用（其内容 `main` 已全部包含）。
- 前端是完整可交互原型：市场数字来自合成引擎，用户数据存浏览器 localStorage，**没有接 Supabase**。
- **数据来源已定（2026-10-23）**：第一版技能级只用 Greenhouse、Lever、Ashby 的公开职位接口，岗位级与覆盖率校准用 JSA IVI；不接 Adzuna、Workday。三家接口和 IVI 都**没有明文许可**，商业化前要拿到书面答复并请律师看（`docs/SETUP.md` §6）。
- 采集节奏：指标每天结算；每小时轻量检查新职位，按雇主活跃度（泊松速率 λ）调频；盘中喂行情条与"今日新增"；每个数据面标出 "Updated today, 2:14 am"（架构 §6.7、`DESIGN.md` §8）。
- 产品名已确定为 **Brewdex**（2026-10-23）；域名已买：`brewdex.app`。
- 本机限制：Mac 跑不动全量数据库，数据库与 pgTAP 测试走 Windows 桥接（见 CLAUDE.md "本机开发环境"）。
- 下一步：继续前端反馈轮次，或开始 M1 接真实数据，由用户决定。

## 里程碑

| 里程碑 | 状态 | 备注 |
|---|---|---|
| M0 仓库、CI、基础设施接入 | 本地完成；云端待接入 | 草稿 PR：https://github.com/plcme/skill-market/pull/1 |
| M1 数据基础 | 待开始 | 前置：`docs/SETUP.md` §6 JSA 许可、§2 Vault |
| M2–M7 | 原型已有，未接后端 | 界面在 FE-R1 到 R7 中做出，接后端时逐页替换演示数据 |
| M8 上线准备 | 待开始 | 前置：`docs/SETUP.md` §7 |

## 待拍板（还开着的）

| # | 问题 | 建议 / 现状 | 何时需要 |
|---|---|---|---|
| 2 | 错误监控接不接 Sentry（EU，PII scrub） | 接 | M8 前 |
| 3 | 备份强度：每日 schema + 公共数据 artifact，每周全量加密 dump | 接受 | M8 前 |
| 4 | Vercel Hobby 禁止商用：升 Pro（USD 20/月）还是迁 Cloudflare Workers | 开发期留在 Hobby，上线时再选 | M8 |
| 5 | 非 tech 行业（建筑、零售、护理）ATS 覆盖率低：带覆盖说明上线，还是等中小企业来源谈成再开放 | 带说明上线 | M2 上线前 |
| 6 | 新增环境变量：`NEXT_PUBLIC_APP_URL`（`https://brewdex.app`）、`ATS_USER_AGENT`（需要一个联系邮箱）、`MIN_SAMPLE_N`、`SENTRY_DSN`（若接）；`JOBS_SECRET` 已有 | 由用户 / Codex 写入 `.env.example` | M1 前 |
| 7 | skill 的 Median salary 默认不按 Experience 拆开，可能被读成"学了就能拿" | 单独给 salary 默认拆分，或加提示 | 前端下一轮 |
| 8 | Watching 是否包含 held（I have this / Worked in this role） | 目前包含 | 前端下一轮 |
| 9 | onboarding 里是否让学生设默认口径（entry-level / No PR），作用于行情表 | — | 前端下一轮 |
| 10 | role 的 12-month change 大数字来自官方序列，图是 Job ads，口径不一致 | 接真实数据后再定 | M1 / M2 |
| 11 | watchlist "加入以来变化"改用 Demand 原始计数后会混入全市场涨落；旧 `share_of_ads` watch 条目需迁移并重置 baseline | 接后端时处理 | M3 |
| 12 | 细分行业颗粒度：ANZSIC Subdivision 还是 Group | — | 前端下一轮 |
| 13 | 未排期的产品想法：首页标语与开场动画；LinkedIn 证书导入；Twitter 书签式交互；对比页超过 2 个标的 | — | 用户提出时 |
| 14 | 已登录学生在 mini-board 删掉的建议技能，改了学位 / units 重新推断后会再出现：契约规定删除建议是硬删除、不留拒绝记录（`removeSkill`），所以没有地方记住“不是我的” | 二选一：① 接受现状（只在本次页面会话内有效）；② 在契约里加一张 `student_skill_dismissals`（只存 slug，用户可在设置里清空），重新推断时跳过。未登录时已在本机记 `removed_skills`，登录合并时不加回 | 接后端（M3）前 |

已决定、不再列出：产品名 Brewdex（域名 `brewdex.app` 已买，`APP_NAME` 默认值为 `skill-market`，仅 `brewdex.app` 发布配置为 `Brewdex`）；数据来源（→ Greenhouse / Lever / Ashby + IVI；付费数据合作等有客户后由用户去谈）；采集节奏与更新时间格式；信号检验改用泊松（接真实数据后）；架构对 PRD 的调整（默认通过）；master level = 10 年以上（界面叫 Expert）；skill 显示 Median salary（PRD 已改）；详情页默认不拆分；No PR stated 时 Work rights 拆分置灰；Watching 放在最前；行情条去掉暂停键。

## 上 main 前必须做

- [ ] e2e 同步并全量跑通：`frontend.spec.ts`（:90、:103–121、:196）、`round2.spec.ts`（:35–58）、`detail-chart.spec.ts`、`responsive.spec.ts`；FE-R4 起改过的 e2e 都没跑过
- [ ] `eslint.config.mjs` 的 `globalIgnores` 加入 `.claude/worktrees/**`（否则 `eslint .` 会扫进 worktree）
- [ ] 清理已合并分支与 worktree（清单待用户确认后执行）
- [x] `docs/SETUP.md` Git 分支流程已同步为 `main` + PR 预览；Supabase 开发项目保留
- [ ] 用户确认后才合并 `main`

已知遗留（非阻断）：全部分档低于阈值时 thin 文案与画面不符（`breakdown-section.tsx:92`）；localStorage 禁用时主题手动选择不生效；单档低于阈值可被总量反推；`/sources` 仍用 `bg-signal-soft`；Watching 数量缺读屏说明；名称搜索时数量与列表不一致；整张 All 表传给客户端（接 Supabase 后改服务端过滤）；Sign in 链接丢筛选参数；375px 标签行可横滑但无提示；标题句子可能自相矛盾；被固定的 `by` 参数在 URL 中清不掉。

## 前端反馈轮次

| 轮 | 日期 | 分支 | 内容 | 审查 |
|---|---|---|---|---|
| R1 | 09-26 | `fe-feedback-r1`、`fe-industry`、`fe-responsive` | GLOSSARY；导航只留 Market / People；Demand / Job ads 命名；industry 标的与 `/i/[slug]`；375 / 768 适配；付费方中立防火墙文案 | A 退回 1 次后过；B、C2 一轮过 |
| R2 | 10-15 | `fe-r2` | DESIGN.md v1；来源文案中性化；ASC 技能分层；地点筛选 + 全澳 remote；breakdown 原型 | 退回 1 次（series 色对比度）后过 |
| R3 | 10-21 | `fe-r3-chart`、`fe-r3-colours` | 详情页单图（标题 "SQL in [All Australia ▾]"、Y axis、Split by）；配色、单色 logo、首页短标语 | chart 退回 1 次后过；colours 用户要求直接合并 |
| R4 | 10-22 | `fe-r4-cleanup` | 去掉多处页头与说明区块；Filter 面板重排；"标题即 filter"；只做澳洲 | 退回 1 次（触屏停不了轮播、e2e 断言）后过 |
| R5 | 10-22 | `fe-r5` | `?metric=` 同时驱动 Right now 与大图；Statistics；单色技能 logo；头像与 My desk 合并；"Worked in this role"；文案批注 11 条 | 3 轮（R3 后一行修复未复审） |
| R6 | 10-22 | `fe-r6` | 详情页默认不拆分；No PR stated 时 Work rights 置灰；Watching 标签 | 一轮过 |
| R7 | 10-22 | `fe-r7` | 行情表去掉 Filter 与 `?f=`；去掉 "MEASURE" 字样 | 退回 1 次（面包屑与搜索页链接带 `f`）后过 |
| R9 | 10-25 | `fe-r9` | 已登录 "Saved to your profile" 卡只留 Go to my desk；恢复 dev-only 文案批注（`?review=copy`，新 key `copy-review-v2`，43 条覆盖 onboarding 全部步骤与登录页）；mini-board 建议可删（带 Undo，未登录记在本机 `removed_skills`），Next steps 与 Roles 每行加 WatchButton | 待审 |

每轮的细节见 `docs/reviews/FE-R*.md` 与 git log。

## 日志（新的在上）

- 2026-10-23：去掉 `dev`，改为单主干（分支 → PR → `main` 仅集成，推送 `v*` tag 才上线）。同步 CLAUDE.md、架构 §3.3 / §10、里程碑、implementer / reviewer 定义；`ci.yml` 去掉 `dev`，`dependabot.yml` 改指 `main`，`migrate.yml` 改为只手动触发。
- 2026-10-23：核实 ATS 与 JSA 条款（三家 ATS 官方文档无明文许可也无禁止；Workday 无公开接口；IVI 许可未注明），第一版来源收窄；写入采集节奏、轻量检查、按活跃度调频、泊松信号、行情条盘中层、"Updated" 时间格式、`/bot` 页；记录域名 `brewdex.app`。

- 2026-10-23：文档整理。删除 `product-working-doc-original.md`、`FRONTEND_V2_BRIEF.md` 和本地 `coda-feedback/`；`SETUP_CHECKLIST.md` + `SETUP_STATUS.md` 合并为 `docs/SETUP.md`；去掉预算跟踪；数据来源定为 ATS 公开 API + JSA IVI 并同步 PRD / 架构 / 里程碑 / 术语表；架构 §4 路由表同步到 FE-R7；`FRONTEND_API_REPORT.md` 标为 FE-R2 快照；Windows 桥接写进 CLAUDE.md，桥接脚本与说明只留本机。
- 2026-10-22：FE-R5、R6、R7 合并 dev 并 push。lint / typecheck / 单测（280 → 282）/ build 通过；按用户偏好未跑 e2e。Windows 开发数据库就绪（13 项 pgTAP 通过）。
- 2026-10-22：FE-R4 合并 dev 并 push。lint / typecheck / 251 单测 / build 通过。
- 2026-10-21：FE-R3 两个分支合并 dev。全量 e2e `--workers=1` 134 过 2 跳过。Fable 已不可用，子 agent 全部用 Opus。
- 2026-10-15：FE-R2 合并 dev（4794852）。清理已合并的 worktree 与分支。
- 2026-09-27：数据源调研（`docs/research/data-sources.md`）：Adzuna 免费 API 禁止聚合统计商用，建议改用 ATS 公开 API + JSA IVI。
- 2026-09-26：FE-R1 合并 dev（d63e6b7）。用户决定放开付费方限制，PRD 与 CLAUDE.md 加入"中立防火墙"。
- 2026-09-24：分支 `frontend-v2` 重做完整交互前端（设计系统、合成市场引擎、全部页面），接口契约写入 `docs/FRONTEND_API_REPORT.md`。
- 2026-09-22：M0 本地完整验收通过（db reset、verify、13 项 pgTAP、集成测试、Playwright + axe）；草稿 PR #1。
- 2026-09-19：项目初始化；阶段 1 完成（ARCHITECTURE、MILESTONES），用户确认后进入阶段 2。
