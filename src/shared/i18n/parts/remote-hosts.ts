/**
 * Keys for Remote hosts settings page.
 *
 * Parts exist so two surfaces can be translated at once without two edits to
 * one 400-key list. `en` defines this surface's keys; `zh` is typed against it,
 * so a key that is not translated fails to compile here, next to the surface it
 * belongs to, rather than somewhere in a merged list.
 */

export const en = {
  'settings.remoteHosts.title': 'Remote Hosts',
  'settings.remoteHosts.description':
    'SSH targets you can browse as a file pane. Fleet stores only the connection coordinates - authentication uses your existing OpenSSH setup ({configPath}, agent keys), and no passwords or key material are ever saved here.',
  'settings.remoteHosts.empty': 'No hosts saved yet',
  'settings.remoteHosts.edit': 'Edit host',
  'settings.remoteHosts.browseFiles': 'Browse files',
  'settings.remoteHosts.browseHostAria': 'Browse {host}',
  'settings.remoteHosts.removeHost': 'Remove host',
  'settings.remoteHosts.removeHostAria': 'Remove {host}',
  'settings.remoteHosts.add': 'Add host',
  'settings.remoteHosts.testing': 'Testing',
  'settings.remoteHosts.testConnection': 'Test connection',
  'settings.remoteHosts.reachable': 'Reachable',
  'settings.remoteHosts.unreachable': 'Unreachable',
  'settings.remoteHosts.test': 'Test',
  'settings.remoteHosts.name': 'Name',
  'settings.remoteHosts.namePlaceholder': 'dev-box',
  'settings.remoteHosts.hostname': 'Hostname or SSH alias',
  'settings.remoteHosts.hostnamePlaceholder': 'dev-box.example.com',
  'settings.remoteHosts.user': 'User',
  'settings.remoteHosts.userPlaceholder': '(from ~/.ssh/config)',
  'settings.remoteHosts.port': 'Port',
  'settings.remoteHosts.portPlaceholder': '22',
  'settings.remoteHosts.identityFile': 'Identity file',
  'settings.remoteHosts.identityFilePlaceholder': '~/.ssh/id_ed25519',
  'settings.remoteHosts.startFolder': 'Start folder',
  'settings.remoteHosts.startFolderPlaceholder': '(login home)',
  'settings.remoteHosts.connectionFailed': 'Could not connect to {host}'
} as const;

export const zh: Record<keyof typeof en, string> = {
  'settings.remoteHosts.title': '远程主机',
  'settings.remoteHosts.description':
    'SSH 目标可以作为文件窗格浏览。Fleet 只保存连接参数，认证使用你现有的 OpenSSH 配置（{configPath}、ssh-agent 密钥），这里不会保存任何密码或密钥材料。',
  'settings.remoteHosts.empty': '还没有保存主机',
  'settings.remoteHosts.edit': '编辑主机',
  'settings.remoteHosts.browseFiles': '浏览文件',
  'settings.remoteHosts.browseHostAria': '浏览 {host}',
  'settings.remoteHosts.removeHost': '移除主机',
  'settings.remoteHosts.removeHostAria': '移除 {host}',
  'settings.remoteHosts.add': '添加主机',
  'settings.remoteHosts.testing': '正在测试',
  'settings.remoteHosts.testConnection': '测试连接',
  'settings.remoteHosts.reachable': '可连接',
  'settings.remoteHosts.unreachable': '无法连接',
  'settings.remoteHosts.test': '测试',
  'settings.remoteHosts.name': '名称',
  'settings.remoteHosts.namePlaceholder': 'dev-box',
  'settings.remoteHosts.hostname': '主机名或 SSH 别名',
  'settings.remoteHosts.hostnamePlaceholder': 'dev-box.example.com',
  'settings.remoteHosts.user': '用户',
  'settings.remoteHosts.userPlaceholder': '（来自 ~/.ssh/config）',
  'settings.remoteHosts.port': '端口',
  'settings.remoteHosts.portPlaceholder': '22',
  'settings.remoteHosts.identityFile': '身份文件',
  'settings.remoteHosts.identityFilePlaceholder': '~/.ssh/id_ed25519',
  'settings.remoteHosts.startFolder': '起始文件夹',
  'settings.remoteHosts.startFolderPlaceholder': '（登录主目录）',
  'settings.remoteHosts.connectionFailed': '无法连接到 {host}'
};
