# PROGRESS

> 进度账本。会话中断或上下文被压缩后，从这里恢复。由主会话维护。
> 结构：当前状态 → 里程碑 → 待拍板（只列还开着的）→ 上 main 前必须做 → 前端反馈轮次 → 日志。

## 当前状态（2026-10-24）

- 2026-10-23：去掉 `dev`，改为单主干（分支 → PR → `main` 仅集成，推送 `v*` tag 才上线）。同步 CLAUDE.md、架构 §3.3 / §10、里程碑、implementer / reviewer 定义；`ci.yml` 去掉 `dev`，`dependabot.yml` 改指 `main`，`migrate.yml` 改为只手动触发。
