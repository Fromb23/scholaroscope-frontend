const SESSION_DATA_CHANGED_EVENT = 'scholaroscope:sessions:changed';

export interface SessionDataChangedDetail {
    reason?: string;
    sessionId?: number;
    nextStep?: string;
    message?: string;
}

export function emitSessionDataChanged(detail?: SessionDataChangedDetail): void {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent<SessionDataChangedDetail>(SESSION_DATA_CHANGED_EVENT, {
        detail,
    }));
}

export function subscribeToSessionDataChanged(
    callback: (detail?: SessionDataChangedDetail) => void
): () => void {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    const handler = (event: Event) => {
        const detail = event instanceof CustomEvent
            ? (event as CustomEvent<SessionDataChangedDetail>).detail
            : undefined;
        callback(detail);
    };
    window.addEventListener(SESSION_DATA_CHANGED_EVENT, handler);

    return () => {
        window.removeEventListener(SESSION_DATA_CHANGED_EVENT, handler);
    };
}
