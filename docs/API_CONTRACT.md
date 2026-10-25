# 数据与页面接口约定（API contract）

本分支以 `src/lib/contract/index.ts` 的 `CONTRACT`、`InputOf`、`OutputOf` 和 `Backend` 为接口入口。它描述未来后端与当前原型之间的边界；本次没有接入真实 ATS、JSA、Supabase 或邮件发送。每个操作的 `delta` 与 `tests/contract-demo.test.ts` 末尾的 todo 保留尚未实现的差异，不能把 schema 通过当作真实数据管线已完成。

## 与 main 的功能对齐

- 分支从最新 main 同步；默认名称为 `skill-market`，仅 brewdex.app 发布配置使用 Brewdex。
- `watchAllItems({ slugs, filter })` 返回 `{ added }`。按标准化筛选条件去重，已有 held/watching 状态与基线保留；新条目使用各标的默认指标。超过 30 条容量时整批失败，不部分写入。
- 搜索返回的 `via` 包含 `fuzzy`；查询上限 80 字符。精确、前缀、包含匹配优先于保守容错；短缩写、数字代码与技术标点不扩展拼写。类型、层级等条件在截断结果数量前应用。

## 数据任务边界

- 技能职位来源为 Greenhouse / Lever / Ashby 公开 ATS；JSA IVI 用于岗位月度历史与岗位覆盖率估计。来源条款与商业使用许可仍按 SETUP 中的未完成事项处理。
- `pollAts` 每小时错峰检查到期雇主，排入新增和变更职位；只有成功、完整的雇主快照中确认缺失的职位，才可标记关闭。超时、429、错误、分页不完整都保留原状态并记录失败。
- `fetchAtsDetails` 获取排队职位正文，去除联系人个人信息后去重；`extractFeatures` 记录规则版本。雇主、来源职位 ID、职业、州、月份与来源时间必须能够追溯。
- `computeMetrics` 每天结算；`as_of` 是最后成功结算时间。`polled_at` 只表示盘中采集成功时间，不能替代指标结算时间。失败不刷新成功时间。
- IVI 覆盖率按 ANZSCO4 × 州 × 月对齐，记录分子、分母、来源和方法版本。技能覆盖率是由岗位映射得到的估计，不能声称 IVI 证实了技能计数。默认 `min_sample=30`；样本不足、分母为零或对应单元缺失时不输出可靠覆盖率或趋势信号。
- 原型保留现有固定阈值信号；接入真实数据时再实施架构约定的泊松检验（Poisson test）。这次不新增统计实现。

## 验收与后续

运行 lint、typecheck、单元测试和 PR CI。接口测试同时验证原型实际返回值，特别覆盖拼写错误结果与批量关注操作；尚未接通的生产字段仍明确标记为差异。该分支推送供审查，暂不合并 main；发布另需明确授权推送 v* tag。
