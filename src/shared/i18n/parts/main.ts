/**
 * Strings the main process puts in native UI: menus and window titles that are
 * drawn by macOS rather than by the renderer, so no component can translate
 * them. The main process resolves the locale the same way the renderer does.
 */
export const en = {
  'main.contextMenu.copy': 'Copy',
  'main.contextMenu.paste': 'Paste',
  'main.contextMenu.selectAll': 'Select All',
  'main.contextMenu.clear': 'Clear',

  // OS chrome. The window title is drawn by macOS; the notification body is
  // drawn by Notification Center. Counts pick a One/Other pair rather than
  // appending an "s", the same way `settings.background.fileCount*` does.
  'main.window.awaitingInput': '{count} awaiting input',
  'main.window.errorOne': '1 error',
  'main.window.errorOther': '{count} errors',
  'main.notify.permissionSingle': 'An agent needs your permission',
  'main.notify.permissionIn': 'Agent in {where} needs your permission',
  'main.notify.errorSingle': 'A process exited with an error',
  'main.notify.errorIn': 'Agent in {where} hit an error',
  'main.notify.doneSingle': 'Task completed',
  'main.notify.doneIn': 'Agent in {where} finished',
  'main.notify.many': '{count} agents: {parts}',
  'main.notify.manyPermissionOne': '1 needs permission',
  'main.notify.manyPermissionOther': '{count} need permission',
  'main.notify.manyErrorOne': '1 error',
  'main.notify.manyErrorOther': '{count} errors',
  'main.notify.manyCompletedOne': '1 completed',
  'main.notify.manyCompletedOther': '{count} completed'
} as const;

export const zh: Record<keyof typeof en, string> = {
  'main.contextMenu.copy': '复制',
  'main.contextMenu.paste': '粘贴',
  'main.contextMenu.selectAll': '全选',
  'main.contextMenu.clear': '清除',

  'main.window.awaitingInput': '{count} 个等待输入',
  'main.window.errorOne': '1 个错误',
  'main.window.errorOther': '{count} 个错误',
  'main.notify.permissionSingle': '有 Agent 需要你授权',
  'main.notify.permissionIn': '{where} 中的 Agent 需要你授权',
  'main.notify.errorSingle': '有进程异常退出',
  'main.notify.errorIn': '{where} 中的 Agent 出错了',
  'main.notify.doneSingle': '任务完成',
  'main.notify.doneIn': '{where} 中的 Agent 已完成',
  'main.notify.many': '{count} 个 Agent：{parts}',
  'main.notify.manyPermissionOne': '1 个需要授权',
  'main.notify.manyPermissionOther': '{count} 个需要授权',
  'main.notify.manyErrorOne': '1 个错误',
  'main.notify.manyErrorOther': '{count} 个错误',
  'main.notify.manyCompletedOne': '1 个已完成',
  'main.notify.manyCompletedOther': '{count} 个已完成'
};
