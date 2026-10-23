# CLAUDE.md — skill-market

## 项目是什么

一个面向澳洲大学生的可商用 Web 产品：把劳动力市场需求做成可追踪的"盘面"（skill / role 两类标的），并由市场信号触发，把学生匹配给持有该技能的在职从业者做 20 分钟咖啡聊。产品名已确定为 **Brewdex**（2026-10-23），仓库代号 `skill-market`。域名已买：`brewdex.app`（2026-10-23）；代码里不写死域名，绝对链接一律读 `NEXT_PUBLIC_APP_URL`。

**唯一需求来源是 `docs/PRD.md`。** 研究依据在 `docs/research/`。**术语以 `docs/GLOSSARY.md` 为准**（所有 agent 必读；界面文案、变量命名、需求讨论都按它的用词）。PRD 与研究冲突时以 PRD 为准；PRD 没说清的，做合理假设并记录到 `docs/PROGRESS.md` 的"待拍板"，不要停下来问。

这不是课程作业，按真实上线、真实用户、真实合规的标准做。

## 语言与命名规范

- **与用户的所有对话回复一律用中文**（包括汇报、提问、总结）；代码块、命令、文件路径保持原样
- 文档正文用中文；术语、字段名、变量名、API 路径、命令用英文（如"ticker card 展示 `skill` 的 `share_of_ads`"）
- 代码、代码注释、commit message 用英文
- 产品界面文案默认英文，集中管理，不写死在组件里（为 i18n 预留）
- 产品名只能从配置常量 `APP_NAME` 读取，任何地方都不许写死

## 已定约束（不要推翻，除非在"待拍板"里说明理由）

- 技术栈：Next.js（TypeScript）+ Supabase（Postgres、Auth、Storage，区域 ap-southeast-2 Sydney）+ Vercel + Resend + GitHub Actions
- **全部使用免费档**；唯一付费项是域名（已买 `brewdex.app`）
- Vercel Hobby 不允许商用 → 不要依赖 Vercel 专有功能，保持可迁移到 Cloudflare 等平台
- 数据只用许可允许的来源；禁止抓取禁止抓取的平台（LinkedIn、SEEK 等）
- 第一版数据来源：技能级只用 Greenhouse、Lever、Ashby 三家招聘系统（ATS）的公开职位接口；岗位级与覆盖率校准用 JSA IVI；分类用 ASC、ANZSCO。不接 Adzuna，不用 Workday（没有公开接口），其余 ATS 核实条款后再加（见架构 §6.2、§6.7、§6.8）。付费数据合作（Adzuna、Indeed 等）等有客户后由用户去谈
- 遵守澳洲 Privacy Act / APPs；个人数据存放在澳洲区域
- 付费方不限（见 PRD §12.1），但收入永远不影响盘面数据与展示；MVP 不做付费功能与雇主侧功能

## 工作流（主会话负责调度；子 agent 一律用 Opus）

用户已授权主会话按下面的流程使用子 agent，无需每次再问。

### 阶段 1：架构（主会话自己做）

1. 读 `docs/PRD.md` 与 `docs/research/`
2. 写 `docs/ARCHITECTURE.md` 和 `docs/MILESTONES.md`（要求见启动 prompt）
3. 更新 `docs/PROGRESS.md`
4. **停下，等用户确认架构。** 未经确认不得进入阶段 2

### 阶段 2：按里程碑循环

对 `docs/MILESTONES.md` 中的每个里程碑 M{n}，按顺序：

1. **前置检查**：该里程碑"需要人类完成的事项"是否已完成（查 `docs/SETUP.md`，由用户和 Codex 维护）。未完成 → 停下，给用户一份逐步操作清单，等完成后再继续
2. **实现**：派 `implementer` 子 agent（Opus），只给它这一个里程碑。它在分支 `m{n}-<slug>` 上工作
3. **审查**：派 `reviewer` 子 agent（Opus），审查该分支相对 `dev` 的改动
4. **结论**：
   - 通过 → 合并到 `dev`，push（如已有 remote），更新 `docs/PROGRESS.md`，进入下一个里程碑
   - 退回 → 把 `docs/reviews/M{n}.md` 的问题清单交给 implementer 修复，再审
   - **同一里程碑退回 3 次 → 停下找用户**
5. 每个里程碑结束时向用户简短汇报：完成了什么、审查结论、有无待拍板事项

前端反馈轮次（FE-R{n}）走同样的实现 → 审查 → 合并流程：分支 `fe-r{n}`，审查记录 `docs/reviews/FE-R{n}.md`。

### 必须停下来找用户的情况

- 阶段 1 架构完成后（等确认）
- 需要开账号、填密钥、买域名、做任何需要人类身份的操作
- 合并到 `main`（= 生产环境部署）之前
- 同一里程碑审查退回 3 次
- 任何不可逆或对外可见的操作：删除数据、改动生产数据库、发送真实邮件给非测试用户、修改 DNS
- 需要推翻"已定约束"时

### 省用量

- 主会话不亲自写大段实现代码；给子 agent 的任务说明要完整自包含，避免它反复摸索；审查只看 diff 和相关文件，不重读整个仓库

## 本机开发环境

用户的 Mac（8GB）跑不动全量本地 Supabase。数据库、pgTAP / RLS 测试、集成测试等重型任务经 Mac → Windows 桥接在 Windows 开发机的 Docker 里执行；Mac 只负责编辑、lint、typecheck、单测和前端预览。

- `bash scripts/windows-backend status|start|stop|test|build`：操作 Windows 上的独立开发数据库（`test` = pgTAP + 健康检查）
- `bash scripts/remote-dev probe|ready|status|run`：底层桥接
- 远端代码不会自动同步：测试新代码前先把改动同步过去
- 细节（目录、端口、注意事项）见 `docs/REMOTE_DEVELOPMENT.md`。这三个文件只在本机，已加入 `.git/info/exclude`，不提交

## Git 约定

- `main` = 生产（Vercel production），**只有用户确认后才合并**
- `dev` = 集成分支（Vercel preview）
- 每个里程碑一个分支 `m{n}-<slug>`，从 `dev` 切出
- commit 小而清晰，英文，conventional commits 风格（`feat:`、`fix:`、`chore:`…）
- 永远不提交 `.env*`（`.env.example` 除外）；永远不在输出中打印密钥

## 文件分工（避免与 Codex 冲突）

| 文件 | 负责方 |
|---|---|
| `docs/PRD.md` | 用户（agent 只能在"待拍板"里提修改建议） |
| `docs/ARCHITECTURE.md`、`docs/MILESTONES.md`、`docs/PROGRESS.md`、`docs/DESIGN.md`、`docs/GLOSSARY.md` | 主会话 |
| `docs/reviews/*.md` | reviewer |
| `docs/SETUP.md`、`.env.example` | 用户 + Codex（agent 只读；需要新增环境变量时在 PROGRESS.md 里提出） |
| `docs/research/*`、`docs/FRONTEND_API_REPORT.md` | 只读快照（接后端前刷新 API 报告） |
| 代码 | implementer |

## 质量底线

- TypeScript strict；lint 与类型检查零错误
- 核心逻辑（指标计算、筛选规则、匹配、请求超时、权限）必须有自动化测试
- Supabase 所有表启用 RLS，并有对应测试
- 每个里程碑的验收命令必须能在本地一条命令跑通
- UX 必须遵守 `docs/PRD.md` §10 的原则（每个数字有定义与来源、不排名、推断即建议等）
- 前端：**Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.**（定义与来源放进 ⓘ 等一键可达处，不在界面上铺说明文字）
