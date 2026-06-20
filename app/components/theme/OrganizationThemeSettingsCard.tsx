'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Building2, Check, Palette, RotateCcw, Save } from 'lucide-react';

import { themeAPI } from '@/app/core/api/theme';
import { Button } from '@/app/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { useAuth } from '@/app/context/AuthContext';
import { useEffectiveTheme } from '@/app/context/EffectiveThemeContext';
import {
  DEFAULT_THEME_TOKENS,
  canEditOrganizationTheme,
  isFreelanceWorkspaceTheme,
} from '@/app/core/theme/effectiveTheme';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';

type ThemeForm = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  favicon_url: string;
  sidebar_style: string;
  button_radius: number;
};

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function buildFormFromEffectiveTheme(theme: ReturnType<typeof useEffectiveTheme>['effectiveTheme']): ThemeForm {
  return {
    primary_color: theme.tokens.primary,
    secondary_color: theme.tokens.secondary,
    accent_color: theme.tokens.accent,
    logo_url: theme.logo_url ?? '',
    favicon_url: theme.favicon_url ?? '',
    sidebar_style: theme.sidebar_style ?? '',
    button_radius: theme.button_radius ?? 8,
  };
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium theme-text">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={HEX_COLOR_RE.test(value) ? value : DEFAULT_THEME_TOKENS.primary}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-12 shrink-0 rounded-lg border theme-border theme-surface p-1"
          aria-label={`${label} picker`}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#2563EB"
          maxLength={7}
          aria-label={label}
        />
      </div>
    </div>
  );
}

function ThemePreview({ form }: { form: ThemeForm }) {
  return (
    <div
      className="rounded-xl border theme-border theme-surface p-4"
      style={{
        '--preview-primary': form.primary_color,
        '--preview-secondary': form.secondary_color,
        '--preview-accent': form.accent_color,
        '--preview-radius': `${form.button_radius}px`,
      } as CSSProperties}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--preview-primary)] text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold theme-text">Workspace preview</p>
          <p className="text-xs theme-subtle">Brand tokens with current appearance mode</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border theme-border p-3">
          <h3 className="text-base font-semibold theme-text">Page heading</h3>
          <p className="mt-1 text-sm theme-muted">Accent blocks and controls use the organization colors.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 text-sm font-medium text-white"
            style={{
              backgroundColor: 'var(--preview-primary)',
              borderRadius: 'var(--preview-radius)',
            }}
          >
            Primary action
          </button>
          <span
            className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium"
            style={{
              borderColor: 'color-mix(in srgb, var(--preview-accent) 32%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--preview-accent) 12%, transparent)',
              color: 'var(--preview-accent)',
            }}
          >
            Active badge
          </span>
        </div>

        <div
          className="rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{
            backgroundColor: 'var(--preview-secondary)',
            borderRadius: 'var(--preview-radius)',
          }}
        >
          Sidebar active item
        </div>
      </div>
    </div>
  );
}

export function OrganizationThemeSettingsCard() {
  const { user, activeOrg, activeRole, capabilities } = useAuth();
  const { effectiveTheme, refetch } = useEffectiveTheme();
  const canEdit = canEditOrganizationTheme({ user, activeOrg, activeRole, capabilities });
  const isFreelance = isFreelanceWorkspaceTheme(activeOrg, capabilities);
  const title = isFreelance ? 'Freelance workspace theme' : 'Organization theme';
  const [form, setForm] = useState<ThemeForm>(() => buildFormFromEffectiveTheme(effectiveTheme));
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isCustomized = effectiveTheme.is_customized;
  const defaultSummary = useMemo(() => (
    `${DEFAULT_THEME_TOKENS.primary} / ${DEFAULT_THEME_TOKENS.accent}`
  ), []);

  useEffect(() => {
    setForm(buildFormFromEffectiveTheme(effectiveTheme));
  }, [effectiveTheme]);

  if (!canEdit) {
    return null;
  }

  const updateField = <K extends keyof ThemeForm>(key: K, value: ThemeForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await themeAPI.updateOrganizationTheme({
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        logo_url: form.logo_url,
        favicon_url: form.favicon_url,
        sidebar_style: form.sidebar_style,
        button_radius: form.button_radius,
      });
      await refetch();
      setFeedback({ type: 'success', message: 'Theme saved.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: extractErrorMessage(error as ApiError, 'Theme could not be saved.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setFeedback(null);
    try {
      await themeAPI.resetOrganizationTheme();
      await refetch();
      setFeedback({ type: 'success', message: 'Theme reset to Scholaroscope defaults.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: extractErrorMessage(error as ApiError, 'Theme could not be reset.'),
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="theme-brand-icon flex h-10 w-10 items-center justify-center rounded-xl">
          <Palette className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm theme-muted">
            Manage brand colors for {activeOrg?.name ?? 'this workspace'}.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {feedback && (
            <ErrorBanner
              variant={feedback.type === 'success' ? 'success' : 'error'}
              message={feedback.message}
              onDismiss={() => setFeedback(null)}
            />
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <ColorField
                  label="Primary color"
                  value={form.primary_color}
                  onChange={(value) => updateField('primary_color', value)}
                />
                <ColorField
                  label="Secondary color"
                  value={form.secondary_color}
                  onChange={(value) => updateField('secondary_color', value)}
                />
                <ColorField
                  label="Accent color"
                  value={form.accent_color}
                  onChange={(value) => updateField('accent_color', value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Logo URL"
                  value={form.logo_url}
                  onChange={(event) => updateField('logo_url', event.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <Input
                  label="Favicon URL"
                  value={form.favicon_url}
                  onChange={(event) => updateField('favicon_url', event.target.value)}
                  placeholder="https://example.com/favicon.ico"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium theme-text">Sidebar style</label>
                  <select
                    value={form.sidebar_style}
                    onChange={(event) => updateField('sidebar_style', event.target.value)}
                    className="theme-input w-full rounded-lg px-4 py-2"
                  >
                    <option value="">Default</option>
                    <option value="compact">Compact</option>
                    <option value="branded">Branded</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium theme-text">Button radius</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={form.button_radius}
                      onChange={(event) => updateField('button_radius', Number(event.target.value))}
                      className="theme-checkbox w-full"
                    />
                    <span className="w-12 text-right text-sm theme-muted">{form.button_radius}px</span>
                  </div>
                </div>
              </div>
            </div>

            <ThemePreview form={form} />
          </div>

          <div className="flex flex-col gap-3 border-t theme-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs theme-subtle">
              {isCustomized ? 'Custom theme active.' : `Using Scholaroscope defaults: ${defaultSummary}.`}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                onClick={handleReset}
                disabled={saving || resetting}
                className="w-full sm:w-auto"
              >
                {resetting ? (
                  <span className="inline-flex items-center gap-2">Resetting...</span>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </>
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || resetting}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">Saving...</span>
                ) : (
                  <>
                    {feedback?.type === 'success' ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    Save theme
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
