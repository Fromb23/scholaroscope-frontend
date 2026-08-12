interface Paginated<T> {
  results?: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export function unwrapPaginated<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data?.results ?? [];
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export function normalizePaginated<T>(data: T[] | Paginated<T>): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    return {
      results: data,
      count: data.length,
      next: null,
      previous: null,
    };
  }

  const results = data?.results ?? [];
  return {
    results,
    count: data?.count ?? results.length,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
  };
}
