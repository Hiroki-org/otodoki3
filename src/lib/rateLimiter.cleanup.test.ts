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

    it('アクセスによるリフレッシュでバケットがクリーンアップされないこと', async () => {
        const mapDeleteSpy = vi.spyOn(Map.prototype, 'delete');
        const { rateLimit } = await import('./rateLimiter');

        const key = 'test-active-key';
        const limit = 5;
        const windowMs = 1000;

        const TTL_MS = 10 * 60 * 1000;
        const CLEANUP_INTERVAL_MS = 60 * 1000;

        // バケットを作成
        rateLimit(key, limit, windowMs);

        // TTL - 1分 まで進める（まだTTLに達していない）
        await vi.advanceTimersByTimeAsync(TTL_MS - CLEANUP_INTERVAL_MS);

        // まだ削除されていないはず
        expect(mapDeleteSpy).not.toHaveBeenCalledWith(key);

        // アクセスして lastRefill を更新（リフレッシュ）
        rateLimit(key, limit, windowMs);

        // リフレッシュ後にTTL + CLEANUP_INTERVAL以上進める
        // リフレッシュなしなら合計 TTL*2 > TTL なので削除されるはずだが
        // リフレッシュにより lastRefill が更新されたので削除されない
        await vi.advanceTimersByTimeAsync(TTL_MS - CLEANUP_INTERVAL_MS);

        // リフレッシュがあったので、削除されていないことを確認
        expect(mapDeleteSpy).not.toHaveBeenCalledWith(key);
    });
});
