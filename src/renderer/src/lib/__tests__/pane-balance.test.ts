import { describe, it, expect } from 'vitest';
import type { PaneNode } from '../../../../shared/types';
import { balancePaneGroup, balanceLayout } from '../pane-balance';

function leaf(id: string): PaneNode {
  return { type: 'leaf', id, cwd: '/' };
}

function split(
  direction: 'horizontal' | 'vertical',
  ratio: number,
  first: PaneNode,
  second: PaneNode
): PaneNode {
  return { type: 'split', direction, ratio, children: [first, second] };
}

/** Every split in the tree, as [direction, ratio] pairs, depth first. */
function ratios(node: PaneNode): Array<[string, number]> {
  if (node.type === 'leaf') return [];
  return [[node.direction, node.ratio], ...ratios(node.children[0]), ...ratios(node.children[1])];
}

describe('balancePaneGroup', () => {
  it('gives two panes an even split', () => {
    const tree = split('horizontal', 0.8, leaf('a'), leaf('b'));

    expect(ratios(balancePaneGroup(tree, 'b'))).toEqual([['horizontal', 0.5]]);
  });

  it('spreads a three-pane same-axis group so every pane is the same width', () => {
    // a | (b / c) with the group nested on one axis: Otty measures widths
    // through the ratio of each split's own subtree, so the outer split takes
    // two thirds and the inner one half, and all three panes land equal.
    const tree = split(
      'horizontal',
      0.9,
      split('horizontal', 0.4, leaf('a'), leaf('b')),
      leaf('c')
    );

    const balanced = balancePaneGroup(tree, 'c');
    expect(ratios(balanced)).toEqual([
      ['horizontal', 2 / 3],
      ['horizontal', 0.5]
    ]);
  });

  it('leaves a group on the other axis alone', () => {
    // Stacked: the top pane over a left/right pair. Balancing the pair must
    // not touch the divider the user set between top and bottom.
    const tree = split(
      'vertical',
      0.7,
      leaf('top'),
      split('horizontal', 0.9, leaf('a'), leaf('b'))
    );

    const balanced = balancePaneGroup(tree, 'b');
    expect(ratios(balanced)).toEqual([
      ['vertical', 0.7],
      ['horizontal', 0.5]
    ]);
  });

  it('counts an other-axis subtree as one slot, like Otty does', () => {
    // (a / b) | (c / d): the innermost group is the left column, so only that
    // column is re-divided - the root is on the other axis and stays put.
    const tree = split(
      'horizontal',
      0.3,
      split('vertical', 0.8, leaf('a'), leaf('b')),
      split('vertical', 0.6, leaf('c'), leaf('d'))
    );

    const balanced = balancePaneGroup(tree, 'b');
    expect(ratios(balanced)).toEqual([
      ['horizontal', 0.3],
      ['vertical', 0.5],
      ['vertical', 0.6]
    ]);
  });

  it('returns the same layout for a lone pane', () => {
    const tree = leaf('only');

    expect(balancePaneGroup(tree, 'only')).toBe(tree);
  });

  it('returns the same layout for a pane that is not in the tree', () => {
    const tree = split('horizontal', 0.2, leaf('a'), leaf('b'));

    expect(balancePaneGroup(tree, 'elsewhere')).toBe(tree);
  });
});

describe('balanceLayout', () => {
  it('resets both axes of a 2x2 grid', () => {
    const tree = split(
      'horizontal',
      0.7,
      split('vertical', 0.8, leaf('a'), leaf('b')),
      split('vertical', 0.6, leaf('c'), leaf('d'))
    );

    expect(ratios(balanceLayout(tree))).toEqual([
      ['horizontal', 0.5],
      ['vertical', 0.5],
      ['vertical', 0.5]
    ]);
  });

  it('gives every column the same width when one column is split in two', () => {
    // a | (b / c): three slots side by side, so the single pane and the stacked
    // column each take a third.
    const tree = split('horizontal', 0.7, leaf('a'), split('vertical', 0.8, leaf('b'), leaf('c')));

    expect(ratios(balanceLayout(tree))).toEqual([
      ['horizontal', 1 / 3],
      ['vertical', 0.5]
    ]);
  });

  it('leaves a lone pane untouched', () => {
    const tree = leaf('only');

    expect(balanceLayout(tree)).toBe(tree);
  });
});
