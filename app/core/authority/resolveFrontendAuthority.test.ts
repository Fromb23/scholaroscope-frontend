import { describe, expect, it } from 'vitest';

import { resolveFrontendAuthority } from './resolveFrontendAuthority';
import type { WorkspaceCapabilities } from '@/app/core/types/auth';

const capabilities = (permissionKeys: string[] = []): WorkspaceCapabilities => ({
  can_teach: false,
  can_manage_academic_setup: false,
  can_manage_learners: false,
  can_manage_cohorts: false,
  can_manage_subjects: false,
  can_manage_assessments: false,
  can_view_reports: false,
  can_manage_staff: false,
  is_workspace_owner: false,
  workspace_mode: 'INSTITUTION',
  workspace_behavior: 'INSTITUTION',
  product_capabilities: {
    cbc: {
      enabled: false,
      entitled: false,
      installed: false,
      source: 'PREMIUM',
    },
  },
  authorization: {
    enforced: true,
    permission_keys: permissionKeys,
    roles: [],
  },
});

describe('resolveFrontendAuthority', () => {
  it('uses backend action metadata when present', () => {
    const decision = resolveFrontendAuthority({
      backendAction: {
        allowed: false,
        action_mode: 'READ_ONLY',
        reason_code: 'lifecycle_action_blocked',
        message: 'Closed term',
      },
      capabilities: capabilities(['reports.compute']),
      permissionKey: 'reports.compute',
    });

    expect(decision.source).toBe('BACKEND_ACTION');
    expect(decision.enabled).toBe(false);
    expect(decision.actionMode).toBe('READ_ONLY');
    expect(decision.reasonCode).toBe('lifecycle_action_blocked');
  });

  it('does not let shell role absence or presence grant mutation by itself', () => {
    const decision = resolveFrontendAuthority({});

    expect(decision.source).toBe('FALLBACK_READ_ONLY');
    expect(decision.enabled).toBe(false);
    expect(decision.actionMode).toBe('READ_ONLY');
  });

  it('renders missing permissions as blocked', () => {
    const decision = resolveFrontendAuthority({
      capabilities: capabilities([]),
      permissionKey: 'reports.compute',
    });

    expect(decision.enabled).toBe(false);
    expect(decision.actionMode).toBe('BLOCKED');
    expect(decision.reasonCode).toBe('permission_denied');
  });

  it('renders missing product capability as not applicable before permission fallback', () => {
    const decision = resolveFrontendAuthority({
      capabilities: capabilities(['reports.compute']),
      permissionKey: 'reports.compute',
      productCapabilityKey: 'cbc',
    });

    expect(decision.enabled).toBe(false);
    expect(decision.actionMode).toBe('NOT_APPLICABLE');
    expect(decision.reasonCode).toBe('product_entitlement_required');
  });

  it('renders lifecycle blocked actions as read-only', () => {
    const decision = resolveFrontendAuthority({
      capabilities: capabilities(['lessons.prepare']),
      permissionKey: 'lessons.prepare',
      lifecycle: {
        mode: 'HISTORICAL',
        action_mode: 'READ_ONLY',
        allows_mutation: false,
      },
    });

    expect(decision.enabled).toBe(false);
    expect(decision.actionMode).toBe('READ_ONLY');
    expect(decision.reasonCode).toBe('lifecycle_action_blocked');
  });
});
