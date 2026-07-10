import type { OrgType } from '@/app/core/types/auth';

export type SubscriptionPeriodStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string;
  workspace_type: OrgType;
  currency: string;
  standard_term_price: string;
  version: number;
  is_active: boolean;
  created_by: number | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanPremiumPluginPrice {
  id: number;
  plan: number;
  plan_code: string;
  plan_version: number;
  plugin: number;
  plugin_key: string;
  plugin_name: string;
  term_price: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSubscriptionPluginItem {
  id: number;
  plugin: number;
  plugin_key_snapshot: string;
  plugin_name_snapshot: string;
  price_snapshot: string;
  created_at: string;
}

export interface WorkspaceSubscriptionPeriod {
  id: number;
  organization: number;
  organization_name: string;
  plan: number;
  status: SubscriptionPeriodStatus;
  starts_on: string;
  ends_on: string;
  plan_code_snapshot: string;
  plan_name_snapshot: string;
  plan_version_snapshot: number;
  workspace_type_snapshot: OrgType;
  currency_snapshot: string;
  base_price_snapshot: string;
  premium_total_snapshot: string;
  total_price_snapshot: string;
  notes: string;
  created_by: number | null;
  activated_by: number | null;
  activated_at: string | null;
  cancelled_by: number | null;
  cancelled_at: string | null;
  plugin_items: WorkspaceSubscriptionPluginItem[];
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPeriodPayload {
  organization_id?: number;
  plan_id?: number;
  starts_on?: string;
  premium_plugin_price_ids?: number[];
  notes?: string;
}

export interface SerializedSubscriptionPeriod {
  id: number;
  status: SubscriptionPeriodStatus;
  plan_code: string;
  plan_name: string;
  plan_version: number;
  workspace_type: OrgType;
  currency: string;
  base_price: string;
  premium_total: string;
  total_price: string;
  starts_on: string;
  ends_on: string;
  last_covered_date: string;
  premium_plugin_items: Array<{
    id: number;
    plugin: number;
    plugin_key: string;
    plugin_name: string;
    price: string;
  }>;
}

export interface WorkspaceSubscriptionSummary {
  organization: number;
  term_gate_enabled: boolean;
  current_active_period: SerializedSubscriptionPeriod | null;
  next_scheduled_period: SerializedSubscriptionPeriod | null;
  renewal_required: boolean;
  standard_plan_snapshot: {
    code: string;
    name: string;
    version: number;
    workspace_type: OrgType;
  } | null;
  premium_plugin_items: SerializedSubscriptionPeriod['premium_plugin_items'];
  starts_on: string | null;
  ends_on: string | null;
  last_covered_date: string | null;
  currency: string | null;
  base_price: string;
  premium_total: string;
  total_price: string;
  term_creation_message: string;
}

export interface WorkspaceBillingProfile {
  id: number;
  organization: number;
  organization_name: string;
  term_gate_enabled: boolean;
  enabled_at: string | null;
  enabled_by: number | null;
  created_at: string;
  updated_at: string;
}

