/**
 * Keys for Copilot settings page.
 *
 * Parts exist so two surfaces can be translated at once without two edits to
 * one 400-key list. `en` defines this surface's keys; `zh` is typed against it,
 * so a key that is not translated fails to compile here, next to the surface it
 * belongs to, rather than somewhere in a merged list.
 */

export const en = {
  'settings.copilot.enabled': 'Show Copilot',
  'settings.copilot.enabledDescription':
    'Show the Copilot overlay window on macOS. Copilot watches your active agent sessions and surfaces status, permissions, and quick actions in a floating panel.',
  'settings.copilot.notificationSound': 'Notification sound',
  'settings.copilot.notificationSoundNone': 'None',
  'settings.copilot.notificationSoundDescription': 'Sound played when an agent needs attention.',
  'settings.copilot.sessionsToShow': 'Sessions to show',
  'settings.copilot.allWorkspaces': 'All workspaces',
  'settings.copilot.activeWorkspaceOnly': 'Active workspace only',
  'settings.copilot.claudeCodeConnection': 'Claude Code connection',
  'settings.copilot.claudeCodeConnectionDescription':
    'Copilot receives updates through Fleet hooks in each workspace\u2019s Claude config folder.',
  'settings.copilot.claudeNotFound': 'Claude Code not found',
  // The npm command stays untranslated; only the surrounding instruction changes.
  'settings.copilot.claudeInstall': 'Install it with: {command}',
  'settings.copilot.noWorkspaces': 'No workspaces configured.',

  // ConnectionRow shows the same hook states as FolderHooks, but as a compact
  // summary beside the source and link rather than install/remove controls.
  'settings.copilot.sourceCustom': 'Custom',
  'settings.copilot.sourceInherited': 'Inherited',
  'settings.copilot.hookChecking': 'Checking\u2026',
  'settings.copilot.hookInstalled': 'Hooks installed',
  'settings.copilot.hookMissing': 'Hooks not installed',
  'settings.copilot.hookError': 'Status unknown',
  'settings.copilot.manageWorkspaceConnection': 'Manage workspace connection'
} as const;

export const zh: Record<keyof typeof en, string> = {
  'settings.copilot.enabled': '显示 Copilot',
  'settings.copilot.enabledDescription':
    '在 macOS 上显示 Copilot 悬浮窗口。Copilot 会监控活动的 Agent 会话，并在浮动面板中显示状态、权限和快捷操作。',
  'settings.copilot.notificationSound': '通知声音',
  'settings.copilot.notificationSoundNone': '无',
  'settings.copilot.notificationSoundDescription': 'Agent 需要处理时播放的声音。',
  'settings.copilot.sessionsToShow': '要显示的会话',
  'settings.copilot.allWorkspaces': '所有工作区',
  'settings.copilot.activeWorkspaceOnly': '仅活动工作区',
  'settings.copilot.claudeCodeConnection': 'Claude Code 连接',
  'settings.copilot.claudeCodeConnectionDescription':
    'Copilot 通过每个工作区 Claude 配置文件夹中的 Fleet hooks 接收更新。',
  'settings.copilot.claudeNotFound': '未找到 Claude Code',
  'settings.copilot.claudeInstall': '使用以下命令安装：{command}',
  'settings.copilot.noWorkspaces': '尚未配置工作区。',

  'settings.copilot.sourceCustom': '自定义',
  'settings.copilot.sourceInherited': '继承',
  'settings.copilot.hookChecking': '正在检查…',
  'settings.copilot.hookInstalled': 'Fleet hooks 已安装',
  'settings.copilot.hookMissing': 'Fleet hooks 未安装',
  'settings.copilot.hookError': '状态未知',
  'settings.copilot.manageWorkspaceConnection': '管理工作区连接'
};
