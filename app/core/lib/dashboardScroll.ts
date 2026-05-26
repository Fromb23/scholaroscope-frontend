const DASHBOARD_SCROLL_ROOT_ID = 'dashboard-scroll-root';

export function getDashboardScrollContainer(): HTMLElement | null {
    if (typeof document === 'undefined') {
        return null;
    }

    return document.getElementById(DASHBOARD_SCROLL_ROOT_ID);
}

export function scrollDashboardSectionIntoView(sectionId: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.requestAnimationFrame(() => {
        const target = document.getElementById(sectionId);
        if (!target) {
            return;
        }

        target.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
        });
    });
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
