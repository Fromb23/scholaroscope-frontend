import { useMutation, useQuery } from '@tanstack/react-query';

import {
  commercialCatalogAPI,
  storeCommercialQuote,
} from '@/app/core/api/commercialCatalog';
import type { CommercialQuoteRequest } from '@/app/core/types/commercialCatalog';

export const commercialCatalogKeys = {
  catalog: ['commercial-catalog'] as const,
};

export function useCommercialCatalog() {
  return useQuery({
    queryKey: commercialCatalogKeys.catalog,
    queryFn: commercialCatalogAPI.getCatalog,
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
