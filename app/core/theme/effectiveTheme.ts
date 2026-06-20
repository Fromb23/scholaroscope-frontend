import type { ResolvedTheme, ThemeMode } from '@/app/context/ThemeContext';
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

export const DEFAULT_EFFECTIVE_THEME: EffectiveThemeResponse = {
  organization: null,
  source: 'default',
  appearance_mode: 'SYSTEM',
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

function deriveThemeTokens(
  inputTokens: Partial<ThemeTokens>,
  resolvedTheme: ResolvedTheme = 'light',
): ThemeTokens {
  const primary = normalizeTokenHex(inputTokens, 'primary', DEFAULT_THEME_TOKENS.primary);
  const primaryForeground = normalizeTokenHex(inputTokens, 'primaryForeground', DEFAULT_THEME_TOKENS.primaryForeground);
  const secondary = normalizeTokenHex(inputTokens, 'secondary', DEFAULT_THEME_TOKENS.secondary);
  const secondaryForeground = normalizeTokenHex(inputTokens, 'secondaryForeground', DEFAULT_THEME_TOKENS.secondaryForeground);
  const accent = normalizeTokenHex(inputTokens, 'accent', DEFAULT_THEME_TOKENS.accent);
  const accentForeground = normalizeTokenHex(inputTokens, 'accentForeground', DEFAULT_THEME_TOKENS.accentForeground);
  const ring = normalizeTokenHex(inputTokens, 'ring', primary);
  const muted = normalizeTokenHex(inputTokens, 'muted', DEFAULT_THEME_TOKENS.muted);
  const isDark = resolvedTheme === 'dark';

  const appBackground = isDark ? mixHex(secondary, '#000000', 0.78) : mixHex(primary, '#FFFFFF', 0.94);
  const surface = isDark ? mixHex(secondary, '#000000', 0.62) : '#FFFFFF';
  const surfaceMuted = isDark ? mixHex(primary, '#000000', 0.76) : mixHex(primary, '#FFFFFF', 0.92);
  const surfaceElevated = isDark ? mixHex(secondary, '#000000', 0.52) : '#FFFFFF';
  const border = isDark ? mixHex(primary, '#FFFFFF', 0.72) : mixHex(primary, '#FFFFFF', 0.78);
  const borderStrong = isDark ? mixHex(primary, '#FFFFFF', 0.58) : mixHex(primary, '#FFFFFF', 0.62);
  const text = isDark ? '#E5E7EB' : '#0F172A';
  const textMuted = isDark ? '#CBD5E1' : '#475569';
  const textSubtle = isDark ? '#94A3B8' : '#64748B';
  const hoverSurface = isDark ? mixHex(primary, '#000000', 0.66) : mixHex(primary, '#FFFFFF', 0.90);
  const selectedSurface = isDark ? mixHex(primary, '#000000', 0.54) : mixHex(primary, '#FFFFFF', 0.84);

  const derived: ThemeTokens = {
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
    appBackground,
    surface,
    surfaceMuted,
    surfaceElevated,
    cardBackground: surface,
    sidebarBackground: isDark ? mixHex(secondary, '#000000', 0.56) : mixHex(secondary, '#FFFFFF', 0.96),
    headerBackground: surface,
    dropdownBackground: surfaceElevated,
    text,
    textMuted,
    textSubtle,
    textInverse: primaryForeground,
    link: primary,
    linkHover: mixHex(primary, isDark ? '#FFFFFF' : '#000000', isDark ? 0.22 : 0.16),
    border,
    borderStrong,
    inputBorder: border,
    inputFocusBorder: ring,
    info: primary,
    infoSoft: isDark ? mixHex(primary, '#000000', 0.62) : mixHex(primary, '#FFFFFF', 0.86),
    success: '#16A34A',
    successSoft: isDark ? '#123322' : '#DCFCE7',
    warning: '#D97706',
    warningSoft: isDark ? '#3A2608' : '#FEF3C7',
    danger: '#DC2626',
    dangerSoft: isDark ? '#3B1212' : '#FEE2E2',
    hoverSurface,
    selectedSurface,
    activeSurface: isDark ? mixHex(primary, '#000000', 0.46) : mixHex(primary, '#FFFFFF', 0.78),
    focusRing: ring,
    focusRingSoft: isDark ? mixHex(ring, '#000000', 0.54) : mixHex(ring, '#FFFFFF', 0.78),
    buttonPrimary: primary,
    buttonPrimaryHover: mixHex(primary, isDark ? '#FFFFFF' : '#000000', isDark ? 0.18 : 0.16),
    buttonPrimaryForeground: primaryForeground,
    buttonSecondary: surfaceMuted,
    buttonSecondaryHover: hoverSurface,
    badgeDefault: surfaceMuted,
    badgeDefaultForeground: text,
    tableHeaderBackground: surfaceMuted,
    tableRowHover: hoverSurface,
    tableLink: primary,
    iconDefault: textMuted,
    iconMuted: textSubtle,
    iconEmphasis: primary,
  };

  return derived;
}

export function normalizeEffectiveTheme(
  theme?: Partial<EffectiveThemeResponse> | null,
  resolvedTheme: ResolvedTheme = 'light',
): EffectiveThemeResponse {
  const tokens = theme?.tokens ?? DEFAULT_THEME_TOKENS;
  return {
    ...DEFAULT_EFFECTIVE_THEME,
    ...theme,
    appearance_mode: theme?.appearance_mode ?? DEFAULT_EFFECTIVE_THEME.appearance_mode,
    tokens: deriveThemeTokens(tokens, resolvedTheme),
    button_radius: Number.isFinite(theme?.button_radius)
      ? Math.min(Math.max(Number(theme?.button_radius), 0), 24)
      : DEFAULT_EFFECTIVE_THEME.button_radius,
  };
}

export function appearanceModeToThemeMode(mode: AppearanceMode): ThemeMode {
  switch (mode) {
    case 'LIGHT':
      return 'light';
    case 'DARK':
      return 'dark';
    case 'SYSTEM':
    default:
      return 'system';
  }
}

export function themeModeToAppearanceMode(mode: ThemeMode): AppearanceMode {
  switch (mode) {
    case 'light':
      return 'LIGHT';
    case 'dark':
      return 'DARK';
    case 'system':
    default:
      return 'SYSTEM';
  }
}

export function applyThemeTokens(
  theme: EffectiveThemeResponse = DEFAULT_EFFECTIVE_THEME,
  target?: ThemeStyleTarget,
  resolvedTheme: ResolvedTheme = 'light',
): EffectiveThemeResponse {
  const normalizedTheme = normalizeEffectiveTheme(theme, resolvedTheme);
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

  root.style.setProperty('--brand-primary', tokens.primary);
  root.style.setProperty('--brand-primary-foreground', tokens.primaryForeground);
  root.style.setProperty('--brand-secondary', tokens.secondary);
  root.style.setProperty('--brand-secondary-foreground', tokens.secondaryForeground);
  root.style.setProperty('--brand-accent', tokens.accent);
  root.style.setProperty('--brand-accent-foreground', tokens.accentForeground);
  root.style.setProperty('--brand-ring', tokens.ring);
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
  capabilities,
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

  return activeRole === 'ADMIN' && capabilities.can_manage_academic_setup;
}

export function isFreelanceWorkspaceTheme(activeOrg?: ActiveOrg | null, capabilities?: WorkspaceCapabilities | null): boolean {
  return activeOrg?.org_type === 'PERSONAL' || capabilities?.workspace_behavior === 'FREELANCE_TEACHER';
}
