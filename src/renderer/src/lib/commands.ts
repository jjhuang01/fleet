import { ALL_SHORTCUTS, formatShortcut, type ShortcutDef } from './shortcuts';
import type { Translator } from './i18n';
import type { MessageKey, TranslateParams } from '../../../shared/i18n';
import { useWorkspaceStore } from '../store/workspace-store';
import { useToastStore } from '../store/toast-store';
import { useSettingsStore } from '../store/settings-store';
import type { RemoteHost } from '../../../shared/remote-ssh-types';

export type Command = {
  id: string;
  /**
   * Rendered via the catalogue so the palette speaks the user's language.
   * `keywords` stays English on purpose: it is the search index, and an English
   * alias (`split`, `ssh`) should keep matching whatever the UI displays.
   */
  labelKey: MessageKey;
  /** Values for `{placeholders}` in `labelKey`. */
  labelParams?: TranslateParams;
  shortcut?: ShortcutDef;
  category: string;
  keywords?: string[];
  execute: () => void;
};

function sc(id: string): ShortcutDef | undefined {
  return ALL_SHORTCUTS.find((s) => s.id === id);
}

/**
 * Open a browser on whatever host the active pane is already SSH'd into.
 *
 * The detected destination is used for this pane only and is deliberately not
 * persisted - saving hosts is an explicit act in Settings, so a one-off `ssh`
 * in a terminal never quietly accumulates entries in the user's host list.
 */
async function browseDetectedHost(t: Translator): Promise<void> {
  const { activePaneId, openSshBrowser } = useWorkspaceStore.getState();
  const show = useToastStore.getState().show;
  if (!activePaneId) return;

  const result = await window.fleet.remoteSsh.detectHost(activePaneId);
  if (!result.success) {
    show(result.error);
    return;
  }
  if (result.data === null) {
    show(t('command.notRemotePane'));
    return;
  }
  const detected = result.data;
  openSshBrowser({
    id: crypto.randomUUID(),
    // Saved hosts carry a short human label; a detected one only has a
    // destination, so shorten it the way people say it out loud - the first
    // segment of the hostname, not the full user@fqdn.
    label: detected.host.split('.')[0] || detected.host,
    host: detected.host,
    user: detected.user,
    port: detected.port,
    identityFile: detected.identityFile
  });
}

/** One "Browse <host>" command per saved host, so the palette reaches them directly. */
export function createRemoteHostCommands(hosts: RemoteHost[]): Command[] {
  return hosts.map((host) => ({
    id: `browse-remote:${host.id}`,
    labelKey: 'command.browse-remote',
    labelParams: { label: host.label },
    category: 'File',
    keywords: ['ssh', 'remote', 'sftp', 'server', host.host, host.user ?? ''],
    execute: () => useWorkspaceStore.getState().openSshBrowser(host)
  }));
}

export function createCommandRegistry(t: Translator): Command[] {
  return [
    {
      id: 'new-tab',
      labelKey: 'shortcut.new-tab',
      shortcut: sc('new-tab'),
      category: 'Tabs',
      keywords: ['dispatch', 'agent', 'new agent'],
      execute: () => useWorkspaceStore.getState().addTab(undefined, window.fleet.homeDir)
    },
    {
      id: 'close-pane',
      labelKey: 'shortcut.close-pane',
      shortcut: sc('close-pane'),
      category: 'Panes',
      execute: () => {
        const { activePaneId, closePane } = useWorkspaceStore.getState();
        if (activePaneId) closePane(activePaneId);
      }
    },
    {
      id: 'split-right',
      labelKey: 'shortcut.split-right',
      shortcut: sc('split-right'),
      category: 'Panes',
      execute: () => {
        const { activePaneId, splitPane } = useWorkspaceStore.getState();
        if (activePaneId) splitPane(activePaneId, 'horizontal');
      }
    },
    {
      id: 'split-down',
      labelKey: 'shortcut.split-down',
      shortcut: sc('split-down'),
      category: 'Panes',
      execute: () => {
        const { activePaneId, splitPane } = useWorkspaceStore.getState();
        if (activePaneId) splitPane(activePaneId, 'vertical');
      }
    },
    {
      id: 'balance-panes',
      labelKey: 'shortcut.balance-panes',
      shortcut: sc('balance-panes'),
      category: 'Panes',
      keywords: ['even', 'equal', 'reset', 'grid', 'tile'],
      execute: () => useWorkspaceStore.getState().balancePanes()
    },
    {
      id: 'search',
      labelKey: 'shortcut.search',
      shortcut: sc('search'),
      category: 'Panes',
      execute: () => {
        const { activePaneId } = useWorkspaceStore.getState();
        document.dispatchEvent(
          new CustomEvent('fleet:toggle-search', { detail: { paneId: activePaneId } })
        );
      }
    },
    {
      id: 'settings',
      labelKey: 'common.settings',
      shortcut: sc('settings'),
      category: 'App',
      execute: () => document.dispatchEvent(new CustomEvent('fleet:toggle-settings'))
    },
    {
      id: 'shortcuts',
      labelKey: 'shortcut.shortcuts',
      shortcut: sc('shortcuts'),
      category: 'App',
      execute: () => document.dispatchEvent(new CustomEvent('fleet:toggle-shortcuts'))
    },
    // The picker lives in Settings > General, which is a fine home for a
    // preference you set once and rarely again - but only if you can find it.
    // These make Cmd+K an answer to "where do I change the language?".
    {
      id: 'language-system',
      labelKey: 'command.language.system',
      category: 'App',
      keywords: ['language', 'locale', 'translation', 'i18n', '语言', '跟随系统'],
      execute: () => {
        void useSettingsStore.getState().updateSettings({ general: { language: 'system' } });
      }
    },
    {
      id: 'language-en',
      labelKey: 'command.language.en',
      category: 'App',
      keywords: ['language', 'locale', 'english', 'i18n', '语言', '英文'],
      execute: () => {
        void useSettingsStore.getState().updateSettings({ general: { language: 'en' } });
      }
    },
    {
      id: 'language-zh-Hans',
      labelKey: 'command.language.zhCN',
      category: 'App',
      keywords: ['language', 'locale', 'chinese', 'simplified', 'i18n', '语言', '中文', '简体'],
      execute: () => {
        void useSettingsStore.getState().updateSettings({ general: { language: 'zh-Hans' } });
      }
    },
    {
      id: 'shell-env',
      labelKey: 'command.shell-env',
      category: 'View',
      keywords: ['env', 'environment', 'variables', 'shell', 'export'],
      execute: () => document.dispatchEvent(new CustomEvent('fleet:toggle-shell-env'))
    },
    {
      id: 'rename-tab',
      labelKey: 'shortcut.rename-tab',
      shortcut: sc('rename-tab'),
      category: 'Tabs',
      execute: () => document.dispatchEvent(new CustomEvent('fleet:rename-active-tab'))
    },
    {
      id: 'rename-pane',
      labelKey: 'shortcut.rename-pane',
      shortcut: sc('rename-pane'),
      category: 'Panes',
      execute: () => {
        const state = useWorkspaceStore.getState();
        const activeTab = state.workspace.tabs.find((t) => t.id === state.activeTabId);
        if (activeTab?.splitRoot.type === 'split' && state.activePaneId) {
          document.dispatchEvent(
            new CustomEvent('fleet:rename-active-pane', {
              detail: { paneId: state.activePaneId }
            })
          );
        }
      }
    },
    {
      id: 'git-changes',
      labelKey: 'shortcut.git-changes',
      shortcut: sc('git-changes'),
      category: 'View',
      execute: () => document.dispatchEvent(new CustomEvent('fleet:toggle-git-changes'))
    },
    {
      id: 'browse-remote-here',
      labelKey: 'command.browse-remote-here',
      category: 'File',
      keywords: ['ssh', 'remote', 'sftp', 'server'],
      execute: () => void browseDetectedHost(t)
    },
    {
      id: 'open-file',
      labelKey: 'command.open-file',
      shortcut: sc('open-file'),
      category: 'File',
      execute: () => document.dispatchEvent(new CustomEvent('fleet:open-file-dialog'))
    },
    {
      id: 'quick-open',
      labelKey: 'shortcut.quick-open',
      shortcut: sc('quick-open'),
      category: 'File',
      execute: () => document.dispatchEvent(new CustomEvent('fleet:toggle-quick-open'))
    },
    {
      id: 'file-search',
      labelKey: 'shortcut.file-search',
      shortcut: sc('file-search'),
      category: 'File',
      execute: () => document.dispatchEvent(new CustomEvent('fleet:toggle-file-search'))
    },
    {
      id: 'clipboard-history',
      labelKey: 'shortcut.clipboard-history',
      shortcut: sc('clipboard-history'),
      category: 'Edit',
      execute: () => document.dispatchEvent(new CustomEvent('fleet:toggle-clipboard-history'))
    },
    {
      id: 'jump-needy-agent',
      labelKey: 'command.jump-needy-agent',
      category: 'Agent',
      execute: () => document.dispatchEvent(new CustomEvent('fleet:jump-needy-agent'))
    },
    {
      id: 'peek-needy-agent',
      labelKey: 'shortcut.peek-needy-agent',
      shortcut: sc('peek-needy-agent'),
      category: 'Agent',
      execute: () => document.dispatchEvent(new CustomEvent('fleet:peek-needy-agent'))
    },
    {
      id: 'agent-overview',
      labelKey: 'shortcut.agent-overview',
      shortcut: sc('agent-overview'),
      category: 'Agent',
      execute: () => document.dispatchEvent(new CustomEvent('fleet:toggle-agent-overview'))
    },
    {
      id: 'open-agent',
      labelKey: 'sidebar.newAgentPane',
      category: 'Agent',
      keywords: ['agent', 'ai', 'assistant', 'code'],
      // The pane needs a folder to work in, so the dialog runs first and opens
      // the pane itself once the user has chosen one.
      execute: () => document.dispatchEvent(new CustomEvent('fleet:new-agent'))
    },
    {
      id: 'open-scratch',
      labelKey: 'sidebar.newScratch',
      category: 'Agent',
      keywords: ['scratch', 'chat', 'quick', 'image', 'generate', 'ask'],
      // No folder picker: every invocation starts a separate scratch chat.
      execute: () => useWorkspaceStore.getState().openScratch()
    },
    {
      id: 'open-sessions',
      labelKey: 'command.open-sessions',
      category: 'Tabs',
      execute: () => {
        const ws = useWorkspaceStore.getState();
        ws.setToolVisible('sessions', true);
        const sessions = useWorkspaceStore
          .getState()
          .workspace.tabs.find((t) => t.type === 'sessions');
        if (sessions) ws.setActiveTab(sessions.id);
      }
    }
  ];
}

export function fuzzyMatch(query: string, label: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  let qi = 0;
  for (let li = 0; li < l.length && qi < q.length; li++) {
    if (l[li] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function formatCommandShortcut(cmd: Command): string | undefined {
  return cmd.shortcut ? formatShortcut(cmd.shortcut) : undefined;
}
