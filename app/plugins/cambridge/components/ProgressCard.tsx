// ============================================================================
// app/plugins/cambridge/components/ProgressCard.tsx
//
// Card displaying a student's or cohort's Cambridge progress summary.
// ============================================================================

'use client';

import type { CambridgeProgress, ClassProgressEntry } from '../types';

interface ProgressCardProps {
  progress: CambridgeProgress | ClassProgressEntry;
  variant?: 'student' | 'cohort';
}

export function ProgressCard({ progress, variant = 'student' }: ProgressCardProps) {
  const isStudent = variant === 'student';

  return (
    <div>
      {/* TODO: UI implementation */}
      <h3>{isStudent ? (progress as CambridgeProgress).student_name : (progress as ClassProgressEntry).student_name}</h3>
      <p>Overall: {progress.overall_percentage}%</p>
      {isStudent && (
        <p>Grade: {(progress as CambridgeProgress).grade ?? 'N/A'}</p>
      )}
    </div>
  );
}
