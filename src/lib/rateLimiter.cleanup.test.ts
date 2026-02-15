import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('rateLimiter cleanup', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('バックグラウンドのクリーンアップ処理が正しく動作すること', async () => {
        const deleteSpy = vi.spyOn(Map.prototype, 'delete');

        // Dynamically import to start the interval with fake timers
        const { rateLimit } = await import('./rateLimiter');

        const key = 'test-cleanup-key';
        rateLimit(key, 10, 1000); // Create a bucket

        // TTL_MS = 10 * 60 * 1000
        // CLEANUP_INTERVAL_MS = 60 * 1000
        // Advance time by TTL + buffer to ensure cleanup runs
        await vi.advanceTimersByTimeAsync(11 * 60 * 1000);

        expect(deleteSpy).toHaveBeenCalledWith(key);
    });
});
