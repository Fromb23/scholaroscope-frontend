'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';

import type { CommercialCapability } from '@/app/core/types/commercialCatalog';

interface CapabilityListProps {
  capabilities: CommercialCapability[];
}

export function CapabilityList({ capabilities }: CapabilityListProps) {
  const [expanded, setExpanded] = useState(false);
  const groupedCapabilities = useMemo(() => {
    const groups = new Map<string, CommercialCapability[]>();
    capabilities.forEach((capability) => {
      const category = capability.category || 'Core';
      groups.set(category, [...(groups.get(category) ?? []), capability]);
    });
    return Array.from(groups.entries());
  }, [capabilities]);

  if (capabilities.length === 0) {
    return <p className="theme-subtle text-sm">No public capability copy is available for this selection yet.</p>;
  }

  const visibleGroups = expanded ? groupedCapabilities : groupedCapabilities.slice(0, 3);
  const hiddenCount = capabilities.length - visibleGroups.reduce((total, [, items]) => total + items.length, 0);

  return (
    <div className="space-y-4">
      {visibleGroups.map(([category, items]) => (
        <div key={category} className="rounded-lg bg-[color:var(--color-surface-muted)]/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">{category}</p>
          <div className="mt-3 divide-y theme-border">
            {items.map((capability) => (
              <div key={capability.key} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium theme-text">{capability.name}</p>
                  <p className="theme-subtle text-xs leading-5">{capability.short_description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold theme-border theme-text theme-hover-surface"
        >
          Explore all included capabilities ({hiddenCount} more)
          <ChevronDown className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
