export interface Theme {
  id: string;
  title: string;
  colors: {
    primary: string;
    secondary: string;
    backgroundPrimary: string;
    backgroundSecondary: string;
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
  };
}

interface SettingsOption {
  title: string;
  id: string;
  presetValues?: Record<string, string>;
}

interface SettingsEntry {
  settingName?: string;
  options?: SettingsOption[];
  children?: SettingsEntry[];
}

function findThemeSettings(entries: SettingsEntry[]): SettingsOption[] | null {
  for (const entry of entries) {
    if (entry.settingName === 'uiTheme' && entry.options) {
      return entry.options;
    }
    if (entry.children) {
      const found = findThemeSettings(entry.children);
      if (found) return found;
    }
  }
  return null;
}

export async function loadThemes(): Promise<Theme[]> {
  const response = await fetch(
    'https://raw.githubusercontent.com/jellyrock/jellyrock/main/settings/settings.json'
  );
  const settings = await response.json();

  const themeOptions = findThemeSettings(settings);
  if (!themeOptions) return [];

  return themeOptions
    .filter((opt) => opt.presetValues)
    .map((opt) => ({
      id: opt.id,
      title: opt.title,
      colors: {
        primary: opt.presetValues!.uiThemeColorPrimary,
        secondary: opt.presetValues!.uiThemeColorSecondary,
        backgroundPrimary: opt.presetValues!.uiThemeColorBackgroundPrimary,
        backgroundSecondary: opt.presetValues!.uiThemeColorBackgroundSecondary,
        textPrimary: opt.presetValues!.uiThemeColorTextPrimary,
        textSecondary: opt.presetValues!.uiThemeColorTextSecondary,
        textDisabled: opt.presetValues!.uiThemeColorTextDisabled,
      },
    }));
}

export function themeToCssVars(theme: Theme): string {
  return [
    `--jr-primary: #${theme.colors.primary}`,
    `--jr-secondary: #${theme.colors.secondary}`,
    `--jr-bg-primary: #${theme.colors.backgroundPrimary}`,
    `--jr-bg-secondary: #${theme.colors.backgroundSecondary}`,
    `--jr-text-primary: #${theme.colors.textPrimary}`,
    `--jr-text-secondary: #${theme.colors.textSecondary}`,
    `--jr-text-disabled: #${theme.colors.textDisabled}`,
  ].join('; ');
}
