# 多窗格布局二开评审（对照 Otty 官方）

- 日期：2026-09-12
- 评审对象：`fleet-pane-dev` 的两次提交 `24b98df0`（布局功能）与 `aeb309f3`（本次修复）
- 涉及文件：`PaneGrid.tsx`、`PaneHeader.tsx`、`Sidebar.tsx`、`TabItem.tsx`、`workspace-store.ts`、`use-terminal.ts`、`lib/composition-guard.ts`、`lib/terminal-keybindings.ts`
- 参考实现：`otty-shell/otty` `main` @ `4c6dc38`（Rust + iced 0.14），并核对了 `gpui` 分支 @ `4d1bb43`
- 外部评审：Claude Code（`claude-fable-5-1`，独立 worktree）与 Codex CLI（`agentrouter/gpt-6-astra`）；Codex 侧因上游 provider 报错退出，结论以 Claude 侧与本机实测为准

## 结论

功能方向正确，且已经超过 Otty 官方：Otty 的 `main` 与 `gpui` 两个分支都没有 Pane 拖拽重组，也没有 Tab 合并。真正需要补的是「输入不丢」「手势不骗人」「判据只有一套」这三类问题，本次已修。

## 事实核对：Otty 官方到底有什么

| 能力               | Otty `main`（iced）                                                                                   | Otty `gpui` 分支                                                   | Fleet 现状                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| Pane 拖拽重组      | 无。`PaneGrid` 只挂 `on_resize`，没有 `TitleBar` / `on_drag` / `on_drop`                              | 无（`otty/src/widgets/terminal_workspace` 内同样没有拖拽相关调用） | 有，四向边缘投放 + 半区预览                     |
| Tab 合并           | 无。`tabs` 只有激活、关闭、打开                                                                       | 无                                                                 | 有，拖到 Tab 中部合并，PTY 不重建               |
| 分隔条拖拽         | 有，`iced` 的 `on_resize(PANE_RESIZE_GRAB = 12.0)`                                                    | 同 iced                                                            | 有，抓取带 6px（`HANDLE_PX`）                   |
| 交点对角拖拽       | 无。iced 一次只动一条 `Split`                                                                         | 无                                                                 | 有，拖交点同时动本轴线 + 交叉线的所有同轴分隔线 |
| 分屏并均分         | 有。`Cmd+D` 分割后把同轴同组比率重算为等宽（`specs/2026-08-13-cmd-d-equal-panes`、`pane_balance.rs`） | 无                                                                 | 无。`splitPane` 只给新节点 0.5，不重算兄弟      |
| 拖拽中的分割线高亮 | 有。iced 的 `hovered_split` / `picked_split` 线样式                                                   | 无                                                                 | 无。分隔条默认透明，按下才显形                  |

用户记忆中的「Otty 能拖 Pane、能合并 Tab、能对角调格子」，在官方两个分支上都找不到实现；这两个能力是本次二开新做的，不是复刻。

## 本次修复（`aeb309f3`）

1. **IME 提交后丢字（已修）**。`CompositionGuard` 原本只按文本 + 250ms 时间窗去重，无法区分「xterm 重复回显」和「用户自己又按了一次同样的键」。提交单个字符后再快速敲同一个键，第二下会被吞掉。现在守卫额外记录按键计数：只要第一份之后用户按过键，就不再当重复丢弃；而「触发 flush 的那个键」发生在第一份之前，所以不会误伤去重。监听器挂在 `document` 捕获阶段，避免与 xterm 自己挂在 textarea 上的 keydown 抢注册顺序。消融验证：把 `userKeystroke()` 改成空实现后，新用例立刻失败（`expected false to be true`）。
2. **拖到自己身上也显示投放预览（已修）**。拖拽过程中 `DataTransfer` 处于保护模式，`getData()` 在 `dragenter` / `dragover` 一律返回空串，于是 `getData(...) !== paneId` 恒为真，源 Pane 会给自己亮出「可以放这里」。解法是用 `dragstart` / `dragend` 在 PaneFrame 上记录自己是不是拖拽源。实测：修前自拖预览存在（`196,32 247x760`），修后不存在；跨 Pane 投放仍然生效且 `.xterm` 数量不变。
3. **Tab 合并的两套判据不一致（已修）**。`Sidebar.canMergeTab` 认为 `type === 'terminal'`（历史持久化的工作区会这样写）可以合并，`workspace-store.mergeTabs` 用 `!tab.type` 拒绝，于是预览照常出现、松手却静默退化成重排。两边现在都走已有的 `isSessionTab()`。
4. **死代码（已删）**。`TabItem` 往 dataTransfer 里写的 `application/x-fleet-tab-id` 没有任何读取方，拖拽身份一直来自 React 状态。
5. **两套投放预览视觉语言不同（已修）**。Tab 合并预览是硬编码 `border-blue-400 bg-blue-500/15`，Pane 投放预览走 `fleet-accent-*`；同一个拖拽在手势两端换了颜色体系，非蓝色 accent 主题下尤其跳。现在两者共用 accent 令牌，实测取色为 `rgb(16, 185, 129)`，跟随主题。同时给 Tab 行补了 `select-none`，与 Pane 标题栏一致。

## 还没修的问题（按优先级）

- **P1：Pane 不能在 Tab 之间移动**。`movePane` 只在同一个 Tab 内生效，而 Tab 合并是单向门：合过去就分不回来。布局手势缺少「Pane → 侧栏 Tab」这一条。
- **P2：合并与排序共用同一块可投放区域**。Tab 行的中部（`edgeHeight` 之外的 14px）现在是合并区，想插到两个 Tab 之间只能瞄准上下各 7px。功能成立，但误合并的概率取决于行高，值得灰度观察。
- **P3：抓取带偏窄**。分隔条可抓区域 6px（±3px），Otty 走 iced 的 12px leeway（约 ±6.5px）。手感和「拖不动」的抱怨多半来自这里。
- **P3：交点手柄可发现性弱**。`CORNER_PX = 14` 的命中区里只有一个 10px、16% 白的圆点，且只在悬停该手柄时出现；在知道交点能拖之前，用户看不到任何提示。

## 值得做（按用户价值排序）

1. **Pane 能拖回侧栏，Tab 合并才闭环**。现在只能合、不能分，用户点错了没有退路。价值：把最危险的手势变成可逆；规模：侧栏加一个投放区 + 复用 `removePaneFromTree`，约一次会话；风险：投放区要避开 Tab 排序热区。
2. **一键均分，和 Otty 的 `Cmd+D` 一致**。交点拖拽让格子很容易被拖歪，而现在没有任何方式一键复位。Otty 的做法是分割时就把同轴同组比率重算为等宽（`pane_balance.rs`）。价值：把「拖乱了怎么办」这个顾虑消掉；规模：一个纯函数 + 一个 store action，可单测；风险：低。
3. **分隔条抓取带 6px → 12px**。Otty 用 iced 的 `PANE_RESIZE_GRAB = 12.0`。这是本次评审里投入产出比最高的一条改动，只动常量与交点的重叠判定。
4. **命令块（Otty 的招牌能力，值得单独立项）**。Otty README 把 block-based terminal 列为核心差异：每条命令的输入输出成为一个原子块，可单独复制、重跑、折叠。对「Claude / Codex / 服务器 / 日志同屏」的用法，日志块折叠 + 报错块重跑是真正改变工作流的东西。价值最高、规模最大，不该和布局一起做。
5. **统一投放预览的视觉语言**。Pane 与 Tab 两个预览共用 `fleet-accent-*` 令牌，交点手柄在网格悬停时就露出提示。价值：让「能放哪」一眼可读；规模：纯样式。

## 不建议做

- **照搬 Otty 的技术栈**（Rust + iced + GPUI）。Otty 的价值在交互语义，不在实现；Fleet 的 Electron + xterm 已经承载了 Sidebar、Agent 面板、SSH 浏览器等 Otty 没有的东西。
- **继续加 Pane 状态装饰**。`activityRingClass` + `PaneStatusGlyph` 已经覆盖 agent 状态，再加徽标只会让终端更吵。
- **给拖拽过程加动效**。半区预览的价值是「瞬时可读」，动效只会延迟它；真要动，最多给 100–150ms 的淡入，和产品里已有的 `transition-shadow duration-150` 对齐。

## 已验证 / 未验证

已验证（真实窗口 + CDP 驱动，均使用临时 Tab 并在结束后精确还原）：

- 2×2 拖交点 (−60, +40)：根比率 0.5 → 0.4399，两条同轴分隔线同时 0.5 → 0.5525 且完全相等，4 个 Pane 与 PTY 数不变
- 3 列 × 2 行（6 Pane）：交点拖动后整行保持直线，`.xterm` 7 → 7
- Pane 跨格投放：预览落在目标半区，落点重排正确，`.xterm` 3 → 3
- Tab 合并：预览出现 → 2 个 Tab 合成 1 个 2 Pane，`.xterm` 3 → 3；结束还原为用户原有 2 个 Tab
- IME `compose → Enter → insertText`：修复后命令只执行一次（`/tmp echo QAIME2` 一行 + 输出一行 + 干净提示符）；消融关闭 guard 后出现第二份提交文本
- `Cmd+Backspace` 清空整行、单个 `Backspace` 只删一个字符、双击标题仍能改名
- `npm run typecheck` 0 错；`workspace-store` + `composition-guard` + `terminal-keybindings` 共 102 用例通过；改动文件 `eslint` 无输出；`git diff --check` 干净

未验证：

- 真实中文输入法（RIME / Squirrel）下的行为，测试用的是 CDP `Input.imeSetComposition` 合成事件
- 打包产物（本次只跑 dev 窗口）
- 合并/排序热区在实际使用中的误触率（需要人手试用，无法用脚本判定）
