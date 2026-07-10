import { apiClient } from '@/app/core/api/client';
import type {
  CommercialCatalog,
  CommercialQuote,
  CommercialQuoteRequest,
} from '@/app/core/types/commercialCatalog';

const QUOTE_STORAGE_PREFIX = 'commercial_quote:';

export const commercialCatalogAPI = {
  getCatalog: async (): Promise<CommercialCatalog> => {
    const response = await apiClient.get<CommercialCatalog>('/subscriptions/catalog/');
    return response.data;
  },

  createQuote: async (payload: CommercialQuoteRequest): Promise<CommercialQuote> => {
    const response = await apiClient.post<CommercialQuote>('/subscriptions/catalog/quote/', payload);
    return response.data;
  },
};

export function storeCommercialQuote(quote: CommercialQuote): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(`${QUOTE_STORAGE_PREFIX}${quote.token}`, JSON.stringify(quote));
}

export function readStoredCommercialQuote(token: string | null): CommercialQuote | null {
  if (typeof window === 'undefined' || !token) return null;
  const raw = window.sessionStorage.getItem(`${QUOTE_STORAGE_PREFIX}${token}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CommercialQuote;
  } catch {
    return null;
  }
}
