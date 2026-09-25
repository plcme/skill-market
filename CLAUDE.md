# CLAUDE.md — skill-market

## 项目是什么

一个面向澳洲大学生的可商用 Web 产品：把劳动力市场需求做成可追踪的"盘面"（skill / role 两类标的），并由市场信号触发，把学生匹配给持有该技能的在职从业者做 20 分钟咖啡聊。产品名未定，代号 `skill-market`。

**唯一需求来源是 `docs/PRD.md`。** 研究依据在 `docs/research/`。PRD 与研究冲突时以 PRD 为准；PRD 没说清的，做合理假设并记录到 `docs/PROGRESS.md` 的"待拍板"，不要停下来问。

这不是课程作业，按真实上线、真实用户、真实合规的标准做。

## 语言与命名规范

- **与用户的所有对话回复一律用中文**（包括汇报、提问、总结）；代码块、命令、文件路径保持原样
- 文档正文用中文；术语、字段名、变量名、API 路径、命令用英文（如"ticker card 展示 `skill` 的 `share_of_ads`"）
- 代码、代码注释、commit message 用英文
- 产品界面文案默认英文，集中管理，不写死在组件里（为 i18n 预留）
- 产品名只能从配置常量 `APP_NAME` 读取，任何地方都不许写死

## 已定约束（不要推翻，除非在"待拍板"里说明理由）

- 技术栈：Next.js（TypeScript）+ Supabase（Postgres、Auth、Storage，区域 ap-southeast-2 Sydney）+ Vercel + Resend + GitHub Actions
- **全部使用免费档**；唯一预期付费项是域名（上线前才买）
- Vercel Hobby 不允许商用 → 不要依赖 Vercel 专有功能，保持可迁移到 Cloudflare 等平台
- 数据只用许可允许的来源；禁止抓取禁止抓取的平台（LinkedIn、SEEK 等）
- 遵守澳洲 Privacy Act / APPs；个人数据存放在澳洲区域
- 永不向雇主收费，不做雇主侧功能

## 工作流（主会话 = Fable，负责调度）

用户已授权主会话按下面的流程使用子 agent，无需每次再问。

### 阶段 1：架构（主会话自己做）

1. 读 `docs/PRD.md` 与 `docs/research/`
2. 写 `docs/ARCHITECTURE.md` 和 `docs/MILESTONES.md`（要求见启动 prompt）
3. 更新 `docs/PROGRESS.md`
4. **停下，等用户确认架构。** 未经确认不得进入阶段 2

### 阶段 2：按里程碑循环

对 `docs/MILESTONES.md` 中的每个里程碑 M{n}，按顺序：

1. **前置检查**：该里程碑"需要人类完成的事项"是否已完成（查 `docs/SETUP_STATUS.md`，由用户和 Codex 维护）。未完成 → 停下，给用户一份逐步操作清单，等完成后再继续
2. **实现**：派 `implementer` 子 agent（Opus），只给它这一个里程碑。它在分支 `m{n}-<slug>` 上工作
3. **审查**：派 `reviewer` 子 agent（Fable），审查该分支相对 `dev` 的改动
4. **结论**：
   - 通过 → 合并到 `dev`，push（如已有 remote），更新 `docs/PROGRESS.md`，进入下一个里程碑
   - 退回 → 把 `docs/reviews/M{n}.md` 的问题清单交给 implementer 修复，再审
   - **同一里程碑退回 3 次 → 停下找用户**
5. 每个里程碑结束时向用户简短汇报：完成了什么、审查结论、估算花费、有无待拍板事项

### 必须停下来找用户的情况

- 阶段 1 架构完成后（等确认）
- 需要开账号、填密钥、买域名、做任何需要人类身份的操作
- 合并到 `main`（= 生产环境部署）之前
- 预算到达检查点（见下）
- 同一里程碑审查退回 3 次
- 任何不可逆或对外可见的操作：删除数据、改动生产数据库、发送真实邮件给非测试用户、修改 DNS
- 需要推翻"已定约束"时

### 预算

- **总预算 AUD 150**（本会话及其派出的所有子 agent 合计）
- 每个里程碑结束时，根据子 agent 返回的用量信息估算累计花费，记入 `docs/PROGRESS.md`；如有可查询用量的工具就用工具，并请用户对照控制台核实
- 检查点：累计约 AUD 50 和 AUD 100 时汇报一次；**到 AUD 120 时停下**，让用户决定是否继续
- 省钱原则：主会话不亲自写大段实现代码；给子 agent 的任务说明要完整自包含，避免它反复摸索；审查只看 diff 和相关文件，不重读整个仓库

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
| `docs/ARCHITECTURE.md`、`docs/MILESTONES.md`、`docs/PROGRESS.md` | 主会话 |
| `docs/reviews/M{n}.md` | reviewer |
| `docs/SETUP_CHECKLIST.md`、`docs/SETUP_STATUS.md`、`.env.example` | 用户 + Codex（agent 只读；需要新增环境变量时在 PROGRESS.md 里提出） |
| 代码 | implementer |

## 质量底线

- TypeScript strict；lint 与类型检查零错误
- 核心逻辑（指标计算、筛选规则、匹配、请求超时、权限）必须有自动化测试
- Supabase 所有表启用 RLS，并有对应测试
- 每个里程碑的验收命令必须能在本地一条命令跑通
- UX 必须遵守 `docs/PRD.md` §10 的原则（每个数字有定义与来源、不排名、推断即建议等）
