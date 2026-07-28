import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommercialRateCards } from './CommercialRateCards';
import type {
  CommercialCatalog,
  CommercialQuote,
  CommercialQuoteRequest,
} from '@/app/core/types/commercialCatalog';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const routerPush = vi.hoisted(() => vi.fn());
const useCommercialCatalogMock = vi.hoisted(() => vi.fn());
const useCommercialQuoteMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('@/app/core/hooks/useCommercialCatalog', () => ({
  useCommercialCatalog: useCommercialCatalogMock,
  useCommercialQuote: useCommercialQuoteMock,
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: useAuthMock,
}));

const personalWorkspace = {
  key: 'PERSONAL' as const,
  name: 'Freelance Teacher Workspace',
  description: 'For independent teachers.',
  is_publicly_selectable: true,
  premium_available: false,
  standard: {
    plan_id: 1,
    plan_code: 'PERSONAL_STANDARD',
    plan_name: 'Standard',
    plan_version: 1,
    currency: 'KES',
    price: '1200.00',
    capabilities: [{
      key: 'records',
      name: 'Teaching records',
      short_description: 'Track learners.',
      category: 'Core',
      source_type: 'CORE' as const,
      plugin_key: null,
    }],
  },
  premium_plugins: [],
};

const institutionWorkspace = {
  ...personalWorkspace,
  key: 'INSTITUTION' as const,
  name: 'Institution',
  description: 'For schools.',
  is_publicly_selectable: true,
  standard: {
    ...personalWorkspace.standard,
    plan_id: 2,
    plan_code: 'INSTITUTION_STANDARD',
  },
};

const catalog: CommercialCatalog = {
  billing_period: {
    unit: 'CALENDAR_MONTH',
    count: 3,
    description: 'Three calendar months',
  },
  rate_cards: [{
    mode: 'STANDARD',
    name: 'Standard',
    summary: 'Standard foundation.',
    requires_premium_plugin: false,
  }],
  workspace_types: [institutionWorkspace, personalWorkspace],
};

const quote: CommercialQuote = {
  token: 'quote-token',
  expires_at: '2026-08-01T00:00:00Z',
  status: 'OPEN',
  commercial_mode: 'STANDARD',
  workspace_type: 'PERSONAL',
  plan: {
    id: 1,
    code: 'PERSONAL_STANDARD',
    name: 'Standard',
    version: 1,
  },
  starts_on: '2026-07-26',
  ends_on: '2026-10-26',
  currency: 'KES',
  base_price: '1200.00',
  premium_total: '0.00',
  total: '1200.00',
  selected_premium_plugins: [],
  included_standard_capabilities: personalWorkspace.standard.capabilities,
  selected_premium_capabilities: [],
  available_next_step: 'REGISTER_OR_CREATE_WORKSPACE',
};

function textContent(node: { children?: unknown[] }): string {
  return (node.children ?? [])
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child);
      }
      if (child && typeof child === 'object' && 'children' in child) {
        return textContent(child as { children?: unknown[] });
      }
      return '';
    })
    .join('');
}

function findButton(renderer: ReactTestRenderer, label: string) {
  const button = renderer.root
    .findAll((node) => node.type === 'button')
    .find((node) => textContent(node).includes(label));
  if (!button) {
    throw new Error(`Button not found: ${label}`);
  }
  return button;
}

describe('CommercialRateCards workspace onboarding interaction', () => {
  let renderer: ReactTestRenderer | null = null;
  let mutateAsync: ReturnType<typeof vi.fn<(payload: CommercialQuoteRequest) => Promise<CommercialQuote>>>;

  beforeEach(() => {
    routerPush.mockReset();
    mutateAsync = vi.fn<(payload: CommercialQuoteRequest) => Promise<CommercialQuote>>()
      .mockResolvedValue(quote);
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
    });
    useCommercialCatalogMock.mockReturnValue({
      data: catalog,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useCommercialQuoteMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      mutateAsync,
      reset: vi.fn(),
    });
  });

  afterEach(async () => {
    await act(async () => {
      renderer?.unmount();
    });
    renderer = null;
    vi.clearAllMocks();
  });

  it('renders backend-eligible onboarding workspace options and allows institution quote activation', async () => {
    await act(async () => {
      renderer = create(
        <CommercialRateCards continueBasePath="/register" workspaceOnboarding />,
      );
    });

    expect(useCommercialCatalogMock).toHaveBeenCalledWith({ context: 'workspace_onboarding' });
    expect(textContent(renderer!.root)).toContain('Freelance Teacher Workspace');
    expect(textContent(renderer!.root)).toContain('Institution');
    expect(textContent(renderer!.root)).not.toContain('Coming soon');

    const institutionButton = findButton(renderer!, 'Institution');
    expect(institutionButton.props.disabled).toBe(false);

    await act(async () => {
      institutionButton.props.onClick();
      await Promise.resolve();
    });

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({
      commercial_mode: 'STANDARD',
      workspace_type: 'INSTITUTION',
      premium_plugin_price_ids: [],
    });
    expect(textContent(renderer!.root)).toContain('Quote summary is now active.');
    expect(textContent(renderer!.root)).toContain('Change workspace');
  });

  it('uses the same get-started flow and changes only the final action by authentication state', async () => {
    useCommercialQuoteMock.mockReturnValue({
      data: quote,
      isPending: false,
      isError: false,
      mutateAsync,
      reset: vi.fn(),
    });

    await act(async () => {
      renderer = create(
        <CommercialRateCards continueBasePath="/register" workspaceOnboarding />,
      );
    });
    await act(async () => {
      findButton(renderer!, 'Choose this workspace').props.onClick();
      await Promise.resolve();
    });

    await act(async () => {
      findButton(renderer!, 'Create account').props.onClick();
      await Promise.resolve();
    });

    expect(routerPush).toHaveBeenLastCalledWith('/register?quote=quote-token&mode=signup');

    await act(async () => {
      renderer?.unmount();
      useAuthMock.mockReturnValue({
        user: { id: 1, email: 'teacher@example.com' },
        loading: false,
      });
      renderer = create(
        <CommercialRateCards continueBasePath="/register" workspaceOnboarding />,
      );
    });
    await act(async () => {
      findButton(renderer!, 'Choose this workspace').props.onClick();
      await Promise.resolve();
    });

    await act(async () => {
      findButton(renderer!, 'Create this workspace').props.onClick();
      await Promise.resolve();
    });

    expect(routerPush).toHaveBeenLastCalledWith('/register?quote=quote-token&mode=new_workspace');
  });

  it('renders a recoverable catalogue error and Retry creates one new request', async () => {
    const refetch = vi.fn();
    useCommercialCatalogMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch,
    });

    await act(async () => {
      renderer = create(
        <CommercialRateCards continueBasePath="/register" workspaceOnboarding />,
      );
    });

    expect(textContent(renderer!.root)).toContain('Plan information is unavailable.');

    await act(async () => {
      findButton(renderer!, 'Retry').props.onClick();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
