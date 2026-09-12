import { USER_GROUP_COLORS, COLOR_MAP, type UserGroupColor } from './sidebar-constants';
import type { MessageKey } from '../../../shared/i18n';
import { useTranslation } from '../lib/i18n';

const COLOR_NAMES: Record<UserGroupColor, MessageKey> = {
  blue: 'panes.color.blue',
  teal: 'panes.color.teal',
  green: 'panes.color.green',
  yellow: 'panes.color.yellow',
  orange: 'panes.color.orange',
  red: 'panes.color.red',
  pink: 'panes.color.pink',
  purple: 'panes.color.purple'
};

type ColorPalettePickerProps = {
  selected: UserGroupColor;
  onSelect: (color: UserGroupColor) => void;
};

export function ColorPalettePicker({
  selected,
  onSelect
}: ColorPalettePickerProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1.5 p-1.5">
      {USER_GROUP_COLORS.map((color) => (
        <button
          key={color}
          className={`w-5 h-5 rounded-full ${COLOR_MAP[color]} ${
            color === selected ? 'ring-2 ring-white ring-offset-1 ring-offset-fleet-surface-2' : ''
          } hover:scale-110 transition-transform`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(color);
          }}
          title={t(COLOR_NAMES[color])}
        />
      ))}
    </div>
  );
}
