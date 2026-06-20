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
