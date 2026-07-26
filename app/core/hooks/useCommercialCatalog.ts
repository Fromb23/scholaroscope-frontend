import { useMutation, useQuery } from '@tanstack/react-query';

import { commercialCatalogAPI, storeCommercialQuote } from '../api/commercialCatalog';
import type { CommercialQuoteRequest } from '@/app/core/types/commercialCatalog';
import type { CommercialCatalogRequestOptions } from '../api/commercialCatalog';

export const commercialCatalogKeys = {
  catalog: (options: CommercialCatalogRequestOptions = {}) => [
    'commercial-catalog',
    options.context ?? 'public',
  ] as const,
};

export function useCommercialCatalog(options: CommercialCatalogRequestOptions = {}) {
  return useQuery({
    queryKey: commercialCatalogKeys.catalog(options),
    queryFn: () => commercialCatalogAPI.getCatalog(options),
  });
}

export function useCommercialQuote() {
  return useMutation({
    mutationFn: (payload: CommercialQuoteRequest) => commercialCatalogAPI.createQuote(payload),
    onSuccess: (quote) => {
      storeCommercialQuote(quote);
    },
  });
}
