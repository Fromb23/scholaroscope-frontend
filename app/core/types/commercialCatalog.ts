import type { OrgType } from '@/app/core/types/auth';

export type CommercialMode = 'STANDARD' | 'PREMIUM';

export interface CommercialCapability {
  key: string;
  name: string;
  short_description: string;
  category: string;
  icon_key?: string;
  source_type: 'CORE' | 'PLUGIN';
  plugin_key?: string | null;
}

export interface CommercialRateCard {
  mode: CommercialMode;
  name: string;
  summary: string;
  requires_premium_plugin: boolean;
}

export interface CommercialPremiumPlugin {
  price_id: number;
  plugin_id: number;
  plugin_key: string;
  plugin_name: string;
  plugin_description: string;
  currency: string;
  price: string;
  classification: 'PREMIUM';
  capabilities: CommercialCapability[];
}

export interface CommercialWorkspaceType {
  key: OrgType;
  name: string;
  description: string;
  is_publicly_selectable: boolean;
  premium_available: boolean;
  standard: {
    plan_id: number;
    plan_code: string;
    plan_name: string;
    plan_version: number;
    currency: string;
    price: string;
    capabilities: CommercialCapability[];
  };
  premium_plugins: CommercialPremiumPlugin[];
}

export interface CommercialCatalog {
  billing_period: {
    unit: 'CALENDAR_MONTH';
    count: number;
    description: string;
  };
  rate_cards: CommercialRateCard[];
  workspace_types: CommercialWorkspaceType[];
}

export interface CommercialQuoteRequest {
  commercial_mode: CommercialMode;
  workspace_type: OrgType;
  premium_plugin_price_ids: number[];
}

export interface CommercialQuote {
  token: string;
  expires_at: string;
  status: 'OPEN' | 'CONSUMED' | 'EXPIRED' | 'CANCELLED';
  commercial_mode: CommercialMode;
  workspace_type: OrgType;
  plan: {
    id: number;
    code: string;
    name: string;
    version: number;
  };
  starts_on: string;
  ends_on: string;
  currency: string;
  base_price: string;
  premium_total: string;
  total: string;
  selected_premium_plugins: CommercialPremiumPlugin[];
  included_standard_capabilities: CommercialCapability[];
  selected_premium_capabilities: CommercialCapability[];
  available_next_step: string;
}
