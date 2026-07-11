export type OperationalScope = 'current' | 'historical' | 'upcoming' | 'all';

export interface OperationalScopeParams {
  scope?: OperationalScope;
  term?: number | string;
  term_id?: number | string;
}

function cleanParams(params?: object): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as Record<string, string | number | boolean>;
}

export function withOperationalScope<T extends object>(
  params?: T,
  termAliases: string[] = [],
): T & OperationalScopeParams {
  const cleaned = cleanParams(params);
  const explicitTerm = cleaned.term
    ?? cleaned.term_id
    ?? termAliases.map((alias) => cleaned[alias]).find((value) => value !== undefined);

  if (explicitTerm !== undefined) {
    return {
      ...cleaned,
      term: explicitTerm,
    } as T & OperationalScopeParams;
  }

  if (typeof cleaned.scope === 'string') {
    return cleaned as T & OperationalScopeParams;
  }

  return {
    ...cleaned,
    scope: 'current',
  } as T & OperationalScopeParams;
}
