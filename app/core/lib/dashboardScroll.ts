export function getDashboardScrollContainer(): HTMLElement | null {
    if (typeof document === 'undefined') {
        return null;
    }

    return document.querySelector('main');
}

export function clampDashboardScrollToContent(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.requestAnimationFrame(() => {
        const container = getDashboardScrollContainer();
        if (!container) {
            return;
        }

        const maxScrollTop = Math.max(
            0,
            container.scrollHeight - container.clientHeight,
        );

        if (container.scrollTop > maxScrollTop) {
            container.scrollTop = maxScrollTop;
        }
    });
}
