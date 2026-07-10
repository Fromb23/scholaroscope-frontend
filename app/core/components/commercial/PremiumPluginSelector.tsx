import { PlugZap } from 'lucide-react';

import type { CommercialPremiumPlugin } from '@/app/core/types/commercialCatalog';

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
    <div className="grid gap-3 md:grid-cols-2">
      {plugins.map((plugin) => {
        const checked = selectedIds.includes(plugin.price_id);
        return (
          <label
            key={plugin.price_id}
            className={`flex cursor-pointer gap-3 rounded-md border p-4 transition ${
              checked ? 'border-blue-500 bg-blue-500/10' : 'theme-border theme-hover-surface'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(plugin.price_id)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold theme-text">
                  <PlugZap className="h-4 w-4 text-blue-500" />
                  {plugin.plugin_name}
                </p>
                <p className="text-sm font-semibold theme-text">
                  {plugin.currency} {plugin.price}
                </p>
              </div>
              <p className="theme-muted mt-1 text-xs">{plugin.plugin_description}</p>
              {plugin.capabilities.length > 0 ? (
                <p className="theme-subtle mt-2 text-xs">
                  {plugin.capabilities.map((capability) => capability.name).join(', ')}
                </p>
              ) : null}
            </div>
          </label>
        );
      })}
    </div>
  );
}
