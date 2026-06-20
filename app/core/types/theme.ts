import type { OrgType } from '@/app/core/types/auth';

export type AppearanceMode = 'LIGHT' | 'DARK' | 'SYSTEM';
export type EffectiveThemeSource = 'organization' | 'user' | 'default';

export interface EffectiveThemeOrganization {
  id: number;
  name: string;
  org_type: OrgType;
}

export interface ThemeTokens {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  ring: string;
  muted: string;
  brandPrimary: string;
  brandPrimaryForeground: string;
  brandSecondary: string;
  brandSecondaryForeground: string;
  brandAccent: string;
  brandAccentForeground: string;
  brandRing: string;
  appBackground: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  cardBackground: string;
  sidebarBackground: string;
  headerBackground: string;
  dropdownBackground: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  link: string;
  linkHover: string;
  border: string;
  borderStrong: string;
  inputBorder: string;
  inputFocusBorder: string;
  info: string;
  infoSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  hoverSurface: string;
  selectedSurface: string;
  activeSurface: string;
  focusRing: string;
  focusRingSoft: string;
  buttonPrimary: string;
  buttonPrimaryHover: string;
  buttonPrimaryForeground: string;
  buttonSecondary: string;
  buttonSecondaryHover: string;
  badgeDefault: string;
  badgeDefaultForeground: string;
  tableHeaderBackground: string;
  tableRowHover: string;
  tableLink: string;
  iconDefault: string;
  iconMuted: string;
  iconEmphasis: string;
}

export interface EffectiveThemeResponse {
  organization: EffectiveThemeOrganization | null;
  source: EffectiveThemeSource;
  appearance_mode: AppearanceMode;
  tokens: ThemeTokens;
  logo_url: string;
  favicon_url: string;
  sidebar_style: string;
  button_radius: number;
  is_customized: boolean;
}

export interface OrganizationThemePayload {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
  favicon_url?: string;
  sidebar_style?: string;
  button_radius?: number;
}

export interface OrganizationThemeResponse extends OrganizationThemePayload {
  id: number;
  organization: number;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  primary_foreground_color: string;
  secondary_foreground_color: string;
  accent_foreground_color: string;
  is_active: boolean;
  tokens: ThemeTokens;
}

export interface UserThemePreferencePayload {
  appearance_mode?: AppearanceMode;
  compact_mode?: boolean;
  preferred_accent_color?: string;
}

export interface UserThemePreferenceResponse extends UserThemePreferencePayload {
  id: number;
  appearance_mode: AppearanceMode;
  compact_mode: boolean;
  preferred_accent_color: string;
}
