// ============================================================================
// app/plugins/cambridge/components/RenameSubjectModal.tsx
//
// Modal for renaming a Cambridge subject.
// ============================================================================

'use client';

import { useState } from 'react';
import type { CambridgeSubject, RenameSubjectData } from '../types';

interface RenameSubjectModalProps {
  subject: CambridgeSubject | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RenameSubjectData) => void;
  isLoading?: boolean;
}

export function RenameSubjectModal({ subject, isOpen, onClose, onConfirm, isLoading }: RenameSubjectModalProps) {
  const [name, setName] = useState(subject?.name ?? '');

  if (!isOpen || !subject) return null;

  return (
    <div>
      {/* TODO: UI implementation — use core Modal component */}
      <h2>Rename {subject.name}</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New subject name"
      />
      <button onClick={onClose} disabled={isLoading}>Cancel</button>
      <button onClick={() => onConfirm({ name })} disabled={isLoading || !name.trim()}>
        {isLoading ? 'Saving...' : 'Rename'}
      </button>
    </div>
  );
}
