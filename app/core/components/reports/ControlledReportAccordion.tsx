'use client';

import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { Card } from '@/app/components/ui/Card';

export interface ControlledReportAccordionItem<T> {
  key: string;
  value: T;
  heading: ReactNode;
  summary: ReactNode;
}

export function ControlledReportAccordion<T>({
  items,
  expandedKey,
  onExpandedKeyChange,
  renderBody,
  ariaLabel,
}: {
  items: ControlledReportAccordionItem<T>[];
  expandedKey: string | null;
  onExpandedKeyChange: (key: string | null) => void;
  renderBody: (value: T) => ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="grid gap-3" aria-label={ariaLabel}>
      {items.map((item) => {
        const open = expandedKey === item.key;
        const panelId = `report-accordion-panel-${item.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        return (
          <Card key={item.key} className="overflow-hidden p-0">
            <button
              type="button"
              className="theme-focus-ring flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => onExpandedKeyChange(open ? null : item.key)}
            >
              <span className="flex min-w-0 items-center gap-3">
                {open
                  ? <ChevronDown className="h-5 w-5 shrink-0" />
                  : <ChevronRight className="h-5 w-5 shrink-0" />}
                <span className="min-w-0 font-semibold theme-text">{item.heading}</span>
              </span>
              <span className="min-w-0 text-sm theme-muted">{item.summary}</span>
            </button>
            {open ? (
              <div id={panelId} className="border-t theme-border p-4">
                {renderBody(item.value)}
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
