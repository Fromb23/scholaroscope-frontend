import { createElement, useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  WorkspaceGenerationBoundary,
  advanceWorkspaceGeneration,
  captureWorkspaceAuthority,
  getWorkspaceGeneration,
  isWorkspaceAuthorityCurrent,
  resetWorkspaceGenerationForTests,
} from '@/app/core/runtime/workspaceGeneration';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe('workspace generation runtime', () => {
  beforeEach(() => {
    resetWorkspaceGenerationForTests();
  });

  it('advances monotonically and invalidates an earlier authority capture', () => {
    const workspaceA = captureWorkspaceAuthority(101);

    expect(isWorkspaceAuthorityCurrent(workspaceA, 101)).toBe(true);

    const workspaceBGeneration = advanceWorkspaceGeneration('workspace-switch');

    expect(workspaceBGeneration).toBeGreaterThan(workspaceA.generation);
    expect(getWorkspaceGeneration()).toBe(workspaceBGeneration);
    expect(isWorkspaceAuthorityCurrent(workspaceA, 101)).toBe(false);
    expect(isWorkspaceAuthorityCurrent(workspaceA, 202)).toBe(false);
  });

  it('remounts workspace-bound manual state when the generation changes', async () => {
    function ManualRemoteStore() {
      const [value, setValue] = useState('empty');
      return createElement('workspace-state', { value, setValue });
    }

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        createElement(
          WorkspaceGenerationBoundary,
          null,
          createElement(ManualRemoteStore),
        ),
      );
    });

    const workspaceState = () => renderer!.root.find(
      (node) => String(node.type) === 'workspace-state',
    );
    const setRemoteValue = workspaceState().props.setValue as (value: string) => void;
    await act(async () => {
      setRemoteValue('workspace-a-session');
    });
    expect(workspaceState().props.value).toBe(
      'workspace-a-session',
    );

    await act(async () => {
      advanceWorkspaceGeneration('workspace-switch');
    });

    expect(workspaceState().props.value).toBe('empty');
    renderer!.unmount();
  });
});
