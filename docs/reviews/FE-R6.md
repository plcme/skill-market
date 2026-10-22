# FE-R6 审查记录（Split by 默认不拆分、No PR stated 固定 Work rights、/market Watching 标签）

审查范围：`git diff dev...fe-r6`（2 个 commit，31e63ed、2411119）。依据：用户批准的 3 项改动、`docs/GLOSSARY.md`、`docs/DESIGN.md`、PRD §10、CLAUDE.md 质量底线。按用户偏好，本轮不跑 e2e，也不跑生产构建。

## Round 1 — 通过

验收命令结果：
- `pnpm lint && pnpm typecheck && pnpm test:unit` 全部通过，退出码 0。vitest 共 26 个文件、281 个测试
- `next-env.d.ts` 没有改动；工作区里没有新增已跟踪的代码改动

逐项结论：
- **1 Split by 默认 None**
  - `parseBreakdownBy` 现在把缺省、`none`、未知值都读成 null；`breakdownParam` 原样返回
  - `canonicalDetailQuery` 对 `by=none` 和未知值只删 `by`，其他参数原样保留（测试覆盖 `metric=salary_median&by=none` → `metric=salary_median`）
  - 改写后的结果再算一次得到 null，不会循环重定向；`by=experience` 在默认筛选下返回 null，不会触发重定向
  - `redirect()` 在服务端组件里返回 307
  - 被筛选或度量固定的维度直接去掉 `by`：`nextByParam`、`chosenByParam` 都这样处理，测试覆盖
  - 标题（`TitleFilter split={detail.breakdown.by}`）和 "Currently showing"（`draftBy ? … : undefined`）本来就按 split 是否存在决定显示，默认 null 时不会出现 "· by …"
  - 仓库里没有别处生成 `by=` 链接
- **2 No PR stated 固定 Work rights**
  - `fixedSplitDimensions` 增加了 `filter.work_rights === 'no_pr_required'` 条件
  - `splitBlockers` 返回 `{ rights: 'filter' }`，面板据此显示 "Fixed by your filter"
  - URL 里的 `by=rights` 会被去掉，`effectiveSplit` 返回 null
  - 以上都有测试
- **3 Watching 标签**
  - `parseBoardType`、`boardTypeParam` 只在 `/market/page.tsx` 用到，三处都改对了：
    - `generateMetadata` 增加了 `metaTitle.watching`
    - `resetHref`、`resetFilterHref` 用的是 `tab`，所以 `type=watching` 会保留
    - `CompareSelectionProvider` 改成 `key={tab}`
  - 客户端控件通过 `useSetParams` 在当前 query 上修改，`type=watching` 会保留
  - 水合（hydration）：`useDB` 用 `useSyncExternalStore`，服务端快照是 null。服务端和首次客户端渲染都显示 skeleton，标签上也不显示数量，所以服务端和客户端的结果不会不一致
  - 数量与列表：没有名称过滤时，`slugs.size` 等于列表长度，因为 `watchedSlugs` 用 `getInstrument` 过滤，而它和 `getBoard` 的 `INSTRUMENTS` 是同一个来源；All 表不会因为筛选丢行。有测试覆盖
  - 把 `watching-board.tsx` 当作客户端组件，顺着 import 图往下查，没有引入 `server-only`、`next-intl/server` 或 `next/headers`
  - 文案都在 `messages/en/market-pages.json`。空状态只有标题和一个按钮，没有多余的次级说明
  - GLOSSARY §3 Median salary 的改动和现在的行为一致

### 必须修复（阻断）
（无）

### 建议（不阻断）
1. [src/app/market/page.tsx:144 / src/features/market/watching-board.tsx:400] 数量的可访问名称
   - 现在读屏读到的是 "Watching 3"（某些浏览器甚至读成 "Watching3"），没有说明这个数字是什么
   - 建议给这个 `<span>` 加一个 sr-only 前缀或分隔，比如 `", {n} watched"`，文案放进 messages
2. [src/features/market/watching-board.tsx:440] 用名称过滤时，标签上的数量（全部关注数）会大于列表行数
   - 读数行已经写了 "matching q"，所以说得通
   - 如果希望两者严格一致，可以在文档里注明"标签数量 = 关注总数"
3. [src/app/market/page.tsx:180] 载荷：Watching 标签把整张 All 表传给客户端组件
   - 实测 100 行，序列化后约 150 KB 未压缩 JSON，其中 `instrument` 约 41 KB（含 `blurb`、`aliases`、`anzsco` 等）
   - 预览阶段可以接受，因为 All 标签本来也渲染这 100 行
   - 关注列表迁到 Supabase 后，应该在服务端按关注列表过滤，或者只传卡片和行实际用到的字段
4. [src/features/market/watching-board.tsx:51] 登录链接固定成 `/market?type=watching`，会丢掉当前的 `f`、`metric`、`sort`、`view`、`q`
   - 建议把当前的 query 一起带上（WatchButton 用的就是 `pathname + search`）
5. [src/app/market/page.tsx:133] 标签行隐藏了滚动条，375px 下没有任何可见提示告诉用户还能往右滚
   - 键盘聚焦会自动滚进视野，所以不阻断
   - 可以考虑在右边缘加一个渐隐遮罩
6. 产品备注（不是代码问题）
   - Watching 把 held 也算进去。这和 GLOSSARY 新写的定义一致，但 "Watching" 这个词字面上不包含"已掌握/做过"。请用户确认是否要排除 held，或者把标签改成更中性的说法
   - 详情页默认不拆分以后，skill 的 Median salary 不再默认按 Experience 拆开。原来这样做是为了避免把"岗位偏资深"误读成"学了就能拿"（PRD §10）。用户已经批准默认 None；如果仍担心误读，可以在 salary 度量的 `MetricInfo` 定义里提一句"可按 Experience 拆分"，不用在界面上另加标签
