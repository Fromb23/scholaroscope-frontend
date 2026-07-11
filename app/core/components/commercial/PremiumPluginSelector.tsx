import { CheckCircle2, PlugZap } from 'lucide-react';

import type { CommercialPremiumPlugin } from '@/app/core/types/commercialCatalog';
import { formatMoney } from '@/app/core/lib/money';

interface PremiumPluginSelectorProps {
  plugins: CommercialPremiumPlugin[];
  selectedIds: number[];
  onToggle: (priceId: number) => void;
  disabled?: boolean;
}

export function PremiumPluginSelector({
  plugins,
  selectedIds,
  onToggle,
  disabled = false,
}: PremiumPluginSelectorProps) {
  if (plugins.length === 0) {
    return (
      <div className="rounded-md border border-dashed theme-border p-4 text-sm theme-muted">
        Premium options are not currently available for this workspace type.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {plugins.map((plugin) => {
        const checked = selectedIds.includes(plugin.price_id);
        return (
          <label
            key={plugin.price_id}
            className={`flex cursor-pointer gap-4 rounded-lg border p-5 transition ${
              checked ? 'theme-brand-selected' : 'theme-border theme-hover-surface theme-text'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(plugin.price_id)}
            />
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border ${
                checked ? 'theme-button-primary' : 'theme-border theme-surface'
              }`}
            >
              {checked ? <CheckCircle2 className="h-4 w-4" /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <PlugZap className="h-4 w-4 text-[color:var(--color-primary)]" />
                  {plugin.plugin_name}
                </p>
                <p className="whitespace-nowrap text-sm font-semibold">
                  {formatMoney(plugin.price, plugin.currency)}
                </p>
              </div>
              <p className="theme-muted mt-2 text-sm leading-6">{plugin.plugin_description}</p>
              {plugin.capabilities.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {plugin.capabilities.slice(0, 4).map((capability) => (
                    <span
                      key={capability.key}
                      className="rounded-full px-2 py-1 text-xs font-medium theme-card-muted theme-muted"
                    >
                      {capability.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </label>
        );
      })}
    </div>
  );
}
