// ============================================================================
// app/plugins/cambridge/components/SubjectBrowserList.tsx
//
// Browseable list of Cambridge subjects with filtering.
// ============================================================================

'use client';

import type { CambridgeNormalizedSubject } from '../types';

interface SubjectBrowserListProps {
  subjects: CambridgeNormalizedSubject[];
  selectedId?: number | null;
  onSelect: (subject: CambridgeNormalizedSubject) => void;
}

export function SubjectBrowserList({ subjects, selectedId, onSelect }: SubjectBrowserListProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">{subjects.length} normalized subjects</p>
      <ul className="space-y-2">
        {subjects.map((subject) => (
          <li key={subject.id}>
            <button
              onClick={() => onSelect(subject)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                subject.id === selectedId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-gray-900">{subject.title}</div>
              <div className="text-xs text-gray-500">
                {subject.programme_code} · {subject.structure_mode} · {subject.learning_unit_count} units
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
