/**
 * Live-window regression pass for the pane layout work: divider hit strip and
 * keyboard, balance, keyboard pane moves, and the three drag destinations.
 *
 * It drives the real dev window over CDP, so start `npm run dev` first. Every
 * scenario runs inside its own temporary tab, and the pass verifies at the end
 * that the workspace is back to the exact tabs the user had open - the tabs are
 * snapshotted before anything is created and compared again at the finish.
 *
 *   npm run dev          # one terminal
 *   npm run qa:panes     # another
 *
 * Prints one line per scenario and exits non-zero if any of them failed.
 */
import type { Page } from 'playwright';
import type { PaneNode } from '../../src/shared/types';
import { attach } from '../drive/core';

/** The slice of the workspace store this pass drives, as the renderer holds it. */
type WorkspaceTab = { id: string; label: string; splitRoot: PaneNode };
type WorkspaceState = {
  workspace: { tabs: WorkspaceTab[] };
  activeTabId: string | null;
  activePaneId: string | null;
  addTab: (label: string | undefined, cwd: string) => string;
  splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => string;
  resizeSplit: (path: number[], ratio: number) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setActivePane: (paneId: string) => void;
};

declare global {
  interface Window {
    /** Present only in dev builds; see src/renderer/src/env.d.ts. */
    __FLEET__: { stores: { workspace: { getState: () => WorkspaceState } } };
  }
}

type Result = { name: string; pass: boolean; detail: string };

const results: Result[] = [];
const round = (value: number): number => Math.round(value * 10000) / 10000;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function paneIds(node: PaneNode): string[] {
  return node.type === 'leaf'
    ? [node.id]
    : [...paneIds(node.children[0]), ...paneIds(node.children[1])];
}

function ratios(node: PaneNode): number[] {
  return node.type === 'leaf'
    ? []
    : [node.ratio, ...ratios(node.children[0]), ...ratios(node.children[1])];
}

/**
 * The split where the paths to two panes part, and which slot each pane took.
 * Lets a scenario say "the moved pane ended up on the left of that one" without
 * asserting the exact nesting depth the store happens to produce.
 */
function divergence(
  root: PaneNode,
  firstId: string,
  secondId: string
): { direction: 'horizontal' | 'vertical'; firstSlot: number; secondSlot: number } | null {
  const path = (node: PaneNode, id: string): number[] | null => {
    if (node.type === 'leaf') return node.id === id ? [] : null;
    const left = path(node.children[0], id);
    if (left) return [0, ...left];
    const right = path(node.children[1], id);
    return right ? [1, ...right] : null;
  };
  const first = path(root, firstId);
  const second = path(root, secondId);
  if (!first || !second) return null;
  let index = 0;
  while (index < first.length && index < second.length && first[index] === second[index])
    index += 1;
  let node: PaneNode = root;
  for (let step = 0; step < index; step += 1) {
    node = node.type === 'split' ? node.children[first[step]] : node;
  }
  if (node.type !== 'split') return null;
  return {
    direction: node.direction,
    firstSlot: first[index] ?? -1,
    secondSlot: second[index] ?? -1
  };
}

/** The column dividers of a layout built as side-by-side columns. */
function columnRatios(node: PaneNode): number[] {
  if (node.type === 'leaf') return [];
  const own = node.direction === 'vertical' ? [node.ratio] : [];
  return [...own, ...columnRatios(node.children[0]), ...columnRatios(node.children[1])];
}

async function scenario(name: string, body: () => Promise<string>): Promise<void> {
  try {
    results.push({ name, pass: true, detail: await body() });
  } catch (error) {
    results.push({
      name,
      pass: false,
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

async function run(): Promise<void> {
  const { browser, page } = await attach();
  try {
    await pass(page);
  } finally {
    await browser.close();
  }
}

async function pass(page: Page): Promise<void> {
  const store = async (): Promise<WorkspaceState> =>
    page.evaluate(() => window.__FLEET__.stores.workspace.getState());

  const baseline = await page.evaluate(() => {
    const state = window.__FLEET__.stores.workspace.getState();
    return {
      ids: state.workspace.tabs.map((tab) => tab.id),
      activeTabId: state.activeTabId
    };
  });

  // The window may still be painting its restored workspace when the pass
  // starts; every measurement below assumes the sidebar and a pane exist.
  await page.waitForSelector('[data-tab-id]', { timeout: 15000 });
  // Attached, not visible: every tab keeps its panes mounted, and the first
  // match in the DOM is usually a background tab's hidden one.
  await page.waitForSelector('[data-pane-active]', { state: 'attached', timeout: 15000 });

  const openTab = async (label: string): Promise<WorkspaceTab> => {
    const tab = await page.evaluate((name): WorkspaceTab => {
      // A plain object, not a helper arrow: esbuild's keep-names transform rewrites
      // named arrows into `__name(...)` calls, and that helper does not exist
      // inside the page Playwright serialises this into.
      const store = window.__FLEET__.stores.workspace;
      store.getState().addTab(name, '/tmp');
      const created = store.getState().workspace.tabs.find((candidate) => candidate.label === name);
      if (!created) throw new Error(`tab ${name} was not created`);
      return { id: created.id, label: created.label, splitRoot: created.splitRoot };
    }, label);
    await page.waitForTimeout(1200);
    await page.waitForSelector(`[data-tab-id="${tab.id}"]`, { timeout: 15000 });
    await page.waitForSelector('[data-pane-active]', { state: 'attached', timeout: 15000 });
    return tab;
  };
  const closeTab = async (tabId: string): Promise<void> => {
    await page.evaluate((id) => window.__FLEET__.stores.workspace.getState().closeTab(id), tabId);
    await page.waitForTimeout(200);
  };
  /** Wait until the tab on screen is showing a divider, i.e. the split landed. */
  const waitForDivider = async (): Promise<void> => {
    // The same predicate the measurement uses, so a hidden tab's divider -
    // attached but zero height - can never satisfy it.
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll<HTMLElement>('[data-grid-handle]')].some(
          (element) => element.getBoundingClientRect().height > 0
        ),
      undefined,
      { timeout: 15000 }
    );
  };

  const tabRoot = async (tabId: string): Promise<PaneNode> => {
    const tab = (await store()).workspace.tabs.find((candidate) => candidate.id === tabId);
    if (!tab) throw new Error(`tab ${tabId} vanished`);
    return tab.splitRoot;
  };
  /** Split a tab's first pane, leaving a two-pane tab behind. */
  const splitFirstPane = async (tabId: string): Promise<string> =>
    page.evaluate((id): string => {
      // A plain object, not a helper arrow: esbuild's keep-names transform rewrites
      // named arrows into `__name(...)` calls, and that helper does not exist
      // inside the page Playwright serialises this into.
      const store = window.__FLEET__.stores.workspace;
      const tab = store.getState().workspace.tabs.find((candidate) => candidate.id === id);
      if (tab?.splitRoot.type !== 'leaf') throw new Error('expected a single-pane tab to split');
      return store.getState().splitPane(tab.splitRoot.id, 'horizontal');
    }, tabId);

  /** A point inside the title bar of the nth visible pane, in reading order. */
  const headerPoint = async (index = 0): Promise<{ x: number; y: number }> =>
    page.evaluate((wanted) => {
      const frames = [...document.querySelectorAll<HTMLElement>('[data-pane-active]')]
        .filter((frame) => frame.getBoundingClientRect().width > 0)
        .map((frame) => ({ frame, rect: frame.getBoundingClientRect() }))
        .sort((a, b) => a.rect.y + a.rect.x / 1000 - (b.rect.y + b.rect.x / 1000));
      const pick = frames.at(wanted);
      if (!pick) throw new Error(`no visible pane at index ${wanted}`);
      const header = pick.frame.querySelector<HTMLElement>('[class*="group/header"]');
      if (!header) throw new Error('the visible pane has no title bar to grab');
      const rect = header.getBoundingClientRect();
      return { x: rect.x + 45, y: rect.y + rect.height / 2 };
    }, index);

  /** A point inside the nth visible pane, as a fraction of that pane's box. */
  const panePoint = async (
    index: number,
    rx: number,
    ry: number
  ): Promise<{ x: number; y: number }> =>
    page.evaluate(
      (arg) => {
        const frames = [...document.querySelectorAll<HTMLElement>('[data-pane-active]')]
          .filter((frame) => frame.getBoundingClientRect().width > 0)
          .map((frame) => frame.getBoundingClientRect())
          .sort((a, b) => a.y + a.x / 1000 - (b.y + b.x / 1000));
        const rect = frames.at(arg.index);
        if (!rect) throw new Error(`no visible pane at index ${arg.index}`);
        return { x: rect.x + rect.width * arg.rx, y: rect.y + rect.height * arg.ry };
      },
      { index, rx, ry }
    );

  const dragPaneTo = async (
    from: { x: number; y: number },
    to: { x: number; y: number }
  ): Promise<void> => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 12, from.y + 8, { steps: 5 });
    await page.mouse.move(to.x, to.y, { steps: 16 });
  };

  /**
   * Hold a drag on `target` until `read` answers.
   *
   * Chromium re-fires dragover for a stationary pointer only every ~350ms, and
   * React commits the preview on the dragover *after* the one that set it, so a
   * single fixed pause reads the state too early. Nudging by a pixel or two
   * produces a fresh dragover each attempt instead of guessing the interval.
   */
  const holdDragUntil = async <T>(
    target: { x: number; y: number },
    read: () => Promise<T | null>,
    label: string
  ): Promise<T> => {
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const value = await read();
      if (value !== null) return value;
      await page.mouse.move(
        target.x + (attempt % 2 === 0 ? 2 : -2),
        target.y + (attempt % 3 === 0 ? 2 : 0),
        { steps: 2 }
      );
      await page.waitForTimeout(90);
    }
    await page.mouse.up();
    throw new Error(`${label} never appeared`);
  };

  await scenario('divider hit strip is 12px and answers the arrow keys', async () => {
    const tab = await openTab('QA-DIVIDER');
    await splitFirstPane(tab.id);
    await waitForDivider();
    await page.waitForTimeout(400);

    const measured = await page.evaluate(() => {
      // Side-by-side split, so the divider we want runs vertically. Asking for
      // it by orientation also keeps the arrow-key step below meaningful.
      const handles = [
        ...document.querySelectorAll<HTMLElement>('[data-grid-handle][aria-orientation="vertical"]')
      ].filter((element) => element.getBoundingClientRect().height > 0);
      const handle = handles.at(0);
      if (!handle) {
        const visible = document.querySelectorAll('[data-pane-active]').length;
        throw new Error(`no vertical divider on screen (${visible} pane cards mounted)`);
      }
      const rect = handle.getBoundingClientRect();
      return {
        acrossSeam: Math.round(rect.width),
        tabIndex: handle.tabIndex,
        orientation: handle.getAttribute('aria-orientation')
      };
    });
    assert(
      measured.acrossSeam === 12,
      `divider hit strip is ${measured.acrossSeam}px across the seam, expected 12`
    );
    assert(measured.tabIndex === 0, 'the divider is not focusable');
    assert(
      measured.orientation === 'vertical',
      `side-by-side divider reports ${String(measured.orientation)}`
    );

    await page.evaluate(() => {
      const handle = [...document.querySelectorAll<HTMLElement>('[data-grid-handle]')].find(
        (element) => element.getBoundingClientRect().height > 0
      );
      handle?.focus();
    });
    const before = ratios(await tabRoot(tab.id));
    await page.keyboard.press('ArrowRight');
    const afterOne = ratios(await tabRoot(tab.id));
    await page.keyboard.press('Shift+ArrowRight');
    const afterShift = ratios(await tabRoot(tab.id));
    assert(
      round(afterOne[0] - before[0]) === 0.02,
      `ArrowRight moved ${round(afterOne[0] - before[0])}, expected 0.02`
    );
    assert(
      round(afterShift[0] - afterOne[0]) === 0.1,
      `Shift+ArrowRight moved ${round(afterShift[0] - afterOne[0])}, expected 0.1`
    );
    await closeTab(tab.id);
    return '12px strip, focusable separator, steps of 0.02 and 0.1';
  });

  await scenario('splitting equalizes the group the new pane landed in', async () => {
    const tab = await openTab('QA-SPLIT-BALANCE');
    await page.evaluate((id): void => {
      // A plain object, not a helper arrow: esbuild's keep-names transform rewrites
      // named arrows into `__name(...)` calls, and that helper does not exist
      // inside the page Playwright serialises this into.
      const store = window.__FLEET__.stores.workspace;
      const tab = store.getState().workspace.tabs.find((candidate) => candidate.id === id);
      if (tab?.splitRoot.type !== 'leaf') throw new Error('expected a single-pane tab to split');
      const root = tab.splitRoot;
      const second = store.getState().splitPane(root.id, 'horizontal');
      store.getState().resizeSplit([], 0.2);
      store.getState().splitPane(second, 'horizontal');
    }, tab.id);
    const found = ratios(await tabRoot(tab.id));
    assert(round(found[0]) === round(1 / 3), `outer ratio is ${round(found[0])}, expected 1/3`);
    assert(round(found[1]) === 0.5, `inner ratio is ${round(found[1])}, expected 0.5`);
    await closeTab(tab.id);
    return `outer ${round(found[0])}, inner ${round(found[1])} (Otty's equalize)`;
  });

  await scenario('Cmd+Shift+B balances every divider in the tab', async () => {
    const tab = await openTab('QA-BALANCE');
    await page.evaluate((id): void => {
      // A plain object, not a helper arrow: esbuild's keep-names transform rewrites
      // named arrows into `__name(...)` calls, and that helper does not exist
      // inside the page Playwright serialises this into.
      const store = window.__FLEET__.stores.workspace;
      const tab = store.getState().workspace.tabs.find((candidate) => candidate.id === id);
      if (tab?.splitRoot.type !== 'leaf') throw new Error('expected a single-pane tab to split');
      const root = tab.splitRoot;
      const right = store.getState().splitPane(root.id, 'horizontal');
      store.getState().splitPane(root.id, 'vertical');
      store.getState().splitPane(right, 'vertical');
      store.getState().resizeSplit([], 0.78);
      store.getState().resizeSplit([0], 0.72);
      store.getState().resizeSplit([1], 0.31);
    }, tab.id);
    await page.waitForTimeout(400);
    const skewed = ratios(await tabRoot(tab.id));
    await page.waitForTimeout(200);
    // Click a terminal first: the shortcut has to reach the window handler with
    // xterm holding focus, which is how it gets pressed in real use.
    const point = await headerPoint(0);
    await page.mouse.click(point.x, point.y);
    await page.keyboard.press('Meta+Shift+B');
    await page.waitForTimeout(250);
    const balanced = ratios(await tabRoot(tab.id));
    assert(
      balanced.every((ratio) => ratio === 0.5),
      `expected every divider at 0.5, got ${balanced.map(round).join(', ')}`
    );
    await closeTab(tab.id);
    return `${skewed.map(round).join('/')} -> ${balanced.map(round).join('/')}`;
  });

  await scenario('Cmd+Alt+Arrow docks the pane onto its neighbour', async () => {
    const tab = await openTab('QA-KEYBOARD-MOVE');
    const ids = await page.evaluate(
      (id): { topRight: string; bottomLeft: string; bottomRight: string } => {
        // A plain object, not a helper arrow: esbuild's keep-names transform rewrites
        // named arrows into `__name(...)` calls, and that helper does not exist
        // inside the page Playwright serialises this into.
        const store = window.__FLEET__.stores.workspace;
        const tab = store.getState().workspace.tabs.find((candidate) => candidate.id === id);
        if (tab?.splitRoot.type !== 'leaf') throw new Error('expected a single-pane tab to split');
        const root = tab.splitRoot;
        const topRight = store.getState().splitPane(root.id, 'horizontal');
        const bottomLeft = store.getState().splitPane(root.id, 'vertical');
        const bottomRight = store.getState().splitPane(topRight, 'vertical');
        return { topRight, bottomLeft, bottomRight };
      },
      tab.id
    );
    await page.waitForTimeout(600);
    await page.evaluate(
      (paneId) => window.__FLEET__.stores.workspace.getState().setActivePane(paneId),
      ids.bottomRight
    );
    await page.keyboard.press('Meta+Alt+ArrowLeft');
    await page.waitForTimeout(300);

    const root = await tabRoot(tab.id);
    assert(paneIds(root).length === 4, `pane count became ${paneIds(root).length}`);
    const relation = divergence(root, ids.bottomRight, ids.bottomLeft);
    assert(
      relation !== null,
      'the moved pane is no longer a sibling of the neighbour it docked to'
    );
    assert(
      relation.direction === 'horizontal' && relation.firstSlot === 0 && relation.secondSlot === 1,
      `moved pane sits in ${relation.direction} slot ${relation.firstSlot}, neighbour in slot ${relation.secondSlot}`
    );
    await closeTab(tab.id);
    return 'bottom-right docked left of bottom-left, all 4 panes kept';
  });

  await scenario('a pane dragged onto a neighbour re-docks there', async () => {
    const tab = await openTab('QA-DRAG-PANE');
    await splitFirstPane(tab.id);
    await page.waitForTimeout(600);
    const before = paneIds(await tabRoot(tab.id));
    // Drop the first pane on the right quarter of the second: the half of the
    // target is what decides the side, so the two should trade places.
    const target = await panePoint(1, 0.78, 0.5);
    await dragPaneTo(await headerPoint(0), target);
    const preview = await holdDragUntil(
      target,
      async () =>
        (await page.evaluate(
          () => document.querySelector('[class*="fleet-accent-bg-soft"][class*="z-50"]') !== null
        ))
          ? true
          : null,
      'the pane drop preview'
    );
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after = paneIds(await tabRoot(tab.id));
    assert(preview, 'no drop preview appeared over the target pane');
    assert(
      after.length === before.length,
      `pane count changed from ${before.length} to ${after.length}`
    );
    assert(
      after.join() === [...before].reverse().join(),
      `dropping on the right half did not flip the pair: ${before.join('|')} -> ${after.join('|')}`
    );
    await closeTab(tab.id);
    return `${before.length} panes swapped, preview shown, none lost`;
  });

  await scenario('a pane dropped on a sidebar row joins that tab', async () => {
    const source = await openTab('QA-ROW-SOURCE');
    const target = await openTab('QA-ROW-TARGET');
    await splitFirstPane(source.id);
    await page.waitForTimeout(800);
    await page.evaluate(
      (id) => window.__FLEET__.stores.workspace.getState().setActiveTab(id),
      source.id
    );
    await page.waitForTimeout(300);

    const row = await page.evaluate((id) => {
      const element = document.querySelector(`[data-tab-id="${id}"]`);
      if (!element) throw new Error('the target tab row is not in the sidebar');
      element.scrollIntoView({ block: 'center' });
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }, target.id);
    const rowPoint = { x: row.x + row.width * 0.75, y: row.y + row.height / 2 };
    const under = await page.evaluate((point) => {
      const element = document.elementFromPoint(point.x, point.y);
      return element?.closest('[data-tab-id]')?.getAttribute('data-tab-id') ?? null;
    }, rowPoint);
    assert(under === target.id, `the drop point sits over ${String(under)}, not the target row`);
    await dragPaneTo(await headerPoint(0), rowPoint);
    const preview = await holdDragUntil(
      rowPoint,
      async () =>
        page.evaluate(
          (id) =>
            document
              .querySelector(`[data-tab-id="${id}"] [data-pane-drop-preview]`)
              ?.getAttribute('data-pane-drop-preview') ?? null,
          target.id
        ),
      'the sidebar row drop preview'
    );
    await page.mouse.up();
    await page.waitForTimeout(400);

    const state = await store();
    const sourceTab = state.workspace.tabs.find((tab) => tab.id === source.id);
    const targetTab = state.workspace.tabs.find((tab) => tab.id === target.id);
    assert(preview === 'right', `row preview was ${String(preview)}, expected right`);
    assert(
      !!sourceTab && paneIds(sourceTab.splitRoot).length === 1,
      'the source tab did not keep exactly one pane'
    );
    assert(
      !!targetTab && paneIds(targetTab.splitRoot).length === 2,
      'the target tab did not end up with two panes'
    );
    await closeTab(source.id);
    await closeTab(target.id);
    return 'row preview right, pane moved, source kept one pane';
  });

  await scenario('a pane dropped on empty sidebar ground becomes its own tab', async () => {
    const tab = await openTab('QA-DETACH');
    await splitFirstPane(tab.id);
    await page.waitForTimeout(600);

    const ground = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-tab-id]')]
        .map((row) => row.getBoundingClientRect())
        .sort((a, b) => a.bottom - b.bottom);
      const list = document
        .querySelector('[data-tab-id]')
        ?.closest('.overflow-y-auto')
        ?.getBoundingClientRect();
      if (!list) throw new Error('the sidebar tab list was not found');
      return {
        x: list.x + list.width / 2,
        y: Math.min(list.bottom - 12, (rows.at(-1)?.bottom ?? list.bottom) + 24)
      };
    });
    await dragPaneTo(await headerPoint(0), ground);
    await holdDragUntil(
      ground,
      async () =>
        (await page.evaluate(() =>
          [...document.querySelectorAll('[data-drop-hint="new-tab"]')].some(
            (element) => element.getBoundingClientRect().height > 0
          )
        ))
          ? true
          : null,
      'the "Move pane to a new tab" hint'
    );
    await page.mouse.up();
    await page.waitForTimeout(400);

    const state = await store();
    const index = state.workspace.tabs.findIndex((candidate) => candidate.id === tab.id);
    const made = state.workspace.tabs.at(index + 1);
    assert(
      !!made && paneIds(made.splitRoot).length === 1,
      'no single-pane tab was created after the source'
    );

    const sourceTab = state.workspace.tabs.at(index);
    assert(
      !!sourceTab && paneIds(sourceTab.splitRoot).length === 1,
      'the source tab did not keep one pane'
    );
    assert(state.activeTabId === made.id, 'the new tab was not focused');
    await closeTab(made.id);
    await closeTab(tab.id);
    return 'hint shown, new tab inserted after the source and focused';
  });

  await scenario('dragging a corner keeps a three-column row straight', async () => {
    const tab = await openTab('QA-CORNER');
    await page.evaluate((id): void => {
      // A plain object, not a helper arrow: esbuild's keep-names transform rewrites
      // named arrows into `__name(...)` calls, and that helper does not exist
      // inside the page Playwright serialises this into.
      const store = window.__FLEET__.stores.workspace;
      const tab = store.getState().workspace.tabs.find((candidate) => candidate.id === id);
      if (tab?.splitRoot.type !== 'leaf') throw new Error('expected a single-pane tab to split');
      const root = tab.splitRoot;
      const second = store.getState().splitPane(root.id, 'horizontal');
      const third = store.getState().splitPane(second, 'horizontal');
      store.getState().splitPane(root.id, 'vertical');
      store.getState().splitPane(second, 'vertical');
      store.getState().splitPane(third, 'vertical');
    }, tab.id);
    await page.waitForTimeout(900);

    const before = columnRatios(await tabRoot(tab.id));
    const corner = await page.evaluate(() => {
      const corners = [...document.querySelectorAll<HTMLElement>('[data-grid-corner]')].filter(
        (element) => element.getBoundingClientRect().width > 0
      );
      if (corners.length === 0) throw new Error('no corner grip on screen');
      const [pick] = corners
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .sort((a, b) => a.rect.x + a.rect.y - (b.rect.x + b.rect.y));
      return { x: pick.rect.x + pick.rect.width / 2, y: pick.rect.y + pick.rect.height / 2 };
    });
    await page.mouse.move(corner.x, corner.y);
    await page.mouse.down();
    await page.mouse.move(corner.x - 40, corner.y + 30, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const after = columnRatios(await tabRoot(tab.id));
    assert(
      before.length === 3 && after.length === 3,
      `expected three column dividers, saw ${before.length} then ${after.length}`
    );
    assert(
      after.every((ratio, index) => ratio !== before[index]),
      'the column dividers did not move'
    );
    assert(
      new Set(after.map(round)).size === 1,
      `the column dividers drifted apart: ${after.map(round).join(', ')}`
    );
    await closeTab(tab.id);
    return `all three column dividers moved together to ${round(after[0])}`;
  });

  await scenario('a grip sits only where one divider runs into another', async () => {
    const tab = await openTab('QA-CORNER-CROSS');
    await page.evaluate((id): void => {
      // A plain object, not a helper arrow: esbuild's keep-names transform rewrites
      // named arrows into `__name(...)` calls, and that helper does not exist
      // inside the page Playwright serialises this into.
      const store = window.__FLEET__.stores.workspace;
      const tab = store.getState().workspace.tabs.find((candidate) => candidate.id === id);
      if (tab?.splitRoot.type !== 'leaf') throw new Error('expected a single-pane tab to split');
      // Three columns with a top/bottom split nested in the rightmost one. That
      // divider stops inside its own column, so the only crossing in the layout
      // is the one inside the right half.
      const root = tab.splitRoot;
      const second = store.getState().splitPane(root.id, 'horizontal');
      const third = store.getState().splitPane(second, 'horizontal');
      store.getState().splitPane(third, 'vertical');
    }, tab.id);
    await page.waitForTimeout(900);

    const { corners, crossings } = await page.evaluate(() => {
      // No named helpers in here: esbuild's keep-names transform wraps an arrow
      // bound to a name in a `__name(...)` call that does not exist in the page.
      const separators = [...document.querySelectorAll<HTMLElement>('[data-grid-handle]')]
        .map((element) => ({
          rect: element.getBoundingClientRect(),
          orientation: element.getAttribute('aria-orientation')
        }))
        .filter((entry) => entry.rect.width > 0 && entry.rect.height > 0);
      const cornerRects = [...document.querySelectorAll<HTMLElement>('[data-grid-corner]')]
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0);
      // A grip is real when it lands on a divider of each orientation. The grip
      // is 14px and a divider's hit strip is 12px, so the two overlap rather
      // than nest: the grip is centred on the seam, which is where the divider
      // crossing it begins. One that only touches the divider it is anchored to
      // floats on bare seam.
      const crossed = cornerRects.filter(
        (corner) =>
          separators.some(
            (s) =>
              s.orientation === 'vertical' &&
              corner.x < s.rect.x + s.rect.width &&
              s.rect.x < corner.x + corner.width &&
              corner.y < s.rect.y + s.rect.height &&
              s.rect.y < corner.y + corner.height
          ) &&
          separators.some(
            (s) =>
              s.orientation === 'horizontal' &&
              corner.x < s.rect.x + s.rect.width &&
              s.rect.x < corner.x + corner.width &&
              corner.y < s.rect.y + s.rect.height &&
              s.rect.y < corner.y + corner.height
          )
      );
      return { corners: cornerRects.length, crossings: crossed.length };
    });

    assert(corners > 0, 'the nested split produced no corner grip at all');
    assert(
      corners === crossings,
      `${corners - crossings} of ${corners} corner grips sit where no divider crosses`
    );
    assert(
      corners === 1,
      `expected the single real crossing to be the only grip, found ${corners}`
    );
    await closeTab(tab.id);
    return `${corners} grip, sitting on the crossing inside the split column`;
  });

  await scenario('the workspace is left exactly as it was found', async () => {
    const now = await store();
    for (const tab of now.workspace.tabs.filter(
      (candidate) => !baseline.ids.includes(candidate.id)
    )) {
      await closeTab(tab.id);
    }
    await page.evaluate((arg): void => {
      // A plain object, not a helper arrow: esbuild's keep-names transform rewrites
      // named arrows into `__name(...)` calls, and that helper does not exist
      // inside the page Playwright serialises this into.
      const store = window.__FLEET__.stores.workspace;
      if (arg.activeTabId) store.getState().setActiveTab(arg.activeTabId);
    }, baseline);
    await page.waitForTimeout(300);
    const settled = await store();
    assert(
      JSON.stringify(settled.workspace.tabs.map((tab) => tab.id)) === JSON.stringify(baseline.ids),
      'the tab list does not match the snapshot taken at the start'
    );
    assert(settled.activeTabId === baseline.activeTabId, 'the active tab was not restored');
    return `${settled.workspace.tabs.length} tab(s) restored`;
  });
}

run()
  .then(() => {
    const width = Math.max(...results.map((result) => result.name.length));
    for (const result of results) {
      process.stdout.write(
        `${result.pass ? 'PASS' : 'FAIL'}  ${result.name.padEnd(width)}  ${result.detail}\n`
      );
    }
    const failed = results.filter((result) => !result.pass).length;
    process.stdout.write(`\n${results.length - failed}/${results.length} scenarios passed\n`);
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch((error: unknown) => {
    process.stderr.write(`could not run the pane layout pass: ${String(error)}\n`);
    process.exit(1);
  });
