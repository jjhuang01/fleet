import { useSettingsStore } from '../../store/settings-store';
import type { FleetSettings } from '../../../../shared/types';
import { useTranslation } from '../../lib/i18n';
import type { MessageKey } from '../../../../shared/i18n';

type NotificationKey = keyof FleetSettings['notifications'];

const NOTIFICATION_KEYS = [
  'taskComplete',
  'needsPermission',
  'processExitError',
  'processExitClean'
] as const satisfies readonly NotificationKey[];

const NOTIFICATION_CHANNELS = ['badge', 'sound', 'os'] as const;

const NOTIFICATION_LABELS: Record<NotificationKey, MessageKey> = {
  taskComplete: 'notifications.taskComplete',
  needsPermission: 'notifications.needsPermission',
  processExitError: 'notifications.processExitError',
  processExitClean: 'notifications.processExitClean'
};

export function NotificationsSection(): React.JSX.Element | null {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();

  if (!settings) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2 text-xs text-fleet-text-subtle mb-1">
        <div>{t('notifications.event')}</div>
        <div className="text-center">{t('notifications.badge')}</div>
        <div className="text-center">{t('notifications.sound')}</div>
        <div className="text-center">{t('notifications.os')}</div>
      </div>
      {NOTIFICATION_KEYS.map((key) => (
        <div key={key} className="grid grid-cols-4 gap-2 items-center">
          <div className="text-sm text-fleet-text-secondary">{t(NOTIFICATION_LABELS[key])}</div>
          {NOTIFICATION_CHANNELS.map((channel) => (
            <div key={channel} className="flex justify-center">
              <input
                type="checkbox"
                checked={settings.notifications[key][channel]}
                onChange={(e) => {
                  void updateSettings({
                    notifications: {
                      ...settings.notifications,
                      [key]: {
                        ...settings.notifications[key],
                        [channel]: e.target.checked
                      }
                    }
                  });
                }}
                className="fleet-accent-input"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
