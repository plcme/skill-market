# FE-R9 审查

审查范围：`git diff main...fe-r9`（7 个 commit，bae3d5c 到 1dfef5d）。依据：本轮任务说明（A：已登录 "Saved to your profile" 卡只留一个按钮；B：恢复 dev-only 文案批注，`?review=copy`，新 key `copy-review-v2`，只包 onboarding 与登录页的说明性文字；C：mini-board 可删建议、Next steps 与 Roles 行复用 `WatchButton`）、PRD FR-O4 与 §10、CLAUDE.md 质量底线。按用户偏好，本轮不跑 e2e。

## Round 1 — 退回

验收命令结果：`pnpm lint && pnpm typecheck` 通过，lint 0 错误，tsc 0 错误。`pnpm exec vitest run --maxWorkers=2` 通过：33 个文件，348 个测试通过，13 个 todo。生产构建检查用的是工作区里现成的 `.next`（13:50 构建，已包含 365cacf 的修复，因为目录树里找不到 catalogue 字符串）：
- `.next/static` 里没有 `copy-review-v2`、`Copy decisions`、`Not seen yet`、`Onboarding · Basics`、`data-review-id`、`sessionStorage`，overlay 和 catalogue 都已被摇掉
- 留下的只有调用处传给透传 `ReviewText` 的 id 字面量（如 `"onboarding.basics.universityHint"`），以及 server RSC manifest 里的文件路径，可以接受

已确认没问题的部分：
- A：卡片只剩标题和 Go to my desk。`savedBody`、`reviewSkills` 两个键已删，src、tests、e2e 里都没有残留引用。
- 本机存储：`removed_skills` 的读取兼容旧格式。`parseAnonymousOnboarding` 对缺字段、非数组、混入非字符串、非对象 JSON 都有容错，`readAnonymousOnboarding` 和 `useAnonymousOnboarding` 共用这个函数，并有测试覆盖。
- 未登录删除和 Undo：`hide` / `unhide` 是幂等的，会写 localStorage 并通知订阅者。改 Tier 0 答案后 `removed_skills` 仍然保留。
- 登录合并：`reinfer(..., anon.removed_skills)` 不会把已删的技能加回成 inferred 行，已有的同名 inferred 行会被去掉，held 行不动（`applyInference` 只处理 `source === 'inferred'`）。合并后会清空本机存储，有测试。
- 已登录删除：调用 `removeSkill`，Undo 调用 `restoreSkill(r.data)`，原行原 id 放回。行的 key 是 `skill_slug`，删除后行卸载，不会有过期状态。
- 文案：新增的 `removeName`、`removed`、`undo` 都放在 messages 里。overlay 的英文硬编码只出现在 `src/features/dev` 内，符合"dev-only、整目录删除"的约定。登录页的 `lede` 用 `useAppName()`，没有写死产品名。
- SSR 与 hydration：`OnboardingFlow` 在 `db` 和 `anon` 就绪前渲染骨架。`ReviewText` 的 server snapshot 是 `false`，生产环境下直接返回 children，不会出现 hydration 不一致。
- 覆盖面：逐个核对了 onboarding 四个步骤（含手机端 sheet 里的 hint）以及 login、callback、signout 上的说明性段落、hint、description、Notice body，都已包上。catalogue 与源码里的 id 由测试做一一对应检查。

### 必须修复（阻断）

1. [src/features/student/onboarding/mini-board.tsx:88、108-112；src/features/student/onboarding/onboarding-flow.tsx:310] 已经回答过问题的学生，把建议全部删掉（已登录和未登录都会）或全部确认（只有已登录会）之后，界面显示的文案与事实不符。
   - 板块标题会变成 "Good first steps"，正文是 "Tell us your degree and we'll suggest where you already are…"。done 步骤的大标题变成 "You can start anywhere"，lede 是 "No answers, no problem."。但学生其实已经填过学位，问题是本轮新增的删除功能让这个状态可以走到。已登录时还有一条更常见的路径：在 `/me/skills` 确认了建议之后回到 `/onboarding?step=done`，因为现在只读 `source === 'inferred'` 的行。
   - 为什么是问题：界面对用户说了假话（PRD §10）。主会话问这一点算不算阻断，我的判断是算。
   - 怎么改：把"有没有回答"（`hasBasics || unit_codes.length`）和"还剩几条建议"分开判断。done 的标题和 lede 只按"有没有回答"决定。如果回答过但列表为空，不要显示 `firstBody`：要么只隐藏 "Skills you probably have" 列表，保留 Next steps；要么新增一条简短文案（新 key）。补一个覆盖这个状态的测试。

2. [src/features/student/onboarding/onboarding-flow.tsx:292；src/features/student/onboarding/mini-board.tsx:79-80] 已登录时，`suggestions` 只包含 inferred 行，而 `suggestNextSteps` 和 `rolesFromSkills` 也只用这份列表做 anchor 和 `owned`。
   - 结果是学生已经 held（confirmed 或 self_reported）的技能不在 `owned` 里，"Close to what you have" 可能推荐学生已经有的技能，而且还带着 Watch / "I have this skill" 按钮。roles 也少算了 held 技能。main 上用的是完整推断，至少 confirmed 过的技能会算在 owned 里，所以这一点是本轮引入的回退。
   - 为什么是问题：在推断结果之上又给出了错误的下一步建议（FR-O6），是正确性问题。
   - 怎么改：给 `MiniBoard` 再传一份 held 行，或者直接传 `db.skills`。"Skills you probably have" 只列 inferred 行；`suggestNextSteps` 和 `rolesFromSkills` 用 held 加 inferred，并保留 `source`，这样 `isHeld` 的权重 1 能生效。建议把 onboarding-flow 第 291-296 行的选取逻辑抽成一个纯函数（如 `boardSkills(db, state)`），并补测试：已登录、held 技能不出现在 next steps 里。

3. [src/features/student/onboarding/mini-board.tsx:103、150；src/features/student/onboarding/onboarding-flow.tsx:335；src/features/dev/copy-review-store.ts:49、53、54、60] 本轮说明要求只包说明性文字，标题、标签、数据值不要包。下面几处违反了这一点：
   - `onboarding.board.suggestionBadge`：这是 "Suggestion" 徽章，是标签，也是 FR-O4 规定"推断必须标为 Suggestion"的载体。
   - `onboarding.board.suggestionConfidence`：这是 `{band} · {pct}%`，属于数据值，FR-O4 要求"文字加数字"都显示。
   - `onboarding.board.nextEffort`：这是 `learning_effort` 字段的值，属于数据值。
   - `onboarding.start.nextUnitsTitle`：这是卡片标题，同类的 `savedTitle`、`saveTitle` 都没有包。
   - 为什么是问题：批注面板会给这些项提供 Delete，可能产出与 PRD 冲突的决定（例如删掉 Suggestion 标记或置信度），之后再按决定实施时会违反 FR-O4。
   - 怎么改：`SuggestionMeta` 只保留 `Reason` 一项，或者把 `reviewId` 改成只包 reason。去掉 nextEffort 和 nextUnitsTitle 的 `ReviewText`。同步删除这 4 条 catalogue，并调整 `tests/copy-review.test.ts:64` 里固定展开 `Badge` / `Confidence` / `Reason` 的逻辑。

### 建议（不阻断）

- **删除后焦点丢失**：键盘用户点 X 之后，按钮随行一起卸载，焦点落回 `body`，toast 里的 Undo 很难够到。仓库里其他删除列表（如 `/me/skills`）也没有处理这一点，所以不阻断。建议删除后把焦点移到下一行的 X；如果是最后一行，就移到 `#mb-start` 标题（加 `tabIndex={-1}`）。
- **已登录 Undo 失败时没有提示**：mini-board.tsx:65 的 `void restoreSkill(r.data)` 会吞掉 `conflict` 等错误，建议失败时给一个 warn toast。
- **单元数量包含已删的技能**：onboarding-flow.tsx:200 的 `added` 是用未过滤的推断结果算的，未登录时可能把已删除的技能算进 "adds N suggestions"。建议两边都按 `removed_skills` 过滤。
- **未登录删除后只能靠 toast 里的 Undo 恢复**：toast 消失后没有入口可以撤回。目前可以接受，等 #14 有结论后一并考虑。
- **Watch 按钮的可访问名称不带技能名**：Roles 和 Next steps 行里的 Watch 按钮只显示图标时，可访问名称只有 "Watch"，未登录时也一样，一列里会读出好几个相同的 "Watch"。这是 `WatchButton` 原有的问题，可以以后给它加 `aria-label`（带 `{name}`）。
- **375px 布局未实测**：本轮没跑 e2e，也没有实际看页面。按代码推算，`grid-cols-[auto_minmax(0,1fr)_auto_auto]` 加上 `@container` 和 `@max-4xl:sr-only` 不会横向溢出，合并 main 前跑 `e2e/responsive.spec.ts` 时确认一下。

## Round 2 — 退回

审查范围：`git diff f3ab002..fe-r9`（d22e641、e276b98），对照第 1 轮的必须修复清单。不跑 e2e，也没有打开浏览器（主会话在 3009 端口自己验证）。

验收命令结果：
- `pnpm lint && pnpm typecheck`：通过，lint 0 错误，tsc 0 错误
- `pnpm exec vitest run --maxWorkers=2`：通过，34 个文件，355 个测试通过，13 个 todo（新增 `tests/onboarding-board-skills.test.ts`）

第 1 轮必须修复项的复核：
1. **已修复。** 新的 `selectBoardSkills` 返回 `answered`，判断依据是"回答过问题"，与还剩几条建议无关。done 步骤的标题和 lede 改为按 `answered` 决定。`startColumn` 在"回答过但列表为空"时返回 `'none'`，整栏隐藏，`firstBody` 不再出现，Next steps 回退到 "Broad and quick to start"，这句话属实。已登录全部确认、未登录全部删除这两种情况都有测试。
2. **已修复。** 已登录时 `anchors` 等于全部 `db.skills`（held 和 inferred 都在），并保留 `source`。`suggestNextSteps(anchors)` 会把 held 技能计入 owned，`rolesFromSkills` 里 held 技能的权重是 1。有测试验证 next steps 不包含 confirmed 或 self_reported 的技能。
3. **已修复。** `SuggestionMeta` 只包 reason。nextEffort 和 nextUnitsTitle 已去掉包装，4 条 catalogue 已删除。测试改为直接匹配 id 字面量，并新增反向断言。

第 1 轮的建议项：
- `addedByUnits` 已排除 `removed_skills`，有测试。
- 已登录 Undo 失败时会弹 warn toast。
- 焦点管理在未登录时是对的，已登录时有问题，见下面阻断项 1。

### 必须修复（阻断）

1. **[src/features/student/onboarding/mini-board.tsx:59-64、84-96] 已登录删除时，`onRemoved()` 调用得太晚，删除后焦点不移动，而且留下的过期目标会在之后抢走焦点。**
   - 时序：`removeSkill` 在 `transact` 里同步执行 `emit()`。`useSyncExternalStore` 因此安排了一次 SyncLane 重渲染，在微任务里 flush；SyncLane 的 passive effect 在 commit 末尾同步执行。这个微任务排在 `await remove(...)` 的续体之前。
   - 所以 `[rowKeys]` effect 先运行，此时 `focusNext.current` 还是 `undefined`，直接返回。之后 `onRemoved()` 才把目标写进去，但 `rowKeys` 不会再变，这个目标就一直留着。
   - 后果：
     - 删除后焦点停在 `body`。按钮在 pending 期间是 `disabled`，焦点那时已经丢了。
     - 用户随后点 toast 里的 Undo，`restoreSkill` 让 `rowKeys` 变化，effect 带着过期目标运行，焦点从 toast 跳到另一行的 X。
     - 下一次删除也会用上一轮留下的目标。
   - 未登录时不受影响：`onRemoved()` 在 `hideAnonymousSuggestion` 之前同步调用，effect 能正常消费目标。
   - 为什么是问题：这是本轮新代码引入的可访问性错误（焦点被意外移走），比不做焦点处理还差。
   - 怎么改：两种状态都在发起删除之前调用 `onRemoved()`，也就是放到 `await remove(...)` 之前；删除失败时把 `focusNext.current` 重置为 `undefined`，例如让 `onRemoved` 返回一个取消函数，或者额外传一个 `onFailed`。也可以在 Undo 和每次 effect 运行时都清空目标，保证目标只会被消费一次。主会话可以在 3009 上用键盘验证：已登录状态下 Tab 到第一行的 X，按 Enter，确认焦点落到下一行的 X；然后点 Undo，确认焦点不会跳走。

### 建议（不阻断）

- onboarding-flow.tsx:199 的 `useMemo(() => addedByUnits(state, picked), [state, picked])` 不起作用：`state` 每次渲染都是 `selectOnboarding` 返回的新对象。改成依赖 `state.degree_id`、`state.year`、`state.removed_skills`，或者直接去掉 memo。
- 回答过但列表为空时，done 步骤的大标题仍是 "Your starting point"，下面却没有 starting point 列表，只有 lede 里的答案摘要和 Next steps。内容是真的，可以接受；如果觉得别扭，可以以后换一个更贴切的标题。

## Round 3 — 通过

审查范围：`git diff fddfe98..fe-r9`，只有 f43a5b3 一个提交，对照第 2 轮的阻断项检查。本轮没跑 e2e，也没打开浏览器。主会话已在 3009 端口用已登录的示例学生手动验证过：键盘按 Enter 删除一行后，焦点移到下一行的 ×；点 Undo 后焦点没有跳到任何 ×；鼠标删掉最后一行后，焦点移到上一行。

验收命令结果：
- `pnpm lint && pnpm typecheck`：通过，lint 0 错误，tsc 0 错误
- `pnpm exec vitest run --maxWorkers=2`：通过，34 个文件，357 个测试通过，13 个 todo（新增 2 个焦点用例）

第 2 轮阻断项 1 的复核：**已修复**。
- `onStart()` 现在在发起删除之前同步调用，两种状态都一样，记下 `{ removed, target }`。`resolveRemovalFocus` 只在被删的行已经不在列表里时才返回目标，并且只使用一次，用完就把 `pendingFocus` 清空。
- 已登录时的顺序：pending 引起的重渲染不改变 `rowKeys`，effect 不会运行；`transact` 去掉这一行后，effect 才运行并把焦点交给下一行的 ×。所以不再依赖 `await` 续体和重渲染谁先执行。
- Undo 时 `pendingFocus` 已经被清空，`rowKeys` 变化也不会再移动焦点，过期目标的问题已经消失。
- 删除失败，或 `useAction` 返回 `null` 时，`cancelFocus()` 只清空自己写入的那条记录，不会误清后来的记录。
- 删掉最后一行后 `column` 变成 `'none'`，`headingRef` 卸载为 null，焦点回退到 `#mb-next`。
- 未登录时，`top` 是取前 `limit` 条，删掉一行后后面的建议会补进来。这时目标那一行还在列表里，`resolveRemovalFocus` 也能正确处理。
- 纯函数有测试覆盖：下一行、上一行、标题三种回退，等待被删行消失，目标本身也消失时回退到标题。

第 2 轮建议项：`useMemo` 已去掉，并加了注释说明原因。

### 必须修复（阻断）

无。

### 建议（不阻断）

- 第 1 轮里的这几条留到以后处理，本轮不阻断：
  - 未登录时删掉的建议只能靠 toast 里的 Undo 撤回，toast 消失后就没有入口了。等待拍板 #14 定下来后一起考虑。
  - 只显示图标的 Watch 按钮，可访问名称里不带技能名。
  - 合并 main 前要跑 `e2e/responsive.spec.ts`，确认 375px 下没有溢出。


## 用户批注落实与合并前验证 — 2026-10-25

范围：在原工作树 `skill-market-fe-r9`、原分支 `fe-r9`（HEAD `3e40e74`）落实用户导出的 onboarding / sign-in 文案笔记。修改前工作区干净。未批复且无备注指示的内容保留原样；保留现有开发批注功能。

- 删除 12 项：Basics 的 universityHint / degreeHint / yearHint，mini-board 的 suggestionNote，Units 的 unitsFrom / unitsNone，Your board 的 emptyLede / saveBody，Sign in 的 benefit2 / free / emailHint / googleNote。组件、对应 messages 键、批注目录同步移除，原批注目录测试改用仍存在的条目。
- 缩短 2 项：`Onboarding.basicsLede` 仅保留 “We use your degree to suggest skills you probably have.”；`Auth.lede` 仅保留 “{app} is free for students.”，产品名继续读取配置。
- 对比修改前后的 messages：正好删除 12 个键，仅上述 2 个保留键的值发生变化，新增键为 0。

验证结果：

- `git diff --check`、ESLint、Next 路由类型生成与 TypeScript 检查通过。
- Vitest：34 个文件通过，357 个测试通过，13 个原有 todo。
- 将本次工作区复制到临时目录（不复制环境密钥）后运行生产构建与 `prepare-standalone.mjs`，退出码 0。临时副本的 node_modules 指向原工作树，因此构建有 tracingRoot 之外依赖的警告；此项验证确认编译通过，不代表已验证部署包。生产静态脚本不含 `copy-review-v2`、`Copy decisions` 或批注分组字符串。
- 在该构建的独立生产预览上执行原 `e2e/responsive.spec.ts`：375×812 手机与 768×1024 平板共 50 项全部通过，覆盖横向溢出、axe 严重问题、登录后页面与手机分步表单。
- 独立浏览器逐步核对 onboarding 四步和登录页：删除项不再显示，缩短内容正确，未批复内容保留，没有页面运行错误或缺失翻译错误。已检查桌面截图与 375px mini-board 截图。
- 375px 已登录示例学生：键盘删除第一行后焦点移至下一行删除按钮；Undo 恢复原行，数量恢复。

证据边界：原 3009 开发预览的热更新 WebSocket 握手失败，onboarding / login 停在 Loading；对该实例的初次响应式测试未通过，随后中止。上述 50 项通过结果来自独立 3019 生产预览，不能据此声称已修复原开发进程。原进程未停止或重启。

合并判断：本次变更及原 FE-R9 范围未发现新的阻断项；原 Round 3 的两项产品/可访问性建议仍保留。远端 main 核对为 `2eb904e96b5a08afefea673fe63afe7427a71747`，与本地 main 一致，且为 fe-r9 的祖先，具备无冲突集成条件。远端目前没有 fe-r9 分支；本次修改尚未提交或推送，因此还没有覆盖本次修改的 PR/CI 结果。建议提交本次修改后经 PR/CI 合入 main；此次只完成修改和判断，没有执行合并或发布。
