import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('src/lib/rateLimiter.ts (Cleanup)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.resetModules();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('期限切れのエントリが自動的に削除されること', async () => {
        // Map.prototype.delete をスパイ
        const deleteSpy = vi.spyOn(Map.prototype, 'delete');

        // モジュールを動的インポート（ここで setInterval が開始される）
        const { rateLimit } = await import('./rateLimiter');

        const key = 'test-cleanup-key';
        const limit = 5;
        const windowMs = 1000;

        // エントリを作成
        rateLimit(key, limit, windowMs);

        // TTL (10分) + クリーンアップ間隔 (1分) 以上経過させる
        // TTL_MS = 10 * 60 * 1000 = 600,000
        // CLEANUP_INTERVAL_MS = 60 * 1000 = 60,000
        await vi.advanceTimersByTimeAsync(11 * 60 * 1000 + 100);

        // delete が呼ばれたことを確認
        expect(deleteSpy).toHaveBeenCalledWith(key);
    });

    it('期限内のエントリは削除されないこと', async () => {
        const deleteSpy = vi.spyOn(Map.prototype, 'delete');
        const { rateLimit } = await import('./rateLimiter');

        const key = 'test-active-key';
        rateLimit(key, 5, 1000);

        // TTL 未満の時間経過
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

        // delete が呼ばれていないことを確認
        expect(deleteSpy).not.toHaveBeenCalledWith(key);
    });
});
