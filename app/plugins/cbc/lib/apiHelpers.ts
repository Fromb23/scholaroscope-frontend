export function toArray<T>(data: T[] | { results?: T[] } | null | undefined): T[] {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.results)) {
        return data.results;
    }

    return [];
}
