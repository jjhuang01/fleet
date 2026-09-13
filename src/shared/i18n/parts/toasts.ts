/**
 * The transient notices, wherever they are raised from.
 *
 * Toasts are the one surface with no component of its own: the text is built by
 * whichever module finished the work - an image export in `lib/`, a remote drop
 * in `hooks/` - so these keys are grouped here rather than under the panel the
 * action happened to start in.
 */
export const en = {
  'toasts.action.failed': 'That did not work',
  'toasts.image.saved': 'Image saved',
  'toasts.image.copied': 'Image copied',
  'toasts.image.copyFailed': 'That image cannot be copied as pixels',
  'toasts.background.set': 'Set as background',
  'toasts.background.slideshowAdded': 'Added to slideshow ({count} images)',
  'toasts.remoteDrop.unknownHost': 'Could not work out which host this pane is connected to.',
  'toasts.remoteDrop.unknownFolder':
    "Fleet does not know this shell's folder yet. Install Fleet's shell setup for this host.",
  'toasts.copilot.hooksInstallFailed': 'Could not install Fleet hooks',
  'toasts.copilot.hooksRemoveFailed': 'Could not remove Fleet hooks'
};

export const zh: Record<keyof typeof en, string> = {
  'toasts.action.failed': '操作没有成功',
  'toasts.image.saved': '图片已保存',
  'toasts.image.copied': '图片已复制',
  'toasts.image.copyFailed': '这张图片无法复制为像素',
  'toasts.background.set': '已设为背景',
  'toasts.background.slideshowAdded': '已加入幻灯片（共 {count} 张图片）',
  'toasts.remoteDrop.unknownHost': '无法判断这个窗格连接的是哪台主机。',
  'toasts.remoteDrop.unknownFolder':
    'Fleet 还不知道这个 shell 所在的目录。请为这台主机安装 Fleet 的 shell 配置。',
  'toasts.copilot.hooksInstallFailed': '无法安装 Fleet hooks',
  'toasts.copilot.hooksRemoveFailed': '无法移除 Fleet hooks'
};
