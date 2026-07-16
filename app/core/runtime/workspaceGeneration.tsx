'use client';

import { Fragment, type ReactNode, useSyncExternalStore } from 'react';

export type WorkspaceGenerationReason =
  | 'login'
  | 'registration'
  | 'verification'
  | 'session-restoration'
  | 'workspace-switch'
  | 'workspace-restore'
  | 'context-replacement'
  | 'logout'
  | 'session-invalidation';

export type WorkspaceAuthorityCapture = Readonly<{
  generation: number;
  organizationId: number | null;
}>;

let workspaceGeneration = 0;
const listeners = new Set<() => void>();

export class WorkspaceGenerationSupersededError extends Error {
  constructor() {
    super('The request belongs to an earlier workspace or authentication generation.');
    this.name = 'WorkspaceGenerationSupersededError';
  }
}

export function getWorkspaceGeneration(): number {
  return workspaceGeneration;
}

export function advanceWorkspaceGeneration(_reason: WorkspaceGenerationReason): number {
  void _reason;
  workspaceGeneration += 1;
  listeners.forEach((listener) => listener());
  return workspaceGeneration;
}

export function subscribeWorkspaceGeneration(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function captureWorkspaceAuthority(
  organizationId: number | null = null,
): WorkspaceAuthorityCapture {
  return {
    generation: getWorkspaceGeneration(),
    organizationId,
  };
}

export function isWorkspaceAuthorityCurrent(
  capture: WorkspaceAuthorityCapture,
  organizationId: number | null = capture.organizationId,
): boolean {
  return (
    capture.generation === getWorkspaceGeneration()
    && capture.organizationId === organizationId
  );
}

export function assertWorkspaceGeneration(generation: number): void {
  if (generation !== getWorkspaceGeneration()) {
    throw new WorkspaceGenerationSupersededError();
  }
}

export function isWorkspaceGenerationSupersededError(
  error: unknown,
): error is WorkspaceGenerationSupersededError {
  return error instanceof WorkspaceGenerationSupersededError;
}

export function useWorkspaceGeneration(): number {
  return useSyncExternalStore(
    subscribeWorkspaceGeneration,
    getWorkspaceGeneration,
    getWorkspaceGeneration,
  );
}

export function WorkspaceGenerationBoundary({ children }: { children: ReactNode }) {
  const generation = useWorkspaceGeneration();
  return <Fragment key={generation}>{children}</Fragment>;
}

export function resetWorkspaceGenerationForTests(): void {
  workspaceGeneration = 0;
  listeners.forEach((listener) => listener());
}
