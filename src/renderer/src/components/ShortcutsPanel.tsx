import { Overlay } from './Overlay';
import { ALL_SHORTCUTS, formatShortcut } from '../lib/shortcuts';
import { useTranslation } from '../lib/i18n';

type ShortcutsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ShortcutsPanel({ isOpen, onClose }: ShortcutsPanelProps): React.JSX.Element | null {
  const { t } = useTranslation();
  // The palette's own shortcut opens this panel, so listing it here would only
  // restate the way you got in.
  const shortcuts = ALL_SHORTCUTS.filter((s) => s.id !== 'command-palette');

  return (
    <Overlay open={isOpen} onClose={onClose}>
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg w-[360px] shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-white">{t('shortcuts.title')}</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 transition hover:text-white active:scale-90"
          >
            &times;
          </button>
        </div>
        <div className="p-4 space-y-2">
          {shortcuts.map((s) => (
            <div key={s.id} className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">{t(s.labelKey)}</span>
              <kbd className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded border border-neutral-700">
                {formatShortcut(s)}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </Overlay>
  );
}
