import type { MessageKey } from '../../../shared/i18n';

const PLATFORM: 'mac' | 'other' =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? 'mac' : 'other';

export type KeyCombo = {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type ShortcutDef = {
  id: string;
  /**
   * A catalogue key rather than the text itself: the shortcut list is shown in
   * the overlay and recycled as a palette label, so it has to be able to render
   * in whatever locale the user picked.
   */
  labelKey: MessageKey;
  mac: KeyCombo;
  other: KeyCombo;
};

export const ALL_SHORTCUTS: ShortcutDef[] = [
  {
    id: 'new-tab',
    labelKey: 'shortcut.new-tab',
    mac: { key: 't', meta: true },
    other: { key: 't', ctrl: true }
  },
  {
    id: 'close-pane',
    labelKey: 'shortcut.close-pane',
    mac: { key: 'w', meta: true },
    other: { key: 'W', ctrl: true, shift: true }
  },
  {
    id: 'split-right',
    labelKey: 'shortcut.split-right',
    mac: { key: 'd', meta: true },
    other: { key: 'D', ctrl: true, shift: true }
  },
  {
    id: 'split-down',
    labelKey: 'shortcut.split-down',
    mac: { key: 'D', meta: true, shift: true },
    other: { key: 'D', ctrl: true, shift: true, alt: true }
  },
  {
    // 'B' for balance. Sits next to the split keys because it fixes what
    // dragging a divider gets wrong, which is the same job split starts.
    id: 'balance-panes',
    labelKey: 'shortcut.balance-panes',
    mac: { key: 'B', meta: true, shift: true },
    other: { key: 'B', ctrl: true, shift: true }
  },
  {
    id: 'navigate-prev',
    labelKey: 'shortcut.navigate-prev',
    mac: { key: '[', meta: true },
    other: { key: '[', ctrl: true, shift: true }
  },
  {
    id: 'navigate-next',
    labelKey: 'shortcut.navigate-next',
    mac: { key: ']', meta: true },
    other: { key: ']', ctrl: true, shift: true }
  },
  {
    // The keyboard's version of dragging a pane onto a neighbour's edge. Cmd+
    // Alt+Arrow because plain Cmd+Arrow belongs to text and the terminal.
    id: 'move-pane-left',
    labelKey: 'shortcut.move-pane-left',
    mac: { key: 'ArrowLeft', meta: true, alt: true },
    other: { key: 'ArrowLeft', ctrl: true, shift: true }
  },
  {
    id: 'move-pane-right',
    labelKey: 'shortcut.move-pane-right',
    mac: { key: 'ArrowRight', meta: true, alt: true },
    other: { key: 'ArrowRight', ctrl: true, shift: true }
  },
  {
    id: 'move-pane-up',
    labelKey: 'shortcut.move-pane-up',
    mac: { key: 'ArrowUp', meta: true, alt: true },
    other: { key: 'ArrowUp', ctrl: true, shift: true }
  },
  {
    id: 'move-pane-down',
    labelKey: 'shortcut.move-pane-down',
    mac: { key: 'ArrowDown', meta: true, alt: true },
    other: { key: 'ArrowDown', ctrl: true, shift: true }
  },
  {
    id: 'cycle-tab-next',
    labelKey: 'shortcut.cycle-tab-next',
    mac: { key: 'Tab', ctrl: true },
    other: { key: 'Tab', ctrl: true }
  },
  {
    id: 'cycle-tab-prev',
    labelKey: 'shortcut.cycle-tab-prev',
    mac: { key: 'Tab', ctrl: true, shift: true },
    other: { key: 'Tab', ctrl: true, shift: true }
  },
  {
    id: 'search',
    labelKey: 'shortcut.search',
    mac: { key: 'f', meta: true },
    other: { key: 'F', ctrl: true, shift: true }
  },
  {
    id: 'settings',
    labelKey: 'shortcut.settings',
    mac: { key: ',', meta: true },
    other: { key: ',', ctrl: true }
  },
  {
    id: 'shortcuts',
    labelKey: 'shortcut.shortcuts',
    mac: { key: '/', meta: true },
    other: { key: '/', ctrl: true }
  },
  {
    id: 'rename-tab',
    labelKey: 'shortcut.rename-tab',
    mac: { key: 'F2' },
    other: { key: 'F2' }
  },
  {
    id: 'rename-pane',
    labelKey: 'shortcut.rename-pane',
    mac: { key: 'F2', shift: true },
    other: { key: 'F2', shift: true }
  },
  {
    id: 'command-palette',
    labelKey: 'shortcut.command-palette',
    mac: { key: 'k', meta: true },
    other: { key: 'k', ctrl: true }
  },
  {
    id: 'git-changes',
    labelKey: 'shortcut.git-changes',
    mac: { key: 'g', meta: true, shift: true },
    other: { key: 'G', ctrl: true, shift: true }
  },
  {
    id: 'open-file',
    labelKey: 'shortcut.open-file',
    mac: { key: 'o', meta: true },
    other: { key: 'o', ctrl: true }
  },
  {
    id: 'quick-open',
    labelKey: 'shortcut.quick-open',
    mac: { key: 'p', meta: true },
    other: { key: 'p', ctrl: true }
  },
  {
    id: 'file-search',
    labelKey: 'shortcut.file-search',
    mac: { key: 'O', meta: true, shift: true },
    other: { key: 'O', ctrl: true, shift: true }
  },
  {
    id: 'clipboard-history',
    labelKey: 'shortcut.clipboard-history',
    mac: { key: 'H', meta: true, shift: true },
    other: { key: 'H', ctrl: true, shift: true }
  },
  {
    id: 'telescope',
    labelKey: 'shortcut.telescope',
    mac: { key: 'T', meta: true, shift: true },
    other: { key: 'T', ctrl: true, shift: true }
  },
  {
    id: 'open-scratch',
    labelKey: 'shortcut.open-scratch',
    mac: { key: 'J', meta: true, shift: true },
    other: { key: 'J', ctrl: true, shift: true }
  },
  {
    id: 'agent-overview',
    labelKey: 'shortcut.agent-overview',
    mac: { key: 'A', meta: true, shift: true },
    other: { key: 'A', ctrl: true, shift: true }
  },
  {
    id: 'peek-needy-agent',
    labelKey: 'shortcut.peek-needy-agent',
    mac: { key: 'P', meta: true, shift: true },
    other: { key: 'P', ctrl: true, shift: true }
  }
];

export function matchesShortcut(e: KeyboardEvent, def: ShortcutDef): boolean {
  const combo = PLATFORM === 'mac' ? def.mac : def.other;
  if (e.key !== combo.key && e.key.toLowerCase() !== combo.key.toLowerCase()) return false;
  // For shifted keys, e.key is uppercase — also match case-insensitively
  if (combo.shift && !e.shiftKey) return false;
  if (!combo.shift && e.shiftKey && combo.key !== 'Tab') return false;
  if (combo.meta && !e.metaKey) return false;
  if (!combo.meta && e.metaKey) return false;
  if (combo.ctrl && !e.ctrlKey) return false;
  if (!combo.ctrl && e.ctrlKey) return false;
  if (combo.alt && !e.altKey) return false;
  if (!combo.alt && e.altKey) return false;
  return true;
}

function modLabel(platform: 'mac' | 'other'): string {
  return platform === 'mac' ? 'Cmd' : 'Ctrl';
}

export function formatShortcut(def: ShortcutDef): string {
  const combo = PLATFORM === 'mac' ? def.mac : def.other;
  const parts: string[] = [];
  if (combo.ctrl) parts.push('Ctrl');
  if (combo.meta) parts.push(modLabel(PLATFORM));
  if (combo.alt) parts.push('Alt');
  if (combo.shift) parts.push('Shift');
  // Display key nicely
  const keyLabel = combo.key === 'Tab' ? 'Tab' : combo.key.toUpperCase();
  parts.push(keyLabel);
  return parts.join('+');
}

export function getShortcut(id: string): ShortcutDef | undefined {
  return ALL_SHORTCUTS.find((s) => s.id === id);
}
