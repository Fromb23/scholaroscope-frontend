const SESSION_DATA_CHANGED_EVENT = 'scholaroscope:sessions:changed';

export function emitSessionDataChanged(): void {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new Event(SESSION_DATA_CHANGED_EVENT));
}

export function subscribeToSessionDataChanged(callback: () => void): () => void {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    const handler = () => callback();
    window.addEventListener(SESSION_DATA_CHANGED_EVENT, handler);

    return () => {
        window.removeEventListener(SESSION_DATA_CHANGED_EVENT, handler);
    };
}
