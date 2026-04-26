// ============================================================================
// app/plugins/cambridge/components/RenameSubjectModal.tsx
//
// Modal for renaming a Cambridge subject.
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import type {
  CambridgeInstallationSubject,
  CambridgeRenameSubjectPayload,
} from '../types';

interface RenameSubjectModalProps {
  subject: CambridgeInstallationSubject | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CambridgeRenameSubjectPayload) => void;
  isLoading?: boolean;
}

export function RenameSubjectModal({ subject, isOpen, onClose, onConfirm, isLoading }: RenameSubjectModalProps) {
  const [name, setName] = useState(subject?.local_display_name ?? subject?.display_name ?? '');

  useEffect(() => {
    setName(subject?.local_display_name ?? subject?.display_name ?? '');
  }, [subject]);

  if (!isOpen || !subject) return null;

  return (
    <Modal title={`Rename ${subject.display_name}`} isOpen={isOpen} onClose={onClose} size="sm">
      <div className="space-y-4">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          label="Local display name"
          placeholder="Enter local display name"
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm({ local_display_name: name.trim() })}
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
