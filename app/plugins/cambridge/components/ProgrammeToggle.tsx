// ============================================================================
// app/plugins/cambridge/components/ProgrammeToggle.tsx
//
// Toggle between Cambridge programmes (Primary, Lower Secondary, etc.)
// ============================================================================

'use client';

import type { CambridgeInstallationProgramme } from '../types';
import { Button } from '@/app/components/ui/Button';

interface ProgrammeToggleProps {
  programmes: CambridgeInstallationProgramme[];
  onToggle?: (programme: CambridgeInstallationProgramme) => void;
  disabled?: boolean;
  loadingProgrammeId?: number | null;
}

export function ProgrammeToggle({
  programmes,
  onToggle,
  disabled = false,
  loadingProgrammeId = null,
}: ProgrammeToggleProps) {
  return (
    <div className="space-y-3">
      {programmes.map((programme) => {
        const isLoading = loadingProgrammeId === programme.id;
        return (
          <div
            key={programme.id}
            className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="font-medium text-gray-900">{programme.title}</p>
              <p className="text-sm text-gray-500">
                {programme.code} · {programme.structure_mode} · {programme.display_stage_range || 'N/A'}
              </p>
            </div>
            {onToggle ? (
              <Button
                size="sm"
                variant={programme.enabled ? 'danger' : 'primary'}
                disabled={disabled || isLoading}
                onClick={() => onToggle(programme)}
              >
                {isLoading ? 'Saving...' : programme.enabled ? 'Disable' : 'Enable'}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
