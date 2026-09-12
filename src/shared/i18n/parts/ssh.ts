/**
 * Keys for the SSH remote browsing pane and its dialogs.
 *
 * Parts exist so two surfaces can be translated at once without two edits to
 * one 400-key list. `en` defines this surface's keys; `zh` is typed against it,
 * so a key that is not translated fails to compile here, next to the surface it
 * belongs to, rather than somewhere in a merged list.
 */

export const en = {
  'ssh.action.back': 'Back',
  'ssh.action.forward': 'Forward',
  'ssh.action.parentFolder': 'Parent folder',
  'ssh.action.refresh': 'Refresh',
  'ssh.action.tryAgain': 'Try again',
  'ssh.action.newFolder': 'New folder',
  'ssh.action.uploadFiles': 'Upload files here',
  'ssh.action.listView': 'List view',
  'ssh.action.gridView': 'Grid view',
  'ssh.action.cancel': 'Cancel',
  'ssh.action.create': 'Create',
  'ssh.action.rename': 'Rename',
  'ssh.action.renameMenu': 'Rename…',
  'ssh.action.delete': 'Delete',
  'ssh.action.deleteMenu': 'Delete…',
  'ssh.action.open': 'Open',
  'ssh.action.openFolder': 'Open folder',
  'ssh.action.download': 'Download…',
  'ssh.action.copyPath': 'Copy path',
  'ssh.action.update': 'Update',
  'ssh.action.setUp': 'Set up',
  'ssh.action.notNow': 'Not now',
  'ssh.action.cancelTransfer': 'Cancel transfer',
  'ssh.action.dismiss': 'Dismiss',

  'ssh.status.connecting': 'Connecting to {host}…',
  'ssh.status.loading': 'Loading…',
  'ssh.status.empty': 'This folder is empty',
  'ssh.status.item': '{count} item',
  'ssh.status.items': '{count} items',
  'ssh.status.uploadTo': 'Upload to {host}',

  'ssh.toast.previewBlocked': "Can't preview {name}",
  'ssh.toast.pathCopied': 'Copied path',

  'ssh.breadcrumb.remotePath': 'Remote path',
  'ssh.breadcrumb.connected': 'Connected to {host}',
  'ssh.breadcrumb.disconnected': 'Not connected to {host}',
  'ssh.breadcrumb.showHidden': 'Show hidden path segments',

  'ssh.list.name': 'Name',
  'ssh.list.size': 'Size',
  'ssh.list.modified': 'Modified',

  'ssh.name.title.newFolder': 'New folder',
  'ssh.name.title.rename': 'Rename',
  'ssh.name.label.createdIn': 'Created in {path}',
  'ssh.name.label.newName': 'New name',
  'ssh.name.error.empty': 'Enter a name.',
  'ssh.name.error.reserved': 'That name is reserved.',
  'ssh.name.error.slash': 'A name cannot contain "/".',
  'ssh.name.error.lineBreaks': 'A name cannot contain line breaks.',
  'ssh.name.error.nullByte': 'A name cannot contain a null byte.',
  'ssh.name.error.exists': '"{name}" already exists in this folder.',

  'ssh.delete.title.folder': 'Delete folder?',
  'ssh.delete.title.link': 'Delete link?',
  'ssh.delete.title.file': 'Delete file?',
  'ssh.delete.body.folder': '{name} and everything inside it will be removed from {host}.',
  'ssh.delete.body.entry': '{name} will be removed from {host}.',
  'ssh.delete.warning': 'There is no trash on the remote host. This cannot be undone.',

  'ssh.rc.title.update': 'Update file transfer on {destination}?',
  'ssh.rc.title.setup': 'Set up file transfer on {destination}?',
  'ssh.rc.body':
    'Drag a file onto this pane to upload it to the folder you are in, and run fleet get <path> to pull one back down.',
  'ssh.rc.files.update':
    'Fleet rewrites ~/.fleetrc.sh on the host and adds one line to your .bashrc or .zshrc. Nothing else changes.',
  'ssh.rc.files.setup':
    'Fleet writes ~/.fleetrc.sh on the host and adds one line to your .bashrc or .zshrc. Nothing else changes.',

  'ssh.transfer.failed': 'Transfer failed',
  'ssh.transfer.cancelled': 'Cancelled',
  'ssh.transfer.cancelAria': 'Cancel {name}',
  'ssh.transfer.dismissAria': 'Dismiss {name}',

  'ssh.file.retry': 'Retry',
  'ssh.file.downloading': 'Downloading from {host}…',
  'ssh.file.error.notFound': 'File not found on the remote host.',
  'ssh.file.error.isDirectory': 'Path is a directory.',

  'ssh.error.paneGone': 'This browser pane is no longer open.'
} as const;

export const zh: Record<keyof typeof en, string> = {
  'ssh.action.back': '后退',
  'ssh.action.forward': '前进',
  'ssh.action.parentFolder': '上级文件夹',
  'ssh.action.refresh': '刷新',
  'ssh.action.tryAgain': '重试',
  'ssh.action.newFolder': '新建文件夹',
  'ssh.action.uploadFiles': '上传文件到这里',
  'ssh.action.listView': '列表视图',
  'ssh.action.gridView': '网格视图',
  'ssh.action.cancel': '取消',
  'ssh.action.create': '创建',
  'ssh.action.rename': '重命名',
  'ssh.action.renameMenu': '重命名…',
  'ssh.action.delete': '删除',
  'ssh.action.deleteMenu': '删除…',
  'ssh.action.open': '打开',
  'ssh.action.openFolder': '打开文件夹',
  'ssh.action.download': '下载…',
  'ssh.action.copyPath': '复制路径',
  'ssh.action.update': '更新',
  'ssh.action.setUp': '安装',
  'ssh.action.notNow': '暂不',
  'ssh.action.cancelTransfer': '取消传输',
  'ssh.action.dismiss': '关闭',

  'ssh.status.connecting': '正在连接到 {host}…',
  'ssh.status.loading': '加载中…',
  'ssh.status.empty': '此文件夹为空',
  'ssh.status.item': '{count} 项',
  'ssh.status.items': '{count} 项',
  'ssh.status.uploadTo': '上传到 {host}',

  'ssh.toast.previewBlocked': '无法预览 {name}',
  'ssh.toast.pathCopied': '已复制路径',

  'ssh.breadcrumb.remotePath': '远程路径',
  'ssh.breadcrumb.connected': '已连接到 {host}',
  'ssh.breadcrumb.disconnected': '未连接到 {host}',
  'ssh.breadcrumb.showHidden': '显示隐藏的路径片段',

  'ssh.list.name': '名称',
  'ssh.list.size': '大小',
  'ssh.list.modified': '修改时间',

  'ssh.name.title.newFolder': '新建文件夹',
  'ssh.name.title.rename': '重命名',
  'ssh.name.label.createdIn': '创建位置：{path}',
  'ssh.name.label.newName': '新名称',
  'ssh.name.error.empty': '请输入名称。',
  'ssh.name.error.reserved': '此名称是保留名称。',
  'ssh.name.error.slash': '名称不能包含“/”。',
  'ssh.name.error.lineBreaks': '名称不能包含换行符。',
  'ssh.name.error.nullByte': '名称不能包含空字节。',
  'ssh.name.error.exists': '“{name}”已存在于当前文件夹。',

  'ssh.delete.title.folder': '删除文件夹？',
  'ssh.delete.title.link': '删除链接？',
  'ssh.delete.title.file': '删除文件？',
  'ssh.delete.body.folder': '将从 {host} 删除 {name} 及其中的所有内容。',
  'ssh.delete.body.entry': '将从 {host} 删除 {name}。',
  'ssh.delete.warning': '远程主机上没有回收站。此操作无法撤销。',

  'ssh.rc.title.update': '更新 {destination} 上的文件传输？',
  'ssh.rc.title.setup': '在 {destination} 上安装文件传输？',
  'ssh.rc.body': '将文件拖到此窗格可上传到当前文件夹，也可以运行 fleet get <path> 下载文件。',
  'ssh.rc.files.update':
    'Fleet 会重写主机上的 ~/.fleetrc.sh，并向 .bashrc 或 .zshrc 添加一行。不会改动其他内容。',
  'ssh.rc.files.setup':
    'Fleet 会写入主机上的 ~/.fleetrc.sh，并向 .bashrc 或 .zshrc 添加一行。不会改动其他内容。',

  'ssh.transfer.failed': '传输失败',
  'ssh.transfer.cancelled': '已取消',
  'ssh.transfer.cancelAria': '取消 {name}',
  'ssh.transfer.dismissAria': '关闭 {name}',

  'ssh.file.retry': '重试',
  'ssh.file.downloading': '正在从 {host} 下载…',
  'ssh.file.error.notFound': '远程主机上找不到该文件。',
  'ssh.file.error.isDirectory': '该路径是文件夹。',

  'ssh.error.paneGone': '此浏览窗格已关闭。'
};
