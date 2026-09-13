# 多窗格布局二开评审（对照 Otty 官方）

- 日期：2026-09-12（最后同步：2026-09-13，第三轮之后）
- 评审对象：`fleet-pane-dev` 的两次提交 `24b98df0`（布局功能）与 `aeb309f3`（本次修复）
- 涉及文件：`PaneGrid.tsx`、`PaneHeader.tsx`、`Sidebar.tsx`、`TabItem.tsx`、`workspace-store.ts`、`use-terminal.ts`、`lib/composition-guard.ts`、`lib/terminal-keybindings.ts`
- 参考实现：`otty-shell/otty` `main` @ `4c6dc38`（Rust + iced 0.14），并核对了 `gpui` 分支 @ `4d1bb43`
- 外部评审：Codex CLI（`agentrouter/gpt-6-astra`）在 13 万 token 后因上游 provider 报错（`Encrypted content could not be decrypted`）退出；Claude Code（`claude-fable-5-1`）跑了 50 分钟仍停在模型侧无输出。最终交叉评审改由两路只读子代理完成（代码逻辑 `lazycodex-code-reviewer`、设计保真 `lazycodex-clone-fidelity-reviewer`），结论见下，原始报告在 `.omo/evidence/pane-layout-code-review.md` 与 `.omo/evidence/pane-layout-design-fidelity-clone-fidelity.md`

## 结论

功能方向正确，且已经超过 Otty 官方：Otty 的 `main` 与 `gpui` 两个分支都没有 Pane 拖拽重组，也没有 Tab 合并。真正需要补的是「输入不丢」「手势不骗人」「判据只有一套」这三类问题，本次已修。

## 事实核对：Otty 官方到底有什么

| 能力               | Otty `main`（iced）                                                                                   | Otty `gpui` 分支                                                   | Fleet 现状                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Pane 拖拽重组      | 无。`PaneGrid` 只挂 `on_resize`，没有 `TitleBar` / `on_drag` / `on_drop`                              | 无（`otty/src/widgets/terminal_workspace` 内同样没有拖拽相关调用） | 有，四向边缘投放 + 半区预览                                        |
| Tab 合并           | 无。`tabs` 只有激活、关闭、打开                                                                       | 无                                                                 | 有，拖到 Tab 中部合并，PTY 不重建                                  |
| 分隔条拖拽         | 有，`iced` 的 `on_resize(PANE_RESIZE_GRAB = 12.0)`                                                    | 同 iced                                                            | 有，缝 6px / 命中带 12px（`HANDLE_PX` / `HANDLE_HIT_PX`）          |
| 交点对角拖拽       | 无。iced 一次只动一条 `Split`                                                                         | 无                                                                 | 有，拖交点同时动本轴线 + 交叉线的所有同轴分隔线                    |
| 分屏并均分         | 有。`Cmd+D` 分割后把同轴同组比率重算为等宽（`specs/2026-08-13-cmd-d-equal-panes`、`pane_balance.rs`） | 无                                                                 | 有，`splitPane` 重算被分割那一组，另有 `Cmd+Shift+B`（`d41adb96`） |
| 拖拽中的分割线高亮 | 有。iced 的 `hovered_split` / `picked_split` 线样式                                                   | 无                                                                 | 有，悬停/聚焦即显形，按下走 accent（`d41adb96`）                   |

用户记忆中的「Otty 能拖 Pane、能合并 Tab、能对角调格子」，在官方两个分支上都找不到实现；这两个能力是本次二开新做的，不是复刻。

## 本次修复（`aeb309f3`）

1. **IME 提交后丢字（已修）**。`CompositionGuard` 原本只按文本 + 250ms 时间窗去重，无法区分「xterm 重复回显」和「用户自己又按了一次同样的键」。提交单个字符后再快速敲同一个键，第二下会被吞掉。现在守卫额外记录按键计数：只要第一份之后用户按过键，就不再当重复丢弃；而「触发 flush 的那个键」发生在第一份之前，所以不会误伤去重。监听器挂在 `document` 捕获阶段，避免与 xterm 自己挂在 textarea 上的 keydown 抢注册顺序。消融验证：把 `userKeystroke()` 改成空实现后，新用例立刻失败（`expected false to be true`）。
2. **拖到自己身上也显示投放预览（已修）**。拖拽过程中 `DataTransfer` 处于保护模式，`getData()` 在 `dragenter` / `dragover` 一律返回空串，于是 `getData(...) !== paneId` 恒为真，源 Pane 会给自己亮出「可以放这里」。解法是用 `dragstart` / `dragend` 在 PaneFrame 上记录自己是不是拖拽源。实测：修前自拖预览存在（`196,32 247x760`），修后不存在；跨 Pane 投放仍然生效且 `.xterm` 数量不变。
3. **Tab 合并的两套判据不一致（已修）**。`Sidebar.canMergeTab` 认为 `type === 'terminal'`（历史持久化的工作区会这样写）可以合并，`workspace-store.mergeTabs` 用 `!tab.type` 拒绝，于是预览照常出现、松手却静默退化成重排。两边现在都走已有的 `isSessionTab()`。
4. **死代码（已删）**。`TabItem` 往 dataTransfer 里写的 `application/x-fleet-tab-id` 没有任何读取方，拖拽身份一直来自 React 状态。
5. **两套投放预览视觉语言不同（已修）**。Tab 合并预览是硬编码 `border-blue-400 bg-blue-500/15`，Pane 投放预览走 `fleet-accent-*`；同一个拖拽在手势两端换了颜色体系，非蓝色 accent 主题下尤其跳。现在两者共用 accent 令牌，实测取色为 `rgb(16, 185, 129)`，跟随主题。同时给 Tab 行补了 `select-none`，与 Pane 标题栏一致。

## 第三轮（`d41adb96`、`5e09dac6`）与性能收尾（2026-09-13）

上一节「值得做」的前三条已落地，表格里 `aeb309f3` 时点的三处「无 / 6px」也随之改写：

- **Pane 拖回侧栏（`d41adb96`）**。合并从单向门变成可逆：拖到侧栏 Tab 行合并进那个 Tab，拖到 Tab 下方的空白投放区拆回独立 Tab，由 `workspace-store.ts` 的 `movePaneToTab` / `detachPaneToNewTab` 搬运，PTY 不重建。这条是两路评审共同列出的最高优先级。
- **分割即均分 + 一键均分（`d41adb96`）**。`splitPane` 现在调用 `balancePaneGroup` 重算被分割那一组的比率，`Cmd+Shift+B` 走 `balancePanes` 复位整个 Tab；`lib/pane-balance.ts` 对照 Otty 的 `pane_balance.rs` 重写，语义对齐，代码没有交叉。
- **抓取带 6px → 12px（`d41adb96`）**。`HANDLE_PX` 仍是 6px 的缝，指针命中由 `HANDLE_HIT_PX = 12` 承担；多出的 6px 各向外悬 3px，落在邻格自己的 1px padding 上，所以每个格子真正让出的只有贴边 2px。
- **键盘路径（`d41adb96`、`5e09dac6`）**。`Cmd+Alt+Arrow` 复刻拖拽投放，邻居由 `pane-neighbour.ts` 纯函数算出（7 例单测）；分隔条与交点带 `focus-visible` 高亮，悬停也显形。
- **回归脚本（`5e09dac6`）**。`npm run qa:panes` 驱动真实窗口跑 9 个场景，结束前核对用户原有 Tab 未被改动。
- **收尾性能轮（2026-09-13）**。退出路径改为等子进程（上限 2s）后 `process.exit`；关窗与自然退出都补发 `pane-closed`；PTY 自然退出前 flush 尾部；MCP 重叠连接按代次戳自关并弃读 stderr；Overlay 的 Escape 只作用于栈顶；图片导出走 `finally { bitmap.close() }`；约 12 条硬编码 toast 进入词表。逐条证据与仍未修的项见 `docs/status.md`。

## 评审当时还没修的问题（`aeb309f3` 时点）

下面六条是 2026-09-12 那次评审的原始清单，保留当时的判断。其中 P1（Pane 跨 Tab 移动）、键盘路径、抓取带偏窄、交点共线判据四条已在第三轮关闭；剩下两条保留原判断，第三轮未再复核。

- **P1：Pane 不能在 Tab 之间移动**。`movePane` 只在同一个 Tab 内生效（`workspace-store.ts` 里源/目标必须同 Tab），而 Tab 合并是单向门：合过去就分不回来。代码评审把它列为不批准的唯一 HIGH。布局手势缺少「Pane → 侧栏 Tab」这一条。
- **P2：合并与排序共用同一块可投放区域**。Tab 行的中部（`edgeHeight` 之外的 14px）现在是合并区，想插到两个 Tab 之间只能瞄准上下各 7px。功能成立，但误合并的概率取决于行高，值得灰度观察；另外 `Sidebar.handleDrop` 在 `mergeTabs` 返回 false 时会继续走重排，理论上仍存在「看到合并预览、结果变成排序」的窗口。
- **P2：网格内的关键操作没有键盘路径**。分隔条、交点手柄、Pane 标题栏都不可聚焦（无 `tabIndex`、无 `focus-visible`）。设计评审把它列为 HIGH；对纯鼠标的 mac 桌面习惯影响有限，但导出的可访问性结论是「不可达」。
- **P3：交点共线判据是字符串相等**。`computeLayout` 用 `toCSS(rect.top/left)` 给共线分隔线分组，所以只有当两条线的 ratio 数值一致时才会一起动。手动把左列内部线拖到 0.6、右列保持 0.5 之后，再拖交点只会带动左列那条（整行的水平线仍可用根分隔条单独拖整齐）。这是「各列已不同」时的预期行为，但代码评审认为该判据脆弱，值得在实现跨 Tab 拖动前先想清楚。
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
- 拖拽、交点、双击改名没有自动化 DOM/E2E 覆盖；本次全部靠一次性 CDP 脚本人工驱动，脚本未入库。两路评审都把这一点列为应补项

已在评审后修掉的风险：

- 每个终端在 `document` 捕获阶段监听 keydown，会受其它 Pane 按键影响（可能把当前 Pane 的重复提交放行）。现在监听器只处理 `event.target === compositionTextarea` 的按键，顺序保证不变。

## 第二轮：把合并变成可逆、把格子一键摆正

上一节「值得做」里用户点名要做的四条，第 1–3 条做完，第 4 条只做了键盘一半，第 5 条（命令块）按原建议单独立项，本轮没动。

### 1. Pane 拖回侧栏（原来最危险的一步现在可逆）

- 拖到某个 Tab 行 → 这个 Pane 按落点半区并入该 Tab（左半 / 右半），PTY 与自定义标题都跟着走。
- 落点不在任何行上（列表的空白地面）→ 这个 Pane 独立成一个新 Tab，插在原来那个 Tab 后面。
- 只装着这一个 Pane 的 Tab 拖到别的行时，走的是已有的 `mergeTabs`，也就是整 Tab 合并，和拖 Tab 手势同一个结果。
- 判据：`movePaneToTab` 拒绝把 Pane 移到 Settings / Annotate / Sessions（它们渲染工具组件，没有网格可放），也拒绝搬走工具自己的那个 Pane；`detachPaneToTab` 拒绝把 Tab 搬空。
- 新文件 `lib/pane-drag.ts` 收拢了 dragover 期间唯一可读的判据（`dataTransfer.types`）和 payload 常量：拖拽中的数据在投放前读不到，能否接收只能靠类型判断，字符串散落三处必然写歪。

### 2. 一键均分 + 分割即均分

- 新文件 `lib/pane-balance.ts`，两个语义，照着 Otty 分：`balancePaneGroup`（`Cmd+D` 分割后用，只重算新 Pane 所在的那个同轴同组，别轴的比率一个不碰）与 `balanceLayout`（`Cmd+Shift+B` / 命令面板「Balance Panes」用，整 Tab 两个轴一起复位）。
- 之所以要两个：Otty 的组语义在 2×2 里一次只摆正一条同轴线，用户按「复位」却只好了半边会更困惑；反过来，分割时若动了别轴，就是替用户改了他没碰过的分隔线。
- 键位 `Cmd+Shift+B`（`B` 取自 balance），命令面板新增 `Balance Panes`，Pane 作用域面板同样可达。

### 3. 分隔条抓取带 6px → 12px

- 缝仍然 6px，手感不变；响应指针的是 12px 的命中条，对齐 iced 给 Otty 的 `PANE_RESIZE_GRAB`。
- 实测：命中条 12px，两侧各侵入相邻 Pane 2px（落在那 1px 间距和卡片圆角上），偏离缝 4px 仍能抓住。

### 4. 键盘可达（做了一半）

- 分隔条现在是 `role="separator"` + `tabIndex=0` + `aria-valuenow/min/max`，方向键步进 2%（`Shift` 10%），聚焦时用 `focus-ring` 令牌显形。
- **没做**：Pane 拖拽本身没有键盘等价操作（要把 Pane 挪到某个格子的上下左右，目前只能用鼠标）。这需要一个「拿起 / 放下」的键盘模式，比分隔条复杂得多，先记账。
- 交点手柄也仍然只响应鼠标。

### 5. 交点提示

- 悬停整个网格时，交点圆点以 40% 不透明度先露出来，悬停到交点本身再变实。原来只有知道那里能拖的人才会悬停到它。

## 本轮验证

真实窗口（CDP 驱动，全部用临时 Tab，结束后逐条核对用户的 `Annotate` + `cc` 两个 Tab 原样还原）：

| 项目               | 结果                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| 分隔条命中条       | 12px，缝中心落在两个 Pane 之间（690 / 698），各侵入 2px                                                   |
| 分隔条键盘         | 右 0.5→0.52；左两次→0.48；`Shift+右`→0.58；`Cmd+Shift+B`→0.5                                              |
| 竖向分隔条         | `aria-orientation=horizontal`，下 0.5→0.52，上两次→0.48                                                   |
| 聚焦可见           | `:focus-visible` 命中，box-shadow 为 accent 65% 的 2px 环                                                 |
| 交点提示           | 网格悬停前 0 → 悬停后 0.4                                                                                 |
| 一键均分           | 先把根与两列拖成 0.78 / 0.72 / 0.31，终端持有焦点时按 `Cmd+Shift+B` → 0.5 / 0.5 / 0.5                     |
| 分割即均分         | 根 0.2 时在窄侧再分割 → 根 1/3、内层 1/2（Otty 的算例）                                                   |
| Pane 拖到 Tab 行   | 拖动中 8 次采样预览恒为 `right`（空白区提示不误亮），落下后单 Pane 源 Tab 消失、目标 Tab 两个 Pane 0.5    |
| Pane 拖到空白地面  | 提示「Move pane to a new tab」出现，落下后新 Tab 插在源 Tab 之后并激活，源 Tab 剩 1 个 Pane，标签取目录名 |
| Pane 拖到 Agent 行 | 预览恒为 `right`，落下后终端并入 Scratch Tab 成左右两半（0.5），源 Tab 剩 1 个 Pane                       |
| 中途放弃拖拽       | 拖到空白区后按 Esc 取消：提示与半区预览同时消失，不新建 Tab                                               |
| 单测               | `pane-balance` 9 例 + 新增 store 用例后 `workspace-store` 100 例，连同 6 个相邻文件共 153 例通过          |
| 静态检查           | `npm run typecheck` 0 错；改动文件 `eslint` 无输出；`git diff --check` 干净                               |

未验证：打包产物；Pane 拖拽的自动化 E2E（本轮仍靠一次性 CDP 脚本，未入库）；12px 命中条从 Pane 边缘抢走的那 2px 在实际使用中的影响（终端滚动条外侧 2px，人工试用才知道要不要收回）。

已知取舍：

- Pane 拖拽没有键盘路径（只有分隔条有），侧栏投放区只认指针。
- 侧栏投放的两个目标都在 tab/agent 行与列表空白地面上；Tools 区（Settings / Annotate / Sessions）不是投放区，它们渲染自己的组件而不是网格。
- 单 Pane 且属于 worktree 分组或挂着嵌套文件 Tab 的源 Tab，拖到别的行会是空操作：整 Tab 合并要处理分组与嵌套关系（`mergeTabs` 的判据），把一个 Pane 挪走又会把这样的 Tab 掏空，两个方向都不该在拖拽里静默做。这与拖 Tab 手势现有的拒绝范围一致。
- 两路只有只读评审提出的三条没有改动，都是判断而非缺陷：浅色主题下 `focus-ring` 是 accent 65% 混合色（蓝 2.17:1、teal 1.76:1、amber 1.59:1），但那是全应用共用的令牌，改它超出本轮范围；2×2 以上网格悬停时所有交点一起露 40% 圆点，交点越多越吵（3×3 是 4 个）；`Balance Panes` 的名字没有说明它重置整个 Tab 而不只是当前分组。

## 第三轮：键盘把 Pane 挪过去、回归变成一条命令、打包实测

第二轮结束时留下的四条待办，前三条做完，命令块单独成文（见 `docs/blocks-plan.md`）。

### 1. Pane 拖拽的键盘等价操作（原「未做」项）

- `Cmd+Alt+Arrow`（非 mac 是 `Ctrl+Shift+Arrow`）把当前 Pane 挪到该方向相邻 Pane 的那一侧，落点和鼠标拖过去完全一样 —— 复用同一个 `movePane`，PTY 不重建。
- 相邻判定在 `lib/pane-neighbour.ts`：只算完全位于该方向的 Pane，共享边长最多者胜出，距离破平局。所以 2×2 里从右下往左是左下，不是斜对角的左上。
- 键只负责报方向（`use-pane-navigation.ts` 派发 `fleet:move-pane`），几何只有网格知道，由 `PaneGrid` 用当前布局像素矩形算出邻居。这样纯函数可单测（`pane-neighbour.test.ts` 7 例）。
- 边界是空操作而不是报错：已经在最左就按左，布局不动。

### 2. 交点共线判据改成量化键（评审 LOW）

- 原来用 `toCSS()` 字符串当共线键，`{pct: 33.333333333333336}` 和 `{pct: 33.33333333333333}` 会被当成两条不同的线，进而让交点拖动只带走一半的同一行分隔线。
- 现在量化到千分之一百分比再比较（`lineKeyOf`），远低于指针能瞄准的精度，远高于浮点漂移。行为其余不变。
- 诚实说明：这个漂移场景没能按需复现（构造它需要两次不同算术路径恰好落在同一位置），所以证据是「等值线仍然成组」的回归实测（3 列 × 2 行，6 个 Pane，拖交点后三条列分隔线全部同步到 0.5394 且完全相等），不是漂移前后的对照。

### 3. 另一条评审 LOW 有意不改

`ratioAtPoint` 不提前 clamp，最终由 store 的 `resizeSplits` 限制在 `0.15..0.85`。删掉 UI 侧再加一层 clamp 不会改变任何可观察行为（指针比率本来就会被 store 夹住），属于重复约束，按 YAGNI 不加。

### 4. 回归变成一条命令：`npm run qa:panes`

- `scripts/qa/pane-layout.ts` 接上已有的 `scripts/drive/core.ts`，驱动真实 dev 窗口跑 9 个场景：12px 命中条与方向键步进、分割即均分、`Cmd+Shift+B` 均分、`Cmd+Alt+Arrow` 挪 Pane、Pane 拖到邻居、Pane 拖到侧栏 Tab 行、Pane 拖到空白地面独立成 Tab、交点拖动保直线、以及「工作区原样还原」。
- 每个场景在自己的临时 Tab 里跑，脚本开头快照用户 Tab、结尾核对一致，失败退出码非 0。
- 之前几轮的验证都是一次性 CDP 脚本、跑完就没了，这是评审两次点名的缺口（「拖拽没有自动化 E2E 覆盖」）的补法。
- 实测输出：`9/9 scenarios passed`。

### 5. 打包实测（原「未验证：打包产物」）

- `npm run build` 退出 0（typecheck + electron-vite build，renderer/main/preload 全部产出）。
- `npx electron-builder --dir` 退出 0，产出并签名 `dist/mac-arm64/Fleet.app`（约 900MB，本地 Apple Development 身份）。
- 用一次性 profile 真机启动该 .app（`open -n -a ... --args --user-data-dir=/tmp/... --remote-debugging-port=57999`），确认：从 `app.asar` 内加载页面、`window.fleet` 预加载 API 在、`window.__FLEET__` 调试桥不在（打包构建不该有）、点「New Tab」真的起了 PTY（标题栏显示 `~`）、敲 `echo packaged-ok-$((6*7))` 返回 `packaged-ok-42`、控制台无 error。
- 顺带修了 README 快捷键表里两条过期行：命令面板写的是 `Cmd+Shift+P`（实际 `Cmd+K`），并补上本轮新增的 `Balance panes` 与 `Move pane`。

### 本轮验证

| 项目        | 结果                                                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 键盘挪 Pane | 四个方向各一次：落点方向与侧别正确，Pane 数不变；已在边缘时不改布局                                                                                                                                |
| 共线键回归  | 3 列 × 2 行六 Pane，拖交点后三条列分隔线同步到 0.5394（完全相等）                                                                                                                                  |
| 回归脚本    | `npm run qa:panes` 9/9 通过                                                                                                                                                                        |
| 单测        | 新增 `pane-neighbour` 7 例；`workspace-store`、`pane-balance`、`tab-nesting`、`composition-guard`、`terminal-keybindings`、`palette-items`、`shortcuts-palette`、`zustand-selectors` 共 160 例通过 |
| 静态检查    | `npm run typecheck` 0 错；改动文件 `eslint --no-cache` 0 错 0 警告；`git diff --check` 干净                                                                                                        |
| 打包        | `npm run build` 与 `electron-builder --dir` 退出 0；打包后的 .app 真机跑通「新 Tab + 执行命令」                                                                                                    |

未验证 / 有意留着：真实中文输入法与 12px 命中条抢走的 2px 仍要人肉试用；`qa:panes` 需要先起 dev 窗口，没接进 CI；命令块见 `docs/blocks-plan.md`。
