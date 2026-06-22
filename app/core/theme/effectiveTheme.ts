import type { ResolvedTheme, ScholaroscopeThemeMode, ThemeMode } from '@/app/context/ThemeContext';
import type { ActiveOrg, Role, User, WorkspaceCapabilities } from '@/app/core/types/auth';
import type { AppearanceMode, EffectiveThemeResponse, ThemeTokens } from '@/app/core/types/theme';

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  primary: '#2563EB',
  primaryForeground: '#FFFFFF',
  secondary: '#0F172A',
  secondaryForeground: '#FFFFFF',
  accent: '#16A34A',
  accentForeground: '#FFFFFF',
  ring: '#2563EB',
  muted: '#F8FAFC',
  brandPrimary: '#2563EB',
  brandPrimaryForeground: '#FFFFFF',
  brandSecondary: '#0F172A',
  brandSecondaryForeground: '#FFFFFF',
  brandAccent: '#16A34A',
  brandAccentForeground: '#FFFFFF',
  brandRing: '#2563EB',
  appBackground: '#F2F6FE',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF3FD',
  surfaceElevated: '#FFFFFF',
  cardBackground: '#FFFFFF',
  sidebarBackground: '#F5F6F6',
  headerBackground: '#FFFFFF',
  dropdownBackground: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#475569',
  textSubtle: '#64748B',
  textInverse: '#FFFFFF',
  link: '#2563EB',
  linkHover: '#1F53C5',
  border: '#CFDDFB',
  borderStrong: '#ACC4F7',
  inputBorder: '#CFDDFB',
  inputFocusBorder: '#2563EB',
  info: '#2563EB',
  infoSoft: '#E0E9FC',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  hoverSurface: '#E9EFFD',
  selectedSurface: '#DCE6FC',
  activeSurface: '#CFDDFB',
  focusRing: '#2563EB',
  focusRingSoft: '#CFDDFB',
  buttonPrimary: '#2563EB',
  buttonPrimaryHover: '#1F53C5',
  buttonPrimaryForeground: '#FFFFFF',
  buttonSecondary: '#EEF3FD',
  buttonSecondaryHover: '#E9EFFD',
  badgeDefault: '#EEF3FD',
  badgeDefaultForeground: '#0F172A',
  tableHeaderBackground: '#EEF3FD',
  tableRowHover: '#E9EFFD',
  tableLink: '#2563EB',
  iconDefault: '#475569',
  iconMuted: '#64748B',
  iconEmphasis: '#2563EB',
};

export const SCHOLAROSCOPE_DARK_TOKENS: ThemeTokens = {
  primary: '#3B82F6',
  primaryForeground: '#EFF6FF',
  secondary: '#94A3B8',
  secondaryForeground: '#020617',
  accent: '#22C55E',
  accentForeground: '#04130A',
  ring: '#3B82F6',
  muted: '#111827',
  brandPrimary: '#3B82F6',
  brandPrimaryForeground: '#EFF6FF',
  brandSecondary: '#94A3B8',
  brandSecondaryForeground: '#020617',
  brandAccent: '#22C55E',
  brandAccentForeground: '#04130A',
  brandRing: '#3B82F6',
  appBackground: '#050812',
  surface: '#0B1220',
  surfaceMuted: '#111827',
  surfaceElevated: '#101827',
  cardBackground: '#0B1220',
  sidebarBackground: '#07111F',
  headerBackground: '#070B14',
  dropdownBackground: '#0B1220',
  text: '#E5E7EB',
  textMuted: '#CBD5E1',
  textSubtle: '#94A3B8',
  textInverse: '#020617',
  link: '#93C5FD',
  linkHover: '#BFDBFE',
  border: '#1E293B',
  borderStrong: '#334155',
  inputBorder: '#243044',
  inputFocusBorder: '#3B82F6',
  info: '#60A5FA',
  infoSoft: '#0F274A',
  success: '#4ADE80',
  successSoft: '#102A1C',
  warning: '#FBBF24',
  warningSoft: '#2F2208',
  danger: '#F87171',
  dangerSoft: '#321212',
  hoverSurface: '#111827',
  selectedSurface: '#10213A',
  activeSurface: '#143052',
  focusRing: '#60A5FA',
  focusRingSoft: '#10213A',
  buttonPrimary: '#2563EB',
  buttonPrimaryHover: '#1D4ED8',
  buttonPrimaryForeground: '#FFFFFF',
  buttonSecondary: '#111827',
  buttonSecondaryHover: '#172033',
  badgeDefault: '#111827',
  badgeDefaultForeground: '#E5E7EB',
  tableHeaderBackground: '#111827',
  tableRowHover: '#111827',
  tableLink: '#93C5FD',
  iconDefault: '#CBD5E1',
  iconMuted: '#94A3B8',
  iconEmphasis: '#93C5FD',
};

export const DEFAULT_EFFECTIVE_THEME: EffectiveThemeResponse = {
  organization: null,
  source: 'default',
  appearance_mode: 'LIGHT',
  tokens: DEFAULT_THEME_TOKENS,
  logo_url: '',
  favicon_url: '',
  sidebar_style: '',
  button_radius: 8,
  is_customized: false,
};

export interface ThemeStyleTarget {
  style: {
    setProperty: (name: string, value: string) => void;
  };
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

type ThemeModeInput = ScholaroscopeThemeMode | ResolvedTheme;

function normalizeHex(value: string | undefined, fallback: string): string {
  if (!value || !HEX_RE.test(value)) {
    return fallback;
  }
  return value.toUpperCase();
}

function normalizeTokenHex(
  tokens: Partial<ThemeTokens>,
  key: keyof ThemeTokens,
  fallback: string,
): string {
  return normalizeHex(tokens[key], fallback);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.slice(1);
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

export function mixHex(color: string, mixColor: string, amount: number): string {
  const safeColor = normalizeHex(color, DEFAULT_THEME_TOKENS.primary);
  const safeMix = normalizeHex(mixColor, '#FFFFFF');
  const [red, green, blue] = hexToRgb(safeColor);
  const [mixRed, mixGreen, mixBlue] = hexToRgb(safeMix);
  const ratio = Math.min(Math.max(amount, 0), 1);

  return rgbToHex(
    red * (1 - ratio) + mixRed * ratio,
    green * (1 - ratio) + mixGreen * ratio,
    blue * (1 - ratio) + mixBlue * ratio,
  );
}

function coerceThemeMode(themeMode: ThemeModeInput = 'DEFAULT'): ScholaroscopeThemeMode {
  switch (themeMode) {
    case 'DARK':
    case 'dark':
      return 'DARK';
    case 'CUSTOM':
      return 'CUSTOM';
    case 'DEFAULT':
    case 'light':
    default:
      return 'DEFAULT';
  }
}

function deriveCustomThemeTokens(inputTokens: Partial<ThemeTokens>): ThemeTokens {
  const primary = normalizeTokenHex(inputTokens, 'primary', DEFAULT_THEME_TOKENS.primary);
  const primaryForeground = normalizeTokenHex(inputTokens, 'primaryForeground', DEFAULT_THEME_TOKENS.primaryForeground);
  const secondary = normalizeTokenHex(inputTokens, 'secondary', DEFAULT_THEME_TOKENS.secondary);
  const secondaryForeground = normalizeTokenHex(inputTokens, 'secondaryForeground', DEFAULT_THEME_TOKENS.secondaryForeground);
  const accent = normalizeTokenHex(inputTokens, 'accent', DEFAULT_THEME_TOKENS.accent);
  const accentForeground = normalizeTokenHex(inputTokens, 'accentForeground', DEFAULT_THEME_TOKENS.accentForeground);
  const ring = normalizeTokenHex(inputTokens, 'ring', primary);
  const muted = normalizeTokenHex(inputTokens, 'muted', DEFAULT_THEME_TOKENS.muted);

  return {
    ...DEFAULT_THEME_TOKENS,
    primary,
    primaryForeground,
    secondary,
    secondaryForeground,
    accent,
    accentForeground,
    ring,
    muted,
    brandPrimary: primary,
    brandPrimaryForeground: primaryForeground,
    brandSecondary: secondary,
    brandSecondaryForeground: secondaryForeground,
    brandAccent: accent,
    brandAccentForeground: accentForeground,
    brandRing: ring,
    appBackground: '#F6F8FC',
    surface: '#FFFFFF',
    surfaceMuted: '#F3F6FB',
    surfaceElevated: '#FFFFFF',
    cardBackground: '#FFFFFF',
    sidebarBackground: '#F8FAFC',
    headerBackground: '#FFFFFF',
    dropdownBackground: '#FFFFFF',
    border: '#D7E0EC',
    borderStrong: '#B8C5D6',
    inputBorder: '#D7E0EC',
    inputFocusBorder: ring,
    link: primary,
    linkHover: mixHex(primary, '#000000', 0.16),
    info: primary,
    infoSoft: mixHex(primary, '#FFFFFF', 0.90),
    hoverSurface: '#EEF3F9',
    selectedSurface: mixHex(primary, '#FFFFFF', 0.88),
    activeSurface: mixHex(primary, '#FFFFFF', 0.82),
    focusRing: ring,
    focusRingSoft: mixHex(ring, '#FFFFFF', 0.84),
    buttonPrimary: primary,
    buttonPrimaryHover: mixHex(primary, '#000000', 0.16),
    buttonPrimaryForeground: primaryForeground,
    buttonSecondary: '#F3F6FB',
    buttonSecondaryHover: '#EEF3F9',
    badgeDefault: '#F3F6FB',
    badgeDefaultForeground: '#0F172A',
    tableHeaderBackground: '#F3F6FB',
    tableRowHover: '#EEF3F9',
    tableLink: primary,
    iconEmphasis: primary,
  };
}

function deriveThemeTokens(
  inputTokens: Partial<ThemeTokens>,
  themeMode: ThemeModeInput = 'DEFAULT',
  useOrganizationBrand = false,
): ThemeTokens {
  const mode = coerceThemeMode(themeMode);

  if (mode === 'DARK') {
    return SCHOLAROSCOPE_DARK_TOKENS;
  }

  if (mode === 'CUSTOM' || useOrganizationBrand) {
    return deriveCustomThemeTokens(inputTokens);
  }

  return DEFAULT_THEME_TOKENS;
}

export function normalizeEffectiveTheme(
  theme?: Partial<EffectiveThemeResponse> | null,
  themeMode: ThemeModeInput = 'DEFAULT',
): EffectiveThemeResponse {
  const mode = coerceThemeMode(themeMode);
  const tokens = theme?.tokens ?? DEFAULT_THEME_TOKENS;
  const useOrganizationBrand = mode !== 'DARK' && Boolean(theme?.is_customized);
  return {
    ...DEFAULT_EFFECTIVE_THEME,
    ...theme,
    appearance_mode: theme?.appearance_mode ?? themeModeToAppearanceMode(mode),
    tokens: deriveThemeTokens(tokens, mode, useOrganizationBrand),
    button_radius: Number.isFinite(theme?.button_radius)
      ? Math.min(Math.max(Number(theme?.button_radius), 0), 24)
      : DEFAULT_EFFECTIVE_THEME.button_radius,
  };
}

export function appearanceModeToThemeMode(mode: AppearanceMode): ThemeMode {
  switch (mode) {
    case 'DARK':
      return 'DARK';
    case 'LIGHT':
    case 'SYSTEM':
    default:
      return 'DEFAULT';
  }
}

export function themeModeToAppearanceMode(mode: ThemeMode): AppearanceMode {
  switch (mode) {
    case 'DARK':
      return 'DARK';
    case 'CUSTOM':
    case 'DEFAULT':
    default:
      return 'LIGHT';
  }
}

export function applyThemeTokens(
  theme: EffectiveThemeResponse = DEFAULT_EFFECTIVE_THEME,
  target?: ThemeStyleTarget,
  themeMode: ThemeModeInput = 'DEFAULT',
): EffectiveThemeResponse {
  const normalizedTheme = normalizeEffectiveTheme(theme, themeMode);
  const root = target ?? (
    typeof document !== 'undefined' ? document.documentElement : null
  );

  if (!root) {
    return normalizedTheme;
  }

  const { tokens } = normalizedTheme;
  root.style.setProperty('--color-app-bg', tokens.appBackground);
  root.style.setProperty('--color-surface', tokens.surface);
  root.style.setProperty('--color-surface-muted', tokens.surfaceMuted);
  root.style.setProperty('--color-surface-elevated', tokens.surfaceElevated);
  root.style.setProperty('--color-card', tokens.cardBackground);
  root.style.setProperty('--color-header', tokens.headerBackground);
  root.style.setProperty('--color-sidebar', tokens.sidebarBackground);
  root.style.setProperty('--color-dropdown', tokens.dropdownBackground);
  root.style.setProperty('--color-text', tokens.text);
  root.style.setProperty('--color-text-muted', tokens.textMuted);
  root.style.setProperty('--color-text-subtle', tokens.textSubtle);
  root.style.setProperty('--color-text-inverse', tokens.textInverse);
  root.style.setProperty('--color-border', tokens.border);
  root.style.setProperty('--color-border-strong', tokens.borderStrong);
  root.style.setProperty('--color-input-border', tokens.inputBorder);
  root.style.setProperty('--color-input-focus-border', tokens.inputFocusBorder);

  root.style.setProperty('--brand-primary', tokens.brandPrimary);
  root.style.setProperty('--brand-primary-foreground', tokens.brandPrimaryForeground);
  root.style.setProperty('--brand-secondary', tokens.brandSecondary);
  root.style.setProperty('--brand-secondary-foreground', tokens.brandSecondaryForeground);
  root.style.setProperty('--brand-accent', tokens.brandAccent);
  root.style.setProperty('--brand-accent-foreground', tokens.brandAccentForeground);
  root.style.setProperty('--brand-ring', tokens.brandRing);
  root.style.setProperty('--brand-muted', tokens.muted);
  root.style.setProperty('--brand-button-radius', `${normalizedTheme.button_radius}px`);

  root.style.setProperty('--color-primary', tokens.buttonPrimary);
  root.style.setProperty('--color-primary-hover', tokens.buttonPrimaryHover);
  root.style.setProperty('--color-primary-soft', tokens.infoSoft);
  root.style.setProperty('--color-primary-contrast', tokens.buttonPrimaryForeground);
  root.style.setProperty('--color-link', tokens.link);
  root.style.setProperty('--color-link-hover', tokens.linkHover);
  root.style.setProperty('--color-focus-ring', tokens.focusRing);
  root.style.setProperty('--color-selected-surface', tokens.selectedSurface);
  root.style.setProperty('--color-hover-surface', tokens.hoverSurface);
  root.style.setProperty('--color-info', tokens.info);
  root.style.setProperty('--color-info-soft', tokens.infoSoft);
  root.style.setProperty('--color-success', tokens.success);
  root.style.setProperty('--color-success-soft', tokens.successSoft);
  root.style.setProperty('--color-warning', tokens.warning);
  root.style.setProperty('--color-warning-soft', tokens.warningSoft);
  root.style.setProperty('--color-danger', tokens.danger);
  root.style.setProperty('--color-danger-soft', tokens.dangerSoft);
  root.style.setProperty('--color-table-header', tokens.tableHeaderBackground);
  root.style.setProperty('--color-table-row-hover', tokens.tableRowHover);
  root.style.setProperty('--color-table-link', tokens.tableLink);
  root.style.setProperty('--color-icon', tokens.iconDefault);
  root.style.setProperty('--color-icon-muted', tokens.iconMuted);
  root.style.setProperty('--color-icon-emphasis', tokens.iconEmphasis);

  return normalizedTheme;
}

export function canEditOrganizationTheme({
  activeOrg,
  activeRole,
  user,
}: {
  activeOrg: ActiveOrg | null;
  activeRole: Role | null;
  capabilities: WorkspaceCapabilities;
  user: User | null;
}): boolean {
  if (!activeOrg) {
    return false;
  }

  if (user?.is_superadmin) {
    return true;
  }

  return activeRole === 'ADMIN';
}

export function isFreelanceWorkspaceTheme(activeOrg?: ActiveOrg | null, capabilities?: WorkspaceCapabilities | null): boolean {
  return activeOrg?.org_type === 'PERSONAL' || capabilities?.workspace_behavior === 'FREELANCE_TEACHER';
}
