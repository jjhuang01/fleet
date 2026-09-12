import { Overlay } from './Overlay';
import { TOGGLEABLE_TOOLS, type ToolType } from '../../../shared/tools';
import type { MessageKey } from '../../../shared/i18n';
import { useWorkspaceStore } from '../store/workspace-store';
import { useSettingsStore } from '../store/settings-store';
import { useTranslation } from '../lib/i18n';

type ToolsConfigModalProps = {
  open: boolean;
  onClose: () => void;
};

const TOOL_COPY: Partial<Record<ToolType, { label: MessageKey; description: MessageKey }>> = {
  annotate: {
    label: 'panes.tools.annotate.label',
    description: 'panes.tools.annotate.description'
  },
  sessions: {
    label: 'panes.tools.sessions.label',
    description: 'panes.tools.sessions.description'
  }
};

/** Lets the user choose which pinned features appear in the sidebar. */
export function ToolsConfigModal({
  open,
  onClose
}: ToolsConfigModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const tools = useSettingsStore((s) => s.settings?.tools);
  const setToolVisible = useWorkspaceStore((s) => s.setToolVisible);

  return (
    <Overlay
      open={open}
      onClose={onClose}
      panelClassName="w-[420px] rounded-lg border border-fleet-border bg-fleet-surface p-4 shadow-xl"
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-fleet-text">{t('panes.tools.title')}</h2>
        <p className="mt-0.5 text-xs text-fleet-text-subtle">{t('panes.tools.description')}</p>
      </div>

      <div className="space-y-1">
        {TOGGLEABLE_TOOLS.map((tool) => {
          const copy = TOOL_COPY[tool.type];
          return (
            <label
              key={tool.type}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-fleet-surface-2"
            >
              <input
                type="checkbox"
                checked={tools?.[tool.type] ?? false}
                onChange={(e) => setToolVisible(tool.type, e.target.checked)}
                className="fleet-accent-input"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-fleet-text">
                    {copy ? t(copy.label) : tool.label}
                  </span>
                  {tool.experimental && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-400">
                      {t('panes.tools.experimental')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-fleet-text-subtle">
                  {copy ? t(copy.description) : tool.description}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onClose}
          className="rounded-md bg-fleet-surface-2 px-3 py-1.5 text-sm text-fleet-text hover:bg-fleet-surface-3 active:scale-95 transition"
        >
          {t('panes.tools.done')}
        </button>
      </div>
    </Overlay>
  );
}
