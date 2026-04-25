// ============================================================================
// app/plugins/cambridge/components/SubjectBrowserList.tsx
//
// Browseable list of Cambridge subjects with filtering.
// ============================================================================

'use client';

import type { CambridgeSubject, CambridgeProgramme, CambridgeLevel } from '../types';

interface SubjectBrowserListProps {
  subjects: CambridgeSubject[];
  filterProgramme?: CambridgeProgramme;
  filterLevel?: CambridgeLevel;
  onSelect: (subject: CambridgeSubject) => void;
}

export function SubjectBrowserList({
  subjects,
  filterProgramme,
  filterLevel,
  onSelect,
}: SubjectBrowserListProps) {
  const filtered = subjects.filter((s) => {
    if (filterProgramme && s.programme !== filterProgramme) return false;
    if (filterLevel && s.level !== filterLevel) return false;
    return true;
  });

  return (
    <div>
      {/* TODO: UI implementation */}
      <p>{filtered.length} subjects</p>
      <ul>
        {filtered.map((subject) => (
          <li key={subject.id}>
            <button onClick={() => onSelect(subject)}>
              {subject.code} — {subject.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
