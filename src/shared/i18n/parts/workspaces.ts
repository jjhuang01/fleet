/**
 * Keys for Workspaces settings page and the dialogs it opens.
 *
 * Parts exist so two surfaces can be translated at once without two edits to
 * one 400-key list. `en` defines this surface's keys; `zh` is typed against it,
 * so a key that is not translated fails to compile here, next to the surface it
 * belongs to, rather than somewhere in a merged list.
 */

export const en = {
  'settings.folderHooks.title': 'Fleet hooks',
  'settings.folderHooks.hint':
    'Fleet hooks let Copilot receive session status and permission requests from this folder.',
  'settings.folderHooks.checking': 'Checking\u2026',
  'settings.folderHooks.installed': 'Hooks installed',
  'settings.folderHooks.missing': 'Hooks not installed',
  'settings.folderHooks.error': 'Could not check this folder',
  'settings.folderHooks.working': 'Working\u2026',
  'settings.folderHooks.install': 'Install Fleet hooks',
  'settings.folderHooks.remove': 'Remove Fleet hooks',
  'settings.folderHooks.retry': 'Retry',
  'settings.folderHooks.shared':
    'This folder is used by {names}. Hook changes apply to all of them.',
  'settings.workspaces.createFailed': 'Could not create {dir}: {detail}',
  'settings.workspaces.new': 'New workspace',
  'settings.workspaces.description':
    'Choose the Claude Code config folder used by new terminals in each workspace.',
  'settings.workspaces.defaultFolder': 'Default Claude config folder',
  'settings.workspaces.browse': 'Browse',
  'settings.workspaces.emptyDefault': "Empty means Claude Code's own folder ({path}).",
  'settings.workspaces.appliesToNewTerminals':
    'Folder changes apply to new terminals. Existing terminals keep their current configuration.',
  'settings.workspaces.folders': 'Workspace config folders',
  'settings.workspaces.add': 'Add workspace',
  'settings.workspaces.none': 'No workspaces configured.',
  'settings.workspaces.active': 'Active',
  'settings.workspaces.sourceCustom': 'Custom',
  'settings.workspaces.sourceInherited': 'Inherited',
  'settings.workspaces.useDefault': 'Use default',
  'settings.workspaces.useCustomFolder': 'Use custom folder',
  'settings.workspaces.customPlaceholder': 'Pick a Claude config folder',
  'settings.workspaces.created': 'Workspace "{label}" created',
  'settings.workspaces.name': 'Name',
  'settings.workspaces.namePlaceholder': 'Workspace name',
  'settings.workspaces.claudeConfigFolder': 'Claude config folder',
  'settings.workspaces.defaultHint':
    'The workspace uses the default folder. You can give it its own folder later.',
  'settings.workspaces.customEmptyHint':
    'Enter a folder for this workspace, or choose Use default.',
  'settings.workspaces.customHint':
    'Fleet creates this folder if it does not exist yet. You can add Fleet hooks later.',
  'settings.workspaces.savedPartialError':
    'Workspace saved, but its config folder was not: {error}. Try again to finish it.',
  'settings.workspaces.createError': 'Could not create the workspace: {error}',
  'settings.workspaces.creating': 'Creating…',
  'settings.workspaces.create': 'Create workspace'
} as const;

export const zh: Record<keyof typeof en, string> = {
  'settings.folderHooks.title': 'Fleet hooks',
  'settings.folderHooks.hint': 'Fleet hooks 让 Copilot 能从这个文件夹接收会话状态和权限请求。',
  'settings.folderHooks.checking': '正在检查…',
  'settings.folderHooks.installed': '已安装 hooks',
  'settings.folderHooks.missing': '未安装 hooks',
  'settings.folderHooks.error': '无法检查此文件夹',
  'settings.folderHooks.working': '处理中…',
  'settings.folderHooks.install': '安装 Fleet hooks',
  'settings.folderHooks.remove': '移除 Fleet hooks',
  'settings.folderHooks.retry': '重试',
  'settings.folderHooks.shared': '此文件夹由 {names} 共用。更改 hooks 会影响全部这些工作区。',
  'settings.workspaces.createFailed': '无法创建 {dir}：{detail}',
  'settings.workspaces.new': '新建工作区',
  'settings.workspaces.description': '选择每个工作区中新终端使用的 Claude Code 配置文件夹。',
  'settings.workspaces.defaultFolder': '默认 Claude 配置文件夹',
  'settings.workspaces.browse': '浏览',
  'settings.workspaces.emptyDefault': '留空表示使用 Claude Code 自己的文件夹（{path}）。',
  'settings.workspaces.appliesToNewTerminals': '文件夹更改仅应用于新终端。现有终端保持当前配置。',
  'settings.workspaces.folders': '工作区配置文件夹',
  'settings.workspaces.add': '添加工作区',
  'settings.workspaces.none': '未配置工作区。',
  'settings.workspaces.active': '当前',
  'settings.workspaces.sourceCustom': '自定义',
  'settings.workspaces.sourceInherited': '继承',
  'settings.workspaces.useDefault': '使用默认',
  'settings.workspaces.useCustomFolder': '使用自定义文件夹',
  'settings.workspaces.customPlaceholder': '选择 Claude 配置文件夹',
  'settings.workspaces.created': '工作区“{label}”已创建',
  'settings.workspaces.name': '名称',
  'settings.workspaces.namePlaceholder': '工作区名称',
  'settings.workspaces.claudeConfigFolder': 'Claude 配置文件夹',
  'settings.workspaces.defaultHint': '工作区使用默认文件夹。你可以稍后为它设置单独的文件夹。',
  'settings.workspaces.customEmptyHint': '为此工作区输入文件夹，或选择“使用默认”。',
  'settings.workspaces.customHint':
    '如果该文件夹尚不存在，Fleet 会创建它。你可以稍后添加 Fleet 钩子。',
  'settings.workspaces.savedPartialError':
    '工作区已保存，但配置文件夹未保存：{error}。请重试以完成操作。',
  'settings.workspaces.createError': '无法创建工作区：{error}',
  'settings.workspaces.creating': '创建中…',
  'settings.workspaces.create': '创建工作区'
};
