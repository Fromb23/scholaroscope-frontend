// ============================================================================
// app/plugins/cambridge/components/ContentAreaList.tsx
//
// List of content areas for a Cambridge subject.
// ============================================================================

'use client';

import type { CambridgeNormalizedSubject } from '../types';

interface ContentAreaListProps {
  subjects: CambridgeNormalizedSubject[];
  onSelect?: (subject: CambridgeNormalizedSubject) => void;
}

export function ContentAreaList({ subjects, onSelect }: ContentAreaListProps) {
  return (
    <div>
      <ul className="space-y-2">
        {subjects.map((subject) => (
          <li key={subject.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{subject.title}</p>
                <p className="text-xs text-gray-500">
                  {subject.programme_code} · {subject.structure_mode}
                </p>
              </div>
              {onSelect ? (
                <button className="text-blue-600 text-sm" onClick={() => onSelect(subject)}>
                  Open
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
