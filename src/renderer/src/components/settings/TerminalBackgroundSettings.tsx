import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../store/settings-store';
import { useDebouncedCallback } from '../../hooks/use-debounced-callback';
import { SettingRow } from './SettingRow';
import { SliderInput, NumberStepper, SegmentedControl } from './background-controls';
import { BackgroundThumbnails } from './BackgroundThumbnails';
import { BackgroundPreview } from './BackgroundPreview';
import { backgroundLegibilityHint } from '../../lib/contrast';
import { adoptImages, nextSlideshowFiles } from '../../lib/background-actions';
import { TERMINAL_THEMES } from '../../../../shared/theme-presets';
import { useTranslation } from '../../lib/i18n';
import {
  DEFAULT_TERMINAL_BACKGROUND,
  type TerminalBackground,
  type TerminalBackgroundSlideshow
} from '../../../../shared/types';

const IMAGE_FILTERS = [
  { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }
];

const BUTTON_CLASS =
  'bg-fleet-surface-2 text-fleet-text text-sm rounded px-2 py-1 border border-fleet-border-strong hover:border-fleet-text-subtle transition active:scale-[0.97]';

const SUBTLE_BUTTON_CLASS =
  'text-fleet-text-secondary text-xs rounded px-2 py-1 border border-fleet-border-strong hover:border-fleet-text-subtle transition active:scale-[0.97]';

type BgMode = 'none' | 'image' | 'slideshow';

function deriveMode(b: TerminalBackground | undefined): BgMode {
  if (!b) return 'none';
  if (b.slideshow.enabled) return 'slideshow';
  if (b.imagePath) return 'image';
  return 'none';
}

function GroupHeader({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="text-xs font-medium text-fleet-text-subtle uppercase tracking-wide pt-1">
      {children}
    </div>
  );
}

export function TerminalBackgroundSettings(): React.JSX.Element | null {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();
  const bg = settings?.general.terminalBackground;

  const [localOpacity, setLocalOpacity] = useState(bg?.opacity ?? 0.15);
  const [localBlur, setLocalBlur] = useState(bg?.blur ?? 0);
  const [localEdgeFadeX, setLocalEdgeFadeX] = useState(bg?.edgeFadeX ?? 0);
  const [localEdgeFadeY, setLocalEdgeFadeY] = useState(bg?.edgeFadeY ?? 0);
  const [localInterval, setLocalInterval] = useState(bg?.slideshow.intervalSeconds ?? 60);
  const [localTransitionMs, setLocalTransitionMs] = useState(bg?.slideshow.transitionMs ?? 1000);
  const [localPaneTint, setLocalPaneTint] = useState(
    bg?.paneTint ?? DEFAULT_TERMINAL_BACKGROUND.paneTint
  );
  const [localPaneFrost, setLocalPaneFrost] = useState(
    bg?.paneFrost ?? DEFAULT_TERMINAL_BACKGROUND.paneFrost
  );
  const [localPaneSaturation, setLocalPaneSaturation] = useState(
    bg?.paneSaturation ?? DEFAULT_TERMINAL_BACKGROUND.paneSaturation
  );

  const [mode, setMode] = useState<BgMode>(() => deriveMode(bg));

  const adjustmentsVisible = !!bg && (!!bg.imagePath || bg.slideshow.enabled);
  const settingsLoaded = !!settings;

  // Sync the slider locals to stored values when the controls (re)appear —
  // covers the case where settings finish loading after this component mounted.
  useEffect(() => {
    if (!adjustmentsVisible) return;
    const current = useSettingsStore.getState().settings;
    if (!current) return;
    const tb = current.general.terminalBackground;
    setLocalOpacity(tb.opacity);
    setLocalBlur(tb.blur);
    setLocalEdgeFadeX(tb.edgeFadeX);
    setLocalEdgeFadeY(tb.edgeFadeY);
    setLocalInterval(tb.slideshow.intervalSeconds);
    setLocalTransitionMs(tb.slideshow.transitionMs);
    setLocalPaneTint(tb.paneTint);
    setLocalPaneFrost(tb.paneFrost);
    setLocalPaneSaturation(tb.paneSaturation);
  }, [adjustmentsVisible]);

  // Seed the mode once settings finish loading. This component is the sole
  // editor of it, so after the initial load the user drives mode.
  useEffect(() => {
    if (!settingsLoaded) return;
    setMode(deriveMode(useSettingsStore.getState().settings?.general.terminalBackground));
  }, [settingsLoaded]);

  // The settings merge is shallow within `general`, so always send the full
  // terminalBackground object (read fresh from the store to avoid stale closures).
  const saveBackground = (patch: Partial<TerminalBackground>): void => {
    const current = useSettingsStore.getState().settings;
    if (!current) return;
    void updateSettings({
      general: { terminalBackground: { ...current.general.terminalBackground, ...patch } }
    });
  };
  const debouncedSaveBackground = useDebouncedCallback(saveBackground, 150);

  const saveSlideshow = (patch: Partial<TerminalBackgroundSlideshow>): void => {
    const current = useSettingsStore.getState().settings;
    if (!current) return;
    const tb = current.general.terminalBackground;
    saveBackground({ slideshow: { ...tb.slideshow, ...patch } });
  };

  const changeMode = (next: BgMode): void => {
    setMode(next);
    const current = useSettingsStore.getState().settings;
    if (!current) return;
    const tb = current.general.terminalBackground;
    if (next === 'none') {
      // The stash is saved, not merely remembered: the copy behind it is swept
      // as soon as no setting names it, so a path held only in React state
      // would restore a picture that had been collected in the meantime.
      saveBackground({
        imagePath: null,
        stashedImagePath: tb.imagePath ?? tb.stashedImagePath,
        slideshow: { ...tb.slideshow, enabled: false }
      });
    } else if (next === 'image') {
      saveBackground({
        imagePath: tb.imagePath ?? tb.stashedImagePath,
        slideshow: { ...tb.slideshow, enabled: false }
      });
    } else {
      saveSlideshow({ enabled: true });
    }
  };

  const resetToDefault = (): void => {
    const d = DEFAULT_TERMINAL_BACKGROUND;
    saveBackground({ ...d, slideshow: { ...d.slideshow } });
    setMode('none');
    setLocalOpacity(d.opacity);
    setLocalBlur(d.blur);
    setLocalEdgeFadeX(d.edgeFadeX);
    setLocalEdgeFadeY(d.edgeFadeY);
    setLocalInterval(d.slideshow.intervalSeconds);
    setLocalTransitionMs(d.slideshow.transitionMs);
    setLocalPaneTint(d.paneTint);
    setLocalPaneFrost(d.paneFrost);
    setLocalPaneSaturation(d.paneSaturation);
  };

  const pickBackgroundImage = async (): Promise<void> => {
    const paths = await window.fleet.file.openDialog({ multi: false, filters: IMAGE_FILTERS });
    if (!paths[0]) return;
    // Point the setting at Fleet's own copy, never at the file the user
    // browsed to - that one is theirs to move or delete, and the background
    // has to survive them doing it.
    const [adopted] = await adoptImages([paths[0]]);
    if (adopted) saveBackground({ imagePath: adopted });
  };

  const pickSlideshowFolder = async (): Promise<void> => {
    const folder = await window.fleet.showFolderPicker();
    if (folder) saveSlideshow({ source: 'folder', folderPath: folder });
  };

  const addSlideshowFiles = async (): Promise<void> => {
    const paths = await window.fleet.file.openDialog({ multi: true, filters: IMAGE_FILTERS });
    if (paths.length === 0) return;
    const adopted = await adoptImages(paths);
    if (adopted.length === 0) return;
    // Read after the adopt, not before: the settings the list is rebuilt from
    // have to be the ones current once every await has settled.
    const current = useSettingsStore.getState().settings;
    if (!current) return;
    saveSlideshow(nextSlideshowFiles(current.general.terminalBackground.slideshow, adopted));
  };

  const clearSlideshowFiles = (): void => {
    saveSlideshow({ filePaths: [] });
  };

  const removeSlideshowFile = (path: string): void => {
    const current = useSettingsStore.getState().settings;
    if (!current) return;
    const next = current.general.terminalBackground.slideshow.filePaths.filter((p) => p !== path);
    saveSlideshow({ filePaths: next });
  };

  const reorderSlideshowFile = (from: number, to: number): void => {
    const current = useSettingsStore.getState().settings;
    if (!current) return;
    const arr = [...current.general.terminalBackground.slideshow.filePaths];
    if (from < 0 || from >= arr.length || to < 0 || to >= arr.length || from === to) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    saveSlideshow({ filePaths: arr });
  };

  if (!bg) return null;
  const ss = bg.slideshow;

  const themeId = settings.general.terminalTheme;
  const theme = TERMINAL_THEMES[themeId];
  const themeBackground = theme.xterm.background ?? theme.background;
  const themeForeground = theme.xterm.foreground ?? '#e4e4e4';

  // First image actually shown — drives the live preview. Folder slideshows are
  // scanned lazily inside BackgroundThumbnails, so the preview falls back to the
  // solid theme color until/unless a concrete path is known.
  const previewImagePath =
    mode === 'image'
      ? bg.imagePath
      : mode === 'slideshow' && ss.source === 'files'
        ? (ss.filePaths[0] ?? null)
        : null;

  const appearanceVisible = mode === 'slideshow' || (mode === 'image' && !!bg.imagePath);

  // Hide interval/transition when the slideshow resolves to a single image —
  // there is nothing to advance. (Folder counts are unknown here, so only the
  // explicit file-list case is suppressed.)
  const timingVisible = ss.source !== 'files' || ss.filePaths.length > 1;

  const legibilityHint = appearanceVisible
    ? backgroundLegibilityHint({
        opacity: localOpacity,
        blur: localBlur,
        themeForeground,
        themeBackground
      })
    : null;

  return (
    <div className="space-y-3 pt-3 border-t border-fleet-border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fleet-text">
          {t('settings.background.title')}
        </span>
        <button type="button" onClick={resetToDefault} className={SUBTLE_BUTTON_CLASS}>
          {t('common.reset')}
        </button>
      </div>

      <SettingRow label={t('settings.background.mode')}>
        <SegmentedControl
          ariaLabel={t('settings.background.modeAria')}
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'none', label: t('settings.background.none') },
            { value: 'image', label: t('settings.background.image') },
            { value: 'slideshow', label: t('settings.background.slideshow') }
          ]}
        />
      </SettingRow>

      {mode !== 'none' && (
        <>
          <BackgroundPreview
            background={bg}
            previewImagePath={previewImagePath}
            themeBackground={themeBackground}
            themeForeground={themeForeground}
          />
          {legibilityHint && (
            <div className="flex items-start gap-1.5 text-xs text-amber-400">
              <span aria-hidden>⚠</span>
              <span>{legibilityHint}</span>
            </div>
          )}
        </>
      )}

      {mode === 'image' && (
        <SettingRow label={t('settings.background.image')}>
          <div className="flex items-center gap-2">
            {bg.imagePath && (
              <span
                className="text-xs text-fleet-text-subtle max-w-[150px] truncate"
                title={bg.imagePath}
              >
                {bg.imagePath.split('/').pop()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void pickBackgroundImage()}
              className={BUTTON_CLASS}
            >
              {bg.imagePath ? t('settings.background.change') : t('settings.background.browse')}
            </button>
          </div>
        </SettingRow>
      )}

      {mode === 'slideshow' && (
        <>
          <GroupHeader>{t('settings.background.slideshow')}</GroupHeader>
          <SettingRow label={t('settings.background.source')}>
            <SegmentedControl
              ariaLabel={t('settings.background.sourceAria')}
              value={ss.source}
              onChange={(v) => saveSlideshow({ source: v })}
              options={[
                { value: 'folder', label: t('settings.background.folder') },
                { value: 'files', label: t('settings.background.files') }
              ]}
            />
          </SettingRow>
          {ss.source === 'folder' ? (
            <SettingRow label={t('settings.background.imageFolder')}>
              <div className="flex items-center gap-2">
                {ss.folderPath && (
                  <span
                    className="text-xs text-fleet-text-subtle max-w-[150px] truncate"
                    title={ss.folderPath}
                  >
                    {ss.folderPath.split('/').pop()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void pickSlideshowFolder()}
                  className={BUTTON_CLASS}
                >
                  {ss.folderPath
                    ? t('settings.background.change')
                    : t('settings.background.chooseFolder')}
                </button>
              </div>
            </SettingRow>
          ) : (
            <SettingRow label={t('settings.background.images')}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-fleet-text-subtle">
                  {t(
                    ss.filePaths.length === 1
                      ? 'settings.background.fileCountOne'
                      : 'settings.background.fileCountOther',
                    { count: ss.filePaths.length }
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => void addSlideshowFiles()}
                  className={BUTTON_CLASS}
                >
                  {ss.filePaths.length > 0
                    ? t('settings.background.add')
                    : t('settings.background.selectFiles')}
                </button>
                {ss.filePaths.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSlideshowFiles}
                    className={SUBTLE_BUTTON_CLASS}
                  >
                    {t('settings.background.clearAll')}
                  </button>
                )}
              </div>
            </SettingRow>
          )}
          <BackgroundThumbnails
            slideshow={ss}
            onRemoveFile={ss.source === 'files' ? removeSlideshowFile : undefined}
            onReorderFile={ss.source === 'files' ? reorderSlideshowFile : undefined}
          />
          <SettingRow label={t('settings.background.order')}>
            <SegmentedControl
              ariaLabel={t('settings.background.orderAria')}
              value={ss.shuffle ? 'shuffle' : 'sequential'}
              onChange={(v) => saveSlideshow({ shuffle: v === 'shuffle' })}
              options={[
                { value: 'shuffle', label: t('settings.background.shuffle') },
                { value: 'sequential', label: t('settings.background.sequential') }
              ]}
            />
          </SettingRow>
          {timingVisible && (
            <>
              <GroupHeader>{t('settings.background.timing')}</GroupHeader>
              <SettingRow label={t('settings.background.interval')}>
                <NumberStepper
                  ariaLabel={t('settings.background.intervalAria')}
                  value={localInterval}
                  min={10}
                  max={1800}
                  step={5}
                  unit="s"
                  onChange={(v) => {
                    setLocalInterval(v);
                    saveSlideshow({ intervalSeconds: v });
                  }}
                />
              </SettingRow>
              <SettingRow label={t('settings.background.transition')}>
                <NumberStepper
                  ariaLabel={t('settings.background.transitionAria')}
                  value={localTransitionMs}
                  min={200}
                  max={5000}
                  step={100}
                  unit="s"
                  format={(v) => (v / 1000).toFixed(1)}
                  parse={(s) => Math.round(parseFloat(s) * 1000)}
                  onChange={(v) => {
                    setLocalTransitionMs(v);
                    saveSlideshow({ transitionMs: v });
                  }}
                />
              </SettingRow>
            </>
          )}
        </>
      )}

      {appearanceVisible && (
        <>
          <GroupHeader>{t('settings.background.appearance')}</GroupHeader>
          <SettingRow label={t('settings.background.opacity')}>
            <SliderInput
              ariaLabel={t('settings.background.opacityAria')}
              value={localOpacity}
              min={0}
              max={1}
              step={0.05}
              unit="%"
              format={(v) => String(Math.round(v * 100))}
              parse={(s) => Number(s) / 100}
              onChange={(v) => {
                setLocalOpacity(v);
                debouncedSaveBackground({ opacity: v });
              }}
            />
          </SettingRow>
          <SettingRow label={t('settings.background.blur')}>
            <SliderInput
              ariaLabel={t('settings.background.blurAria')}
              value={localBlur}
              min={0}
              max={20}
              step={1}
              unit="px"
              onChange={(v) => {
                setLocalBlur(v);
                debouncedSaveBackground({ blur: v });
              }}
            />
          </SettingRow>
          <SettingRow label={t('settings.background.fadeX')}>
            <SliderInput
              ariaLabel={t('settings.background.fadeXAria')}
              value={localEdgeFadeX}
              min={0}
              max={0.5}
              step={0.05}
              unit="%"
              format={(v) => String(Math.round(v * 100))}
              parse={(s) => Number(s) / 100}
              onChange={(v) => {
                setLocalEdgeFadeX(v);
                debouncedSaveBackground({ edgeFadeX: v });
              }}
            />
          </SettingRow>
          <SettingRow label={t('settings.background.fadeY')}>
            <SliderInput
              ariaLabel={t('settings.background.fadeYAria')}
              value={localEdgeFadeY}
              min={0}
              max={0.5}
              step={0.05}
              unit="%"
              format={(v) => String(Math.round(v * 100))}
              parse={(s) => Number(s) / 100}
              onChange={(v) => {
                setLocalEdgeFadeY(v);
                debouncedSaveBackground({ edgeFadeY: v });
              }}
            />
          </SettingRow>
          <SettingRow label={t('settings.background.fit')}>
            <select
              value={bg.fit}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'cover' || v === 'contain' || v === 'center' || v === 'tile') {
                  saveBackground({ fit: v });
                }
              }}
              className="bg-fleet-surface-2 text-fleet-text text-sm rounded px-2 py-1 border border-fleet-border-strong"
            >
              <option value="cover">{t('settings.background.fitCover')}</option>
              <option value="contain">{t('settings.background.fitContain')}</option>
              <option value="center">{t('settings.background.fitCenter')}</option>
              <option value="tile">{t('settings.background.fitTile')}</option>
            </select>
          </SettingRow>

          {/* The picture is set; these three shape the glass the panes are made
              of, which is a separate question from how the picture looks. */}
          <GroupHeader>{t('settings.background.paneGlass')}</GroupHeader>
          <SettingRow label={t('settings.background.tint')}>
            <SliderInput
              ariaLabel={t('settings.background.tintAria')}
              value={localPaneTint}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => {
                setLocalPaneTint(v);
                debouncedSaveBackground({ paneTint: v });
              }}
            />
          </SettingRow>
          <SettingRow label={t('settings.background.frost')}>
            <SliderInput
              ariaLabel={t('settings.background.frostAria')}
              value={localPaneFrost}
              min={0}
              max={30}
              step={1}
              unit="px"
              onChange={(v) => {
                setLocalPaneFrost(v);
                debouncedSaveBackground({ paneFrost: v });
              }}
            />
          </SettingRow>
          <SettingRow label={t('settings.background.saturation')}>
            <SliderInput
              ariaLabel={t('settings.background.saturationAria')}
              value={localPaneSaturation}
              min={0}
              max={3}
              step={0.1}
              unit="×"
              format={(v) => v.toFixed(1)}
              onChange={(v) => {
                setLocalPaneSaturation(v);
                debouncedSaveBackground({ paneSaturation: v });
              }}
            />
          </SettingRow>
        </>
      )}
    </div>
  );
}
