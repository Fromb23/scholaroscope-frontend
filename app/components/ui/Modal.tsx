'use client';

import { ReactNode } from 'react';
import { ResponsiveActionSheet } from '@/app/components/ui/actions';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  description?: string;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  closeDisabled?: boolean;
  panelClassName?: string;
  bodyClassName?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  description,
  footer,
  closeOnBackdrop = false,
  closeOnEscape = true,
  closeDisabled = false,
  panelClassName = '',
  bodyClassName = '',
}: ModalProps) {
  return (
    <ResponsiveActionSheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={description}
      footer={footer}
      size={size}
      closeDisabled={closeDisabled}
      preventBackdropClose={closeDisabled || !closeOnBackdrop}
      closeOnEscape={closeOnEscape}
      panelClassName={panelClassName}
      bodyClassName={bodyClassName}
    >
      {children}
    </ResponsiveActionSheet>
  );
}
