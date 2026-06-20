import { apiClient } from '@/app/core/api/client';
import type {
  EffectiveThemeResponse,
  OrganizationThemePayload,
  OrganizationThemeResponse,
  UserThemePreferencePayload,
  UserThemePreferenceResponse,
} from '@/app/core/types/theme';

export const themeAPI = {
  async getEffectiveTheme(): Promise<EffectiveThemeResponse> {
    const response = await apiClient.get<EffectiveThemeResponse>('/users/theme/effective/');
    return response.data;
  },

  async updateOrganizationTheme(payload: OrganizationThemePayload): Promise<OrganizationThemeResponse> {
    const response = await apiClient.patch<OrganizationThemeResponse>('/users/theme/organization/', payload);
    return response.data;
  },

  async resetOrganizationTheme(): Promise<EffectiveThemeResponse> {
    const response = await apiClient.patch<EffectiveThemeResponse>('/users/theme/organization/', {
      reset: true,
    });
    return response.data;
  },

  async updateMyThemePreference(
    payload: UserThemePreferencePayload,
  ): Promise<UserThemePreferenceResponse> {
    const response = await apiClient.patch<UserThemePreferenceResponse>('/users/theme/me/', payload);
    return response.data;
  },
};
