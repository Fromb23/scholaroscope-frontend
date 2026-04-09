export function toArray<T>(data: T[] | { results: T[] }): T[] {
    return Array.isArray(data) ? data : data.results;
}