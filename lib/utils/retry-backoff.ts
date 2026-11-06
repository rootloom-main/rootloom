/** Exponential retry delay, capped to keep failed jobs from hot-looping. */
export function getRetryDelayMs(attempt: number, capMinutes = 30) {
    const safeAttempt = Math.max(1, Math.floor(Number.isFinite(attempt) ? attempt : 1));
    return Math.min(capMinutes, 2 ** safeAttempt) * 60_000;
}
