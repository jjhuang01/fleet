import type { PaneNode, PaneSplit } from '../../../shared/types';

/**
 * Split ratios that spread panes evenly, in the two shapes Fleet needs.
 *
 * Otty's `pane_balance.rs` equalizes one *same-axis group*: the largest run of
 * nested splits that share an axis and contain the pane you just split. Splits
 * outside that run - including the ones on the other axis that bound it - are
 * absent from the result, so a divider the user dragged by hand elsewhere in
 * the layout keeps the width they gave it. `Cmd+D` ships that behaviour, which
 * is why splitting never re-tiles columns the user did not touch.
 *
 * `balanceLayout` is the other shape: every divider in the tab goes back to an
 * even share. That is the "I dragged the corner and made a mess" reset, and it
 * has to reach both axes or a 2x2 would only ever fix one of its two columns.
 */

/** The chain of splits leading to `paneId`, outermost first. Null when absent. */
function pathToPane(node: PaneNode, paneId: string): PaneSplit[] | null {
  if (node.type === 'leaf') return node.id === paneId ? [] : null;

  const left = pathToPane(node.children[0], paneId);
  if (left) return [node, ...left];
  const right = pathToPane(node.children[1], paneId);
  return right ? [node, ...right] : null;
}

function leafCount(node: PaneNode): number {
  if (node.type === 'leaf') return 1;
  return leafCount(node.children[0]) + leafCount(node.children[1]);
}

/**
 * How many slots a subtree contributes to a group running on `axis`. A split
 * on the other axis is a different group and counts as one - Otty's shortcut,
 * quoted from `collect_ratios` in their `pane_balance.rs`.
 */
function slotsOn(node: PaneNode, axis: PaneSplit['direction']): number {
  if (node.type === 'leaf' || node.direction !== axis) return 1;
  return slotsOn(node.children[0], axis) + slotsOn(node.children[1], axis);
}

/**
 * Give every split on `axis` a ratio proportional to how many slots sit on
 * each side, so the group ends up even. Recursion stops at the first split on
 * the other axis: that subtree belongs to a different group and keeps whatever
 * ratio it has.
 */
function equalizeAxis(node: PaneNode, axis: PaneSplit['direction']): PaneNode {
  if (node.type === 'leaf' || node.direction !== axis) return node;

  const [left, right] = node.children;
  const leftSlots = slotsOn(left, axis);
  return {
    ...node,
    ratio: leftSlots / (leftSlots + slotsOn(right, axis)),
    children: [equalizeAxis(left, axis), equalizeAxis(right, axis)]
  };
}

/**
 * Equalize the same-axis group containing `paneId`, and only that group.
 * Returns `layout` unchanged when the pane is alone or not in the tree.
 */
export function balancePaneGroup(layout: PaneNode, paneId: string): PaneNode {
  const path = pathToPane(layout, paneId);
  const innermost = path?.at(-1);
  if (!path || !innermost) return layout;

  // Walk back up while the axis keeps matching. Every split below the group
  // root is inside it, so rewriting from there reaches all of them.
  const axis = innermost.direction;
  let groupRoot = innermost;
  for (let i = path.length - 2; i >= 0; i -= 1) {
    const candidate = path[i];
    if (candidate.direction !== axis) break;
    groupRoot = candidate;
  }
  return replaceNode(layout, groupRoot, equalizeAxis(groupRoot, axis));
}

/** Every divider in the layout goes back to an even share. */
export function balanceLayout(layout: PaneNode): PaneNode {
  if (layout.type === 'leaf') return layout;

  const [left, right] = layout.children;
  const newLeft = balanceLayout(left);
  const newRight = balanceLayout(right);
  const leftSlots = leafCount(newLeft);
  return {
    ...layout,
    ratio: leftSlots / (leftSlots + leafCount(newRight)),
    children: [newLeft, newRight]
  };
}

/** Swap `target` (compared by identity) for `replacement`, rebuilding only that branch. */
function replaceNode(node: PaneNode, target: PaneNode, replacement: PaneNode): PaneNode {
  if (node === target) return replacement;
  if (node.type === 'leaf') return node;
  const [left, right] = node.children;
  const newLeft = replaceNode(left, target, replacement);
  const newRight = replaceNode(right, target, replacement);
  if (newLeft === left && newRight === right) return node;
  return { ...node, children: [newLeft, newRight] };
}
