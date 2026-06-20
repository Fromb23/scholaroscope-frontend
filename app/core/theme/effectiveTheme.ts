import type { ThemeMode } from '@/app/context/ThemeContext';
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

export function normalizeEffectiveTheme(
  theme?: Partial<EffectiveThemeResponse> | null,
): EffectiveThemeResponse {
  const tokens = theme?.tokens ?? DEFAULT_THEME_TOKENS;
  return {
    ...DEFAULT_EFFECTIVE_THEME,
    ...theme,
    appearance_mode: theme?.appearance_mode ?? DEFAULT_EFFECTIVE_THEME.appearance_mode,
    tokens: {
      primary: normalizeHex(tokens.primary, DEFAULT_THEME_TOKENS.primary),
      primaryForeground: normalizeHex(tokens.primaryForeground, DEFAULT_THEME_TOKENS.primaryForeground),
      secondary: normalizeHex(tokens.secondary, DEFAULT_THEME_TOKENS.secondary),
      secondaryForeground: normalizeHex(tokens.secondaryForeground, DEFAULT_THEME_TOKENS.secondaryForeground),
      accent: normalizeHex(tokens.accent, DEFAULT_THEME_TOKENS.accent),
      accentForeground: normalizeHex(tokens.accentForeground, DEFAULT_THEME_TOKENS.accentForeground),
      ring: normalizeHex(tokens.ring, DEFAULT_THEME_TOKENS.ring),
      muted: normalizeHex(tokens.muted, DEFAULT_THEME_TOKENS.muted),
    },
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
): EffectiveThemeResponse {
  const resolvedTheme = normalizeEffectiveTheme(theme);
  const root = target ?? (
    typeof document !== 'undefined' ? document.documentElement : null
  );

  if (!root) {
    return resolvedTheme;
  }

  const { tokens } = resolvedTheme;
  root.style.setProperty('--brand-primary', tokens.primary);
  root.style.setProperty('--brand-primary-foreground', tokens.primaryForeground);
  root.style.setProperty('--brand-secondary', tokens.secondary);
  root.style.setProperty('--brand-secondary-foreground', tokens.secondaryForeground);
  root.style.setProperty('--brand-accent', tokens.accent);
  root.style.setProperty('--brand-accent-foreground', tokens.accentForeground);
  root.style.setProperty('--brand-ring', tokens.ring);
  root.style.setProperty('--brand-muted', tokens.muted);
  root.style.setProperty('--brand-button-radius', `${resolvedTheme.button_radius}px`);

  root.style.setProperty('--color-primary', tokens.primary);
  root.style.setProperty('--color-primary-hover', mixHex(tokens.primary, '#000000', 0.16));
  root.style.setProperty('--color-primary-soft', mixHex(tokens.primary, '#FFFFFF', 0.58));
  root.style.setProperty('--color-primary-contrast', tokens.primaryForeground);

  return resolvedTheme;
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
