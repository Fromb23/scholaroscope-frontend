interface Paginated<T> {
  results?: T[];
  count?: number;
}

export function unwrapPaginated<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data?.results ?? [];
}
