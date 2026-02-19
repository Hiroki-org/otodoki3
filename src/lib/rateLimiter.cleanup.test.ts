import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('rateLimit cleanup', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.resetModules();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it('古いバケットが正しくクリーンアップされること', async () => {
        // Map.prototype.delete をスパイ
        const mapDeleteSpy = vi.spyOn(Map.prototype, 'delete');

        // モジュールを動的にインポートして、setInterval を開始させる
        const { rateLimit } = await import('./rateLimiter');

        const key = 'test-cleanup-key';
        const limit = 5;
        const windowMs = 1000;

        // バケットを作成
        rateLimit(key, limit, windowMs);

        // TTL (10分) + クリーンアップ間隔 (1分) 以上経過させる
        const TTL_MS = 10 * 60 * 1000;
        const CLEANUP_INTERVAL_MS = 60 * 1000;

        // 時間を進める
        await vi.advanceTimersByTimeAsync(TTL_MS + CLEANUP_INTERVAL_MS + 1000);

        // delete が呼ばれたことを確認
        expect(mapDeleteSpy).toHaveBeenCalledWith(key);
    });

    it('アクティブなバケットはクリーンアップされないこと', async () => {
        const mapDeleteSpy = vi.spyOn(Map.prototype, 'delete');
        const { rateLimit } = await import('./rateLimiter');

        const key = 'test-active-key';
        const limit = 5;
        const windowMs = 1000;

        // バケットを作成
        rateLimit(key, limit, windowMs);

        // TTL 未満の時間経過
        const TTL_MS = 10 * 60 * 1000;

        // TTL の半分だけ進める
        await vi.advanceTimersByTimeAsync(TTL_MS / 2);

        // まだ削除されていないはず
        expect(mapDeleteSpy).not.toHaveBeenCalledWith(key);

        // アクセスして lastRefill を更新
        rateLimit(key, limit, windowMs);

        // さらに時間を進める (合計で TTL を超えるが、更新があったので削除されないはず)
        await vi.advanceTimersByTimeAsync(TTL_MS / 2 + 1000);

        // 削除されていないことを確認 (厳密には古いキーが消えていないか)
        expect(mapDeleteSpy).not.toHaveBeenCalledWith(key);
    });
});
