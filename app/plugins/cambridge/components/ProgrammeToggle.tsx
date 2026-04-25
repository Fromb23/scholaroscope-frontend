// ============================================================================
// app/plugins/cambridge/components/ProgrammeToggle.tsx
//
// Toggle between Cambridge programmes (Primary, Lower Secondary, etc.)
// ============================================================================

'use client';

import type { CambridgeProgramme } from '../types';

interface ProgrammeToggleProps {
  selected: CambridgeProgramme | null;
  onSelect: (programme: CambridgeProgramme) => void;
  options?: CambridgeProgramme[];
}

const DEFAULT_PROGRAMMES: CambridgeProgramme[] = [
  'PRIMARY',
  'LOWER_SECONDARY',
  'UPPER_SECONDARY',
  'ADVANCED',
];

export function ProgrammeToggle({ selected, onSelect, options = DEFAULT_PROGRAMMES }: ProgrammeToggleProps) {
  return (
    <div>
      {/* TODO: UI implementation */}
      {options.map((p) => (
        <button key={p} onClick={() => onSelect(p)} disabled={selected === p}>
          {p}
        </button>
      ))}
    </div>
  );
}
