type VisibilityDocument = Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;

type IntervalScheduler = Pick<typeof globalThis, 'setInterval' | 'clearInterval'>;

/** Runs a refresh immediately and on an interval only while the page is visible. */
export function startVisiblePolling(
    documentRef: VisibilityDocument,
    refresh: () => void,
    intervalMs: number,
    scheduler: IntervalScheduler = globalThis,
) {
    let interval: ReturnType<typeof setInterval> | undefined;

    const refreshWhenVisible = () => {
        if (documentRef.visibilityState === 'visible') refresh();
    };

    const syncInterval = () => {
        if (interval) scheduler.clearInterval(interval);
        interval = documentRef.visibilityState === 'visible'
            ? scheduler.setInterval(refreshWhenVisible, intervalMs)
            : undefined;
    };

    const onVisibilityChange = () => {
        refreshWhenVisible();
        syncInterval();
    };

    refreshWhenVisible();
    syncInterval();
    documentRef.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
        if (interval) scheduler.clearInterval(interval);
        documentRef.removeEventListener('visibilitychange', onVisibilityChange);
    };
}
