# 全站模糊搜索实现与验证

实现日期：2026-10-23，悉尼时间。

分支 `codex/fuzzy-search-research` 从 `main` 的 `ec02399f1c4507e90e37169c50bd5aa3fe281b01` 创建。工作树为 `/Users/tongtianyi/.codex/worktrees/fuzzy-search-research/skill-market`。实现覆盖调研列出的全部九类文字搜索入口，并保留各入口的业务范围与排序。

## 实现规则

共享层为 `src/lib/search/matcher.ts`，依赖固定版本 `fuse.js@7.5.0`。准确名称、准确代码或符号、准确别名依次优先；前缀和子串命中优先于近似命中。按实体去重，并在限定类型、技能层级、排除项之后应用结果数量上限。

模糊召回（fuzzy retrieval）使用 Fuse.js，关闭位置惩罚和字段长度惩罚。库的候选阈值为 0.34，再按每个词的长度收紧：4 至 8 字母允许一次普通编辑，9 字母起最多两次。相邻字母交换（transposition）通过一次字面交换单独补充，避免为 `pyhton → Python` 放宽到会同时返回 PyTorch 的两次编辑预算。多词查询要求每个词都能匹配，可跨字段并忽略词序。这里使用明确的匹配层级替代调研中试拟的 0.6/0.3/0.1 字段权重，保证准确名称、符号与别名不会因第三方评分变化而丢失优先级。

少于四个字母的词、包含数字的代码和技术标点不自动扩展错拼；原有准确、前缀和子串匹配继续保留。统一处理 Unicode 兼容形式、大小写和空格，输入上限为 80 字符。中文翻译、拼音与语义搜索（semantic search）不由此自动获得，需要额外标签或别名。

## 搜索入口覆盖

| 入口 | 实现与保留的行为 |
| --- | --- |
| 顶部、移动端和快捷键搜索 | 共享目录与核心能力搜索；准确能力别名置前；箭头、Enter、Escape、焦点恢复和输入法组合输入（IME composition）保护 |
| 完整搜索结果页 | 技能、岗位、行业分别最多 40 条；核心能力仍进入说明页；保留快照、筛选参数、空状态及浏览建议 |
| 行情榜和 Watching | 搜索确定候选集合；仍按数值或变化排序，并保留技能层级和关注集合；URL、清空、280ms 防抖及输入法保护 |
| 比较选择器 | 先限定同类型并排除已选项，再取最多 12 个匹配；空查询最多浏览 40 项 |
| 添加技能 | 先限定技能并排除已有技能，再取最多 20 项；推断技能仍可确认 |
| 课程选择 | 只查所选大学；标题支持错拼，代码只做字面匹配与空格规范化；`DATA 2002` 等同 `DATA2002`，`DATA2003` 不替换为其他课程 |
| 地点选择 | 名称支持保守错拼；短名准确优先；保留地点 ID、层级、国家不可选和已选禁用 |
| 从业者资料的技能筛选 | 支持名称、符号和别名，已选技能始终可见 |
| 后台别名筛选 | 默认保留准确文字筛选；勾选 `Include similar matches` 后补充并标注 `Similar match`；保存与冲突判断仍按准确规则 |

核心文件：`src/lib/market/catalog.ts`、`src/lib/market/competencies.ts`、`src/lib/demo/education.ts`、`src/lib/queries/market.ts`，以及 `src/lib/search/` 下的地点、后台别名和浏览器别名适配器。

## 浏览器预览别名的数据边界

后台覆盖别名仍存放在当前浏览器的预览数据中。`useSearchAliases` 只提取别名和所属目录 ID，按内容缓存。增删别名后，同一浏览器的搜索面板、完整结果页、行情榜、比较、添加技能和资料筛选使用更新后的索引；其他预览数据的变化不会重建索引。

公共页面先由服务器渲染静态目录结果，再在浏览器就绪后应用本地别名。没有发送别名 Cookie、复制登录状态或增加服务器持久化；其他浏览器及未执行客户端代码的请求继续读取公共静态目录。后端接入时应替换这一数据源。

## 验证结果

- 全量单元测试（unit tests）：29 个文件、320 项通过，其中新增搜索测试 25 项。最终命令为 `pnpm exec vitest run --maxWorkers=1 --testTimeout=10000`。既有聊天测试曾偶发超过默认 5 秒，本次使用 10 秒执行上限，未修改或跳过断言。
- 类型检查（typecheck）：`pnpm typecheck` 通过。
- 代码检查（lint）：`pnpm lint` 通过，零错误、零警告。
- 生产构建（production build）：`NODE_OPTIONS=--max-old-space-size=2048 pnpm build` 通过。
- 浏览器回归：56 项通过，桌面 1280×800、移动端 375×812；覆盖新增全部搜索流程，以及既有公共页面、行情榜、比较、技能分层和核心能力说明页。包含无障碍（accessibility）检查、URL 行为、输入法、焦点、已选项和别名增删验证。已检查两种尺寸的搜索面板截图。
- 本次没有数据库模型或持久数据变更，未启动 Docker 或运行数据库迁移。

浏览器命令：

```sh
E2E_PORT=3219 pnpm exec playwright test e2e/fuzzy-search.spec.ts e2e/frontend.spec.ts e2e/round2.spec.ts --project=desktop --project=mobile --workers=1 --max-failures=2 --grep 'fuzzy-search.spec|public page|market board|searching "communication"|skills board narrows'
```

## 性能与选型验证

Node.js v24.1.0，macOS arm64。真实目录为本分支的 100 条记录；合成数据保留六个技术名称样例，其余按固定规则生成。七条查询分别覆盖准确名称、错拼、倒序多词、技术标点和无结果；预热后每条运行十次。堆内存增量是索引构建前后的进程观测，不能当作生产峰值保证。原始结果见 `FUZZY_SEARCH_BENCHMARK.json`。

| 数据集 | 条数 | 构建 ms | 查询中位数 ms | P95 ms | 堆增量 MiB |
| --- | --- | --- | --- | --- | --- |
| catalogue | 100 | 1.41 | 0.58 | 1.10 | 0.57 |
| fixtures | 6 | 0.11 | 0.02 | 0.03 | 0.02 |
| synthetic | 1000 | 1.85 | 2.76 | 5.66 | 3.15 |
| synthetic | 10000 | 21.81 | 27.54 | 58.70 | 16.48 |

客户端产物共有 73 个 JavaScript 分块，合计 2,209,790 字节；逐块 gzip 后合计 698,666 字节。这是全应用分块总量，不是单页首屏下载量或本次改动的体积差。所安装 Fuse 完整模块的压缩文件 gzip 约 9 KB。

Fuse.js 与临时目录中的 MiniSearch 7.2.0 均通过七条小样例查询；这不证明某个库在所有数据上更优。当前保留 Fuse.js，是因为项目主要搜索结构化名称与别名，且共享适配器已验证短符号、准确优先级及领域限制。MiniSearch 未加入生产依赖。

复测基础合成数据：

```sh
node --expose-gc scripts/benchmark-search.mjs
```

复测真实目录时，可使用项目现有的 esbuild 生成临时模块，再设置 `SEARCH_CATALOGUE_MODULE` 指向它；`MINISEARCH_MODULE` 是可选对比模块路径，不要求安装生产依赖。无需增加搜索常驻服务。
