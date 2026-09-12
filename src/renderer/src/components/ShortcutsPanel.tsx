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
      <div className="bg-fleet-surface border border-fleet-border-strong rounded-lg w-[360px] shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-fleet-border">
          <h2 className="text-sm font-semibold text-fleet-text">{t('shortcuts.title')}</h2>
          <button
            onClick={onClose}
            className="text-fleet-text-muted transition hover:text-fleet-text active:scale-90"
          >
            &times;
          </button>
        </div>
        <div className="p-4 space-y-2">
          {shortcuts.map((s) => (
            <div key={s.id} className="flex items-center justify-between">
              <span className="text-sm text-fleet-text-secondary">{t(s.labelKey)}</span>
              <kbd className="text-xs bg-fleet-surface-2 text-fleet-text-muted px-2 py-0.5 rounded border border-fleet-border-strong">
                {formatShortcut(s)}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </Overlay>
  );
}
