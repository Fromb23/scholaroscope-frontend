'use client';

import { FormEvent, ReactNode } from 'react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';

interface CambridgeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel: string;
  submitting?: boolean;
  errorMessage?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

export function CambridgeFormModal({
  isOpen,
  onClose,
  title,
  description,
  submitLabel,
  submitting = false,
  errorMessage,
  size = 'md',
  onSubmit,
  children,
}: CambridgeFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form className="space-y-4" onSubmit={onSubmit}>
        {description ? <p className="text-sm text-gray-600">{description}</p> : null}
        {errorMessage ? <ErrorBanner message={errorMessage} onDismiss={onClose} /> : null}
        {children}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface CambridgeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'danger';
  confirming?: boolean;
  onConfirm: () => void;
}

export function CambridgeConfirmModal({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel,
  confirmVariant = 'danger',
  confirming = false,
  onConfirm,
}: CambridgeConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={confirming}>
            Cancel
          </Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={confirming}>
            {confirming ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
