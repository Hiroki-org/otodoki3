import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('rateLimit cleanup', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // モジュールの状態をリセットして、トップレベルのコード（setIntervalなど）を再実行させる
        vi.resetModules();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('有効期限切れのバケットがクリーンアップされること', async () => {
        // Map.prototype.delete をスパイして、削除が呼ばれたか確認する
        const deleteSpy = vi.spyOn(Map.prototype, 'delete');

        // 動的にインポートする
        const { rateLimit } = await import('./rateLimiter');

        const key = 'test-cleanup-key';
        // バケットを作成
        rateLimit(key, 10, 1000);

        // まだ削除されていないはず
        expect(deleteSpy).not.toHaveBeenCalledWith(key);

        // TTL (10分) + クリーンアップ間隔 (1分) 以上進める
        // TTL_MS = 10 * 60 * 1000 = 600,000
        // CLEANUP_INTERVAL_MS = 60 * 1000 = 60,000
        const TTL_MS = 10 * 60 * 1000;
        const CLEANUP_INTERVAL_MS = 60 * 1000;

        await vi.advanceTimersByTimeAsync(TTL_MS + CLEANUP_INTERVAL_MS + 1000);

        // 削除が呼ばれたはず
        expect(deleteSpy).toHaveBeenCalledWith(key);
    });

    it('アクティブなバケットはクリーンアップされないこと', async () => {
        const deleteSpy = vi.spyOn(Map.prototype, 'delete');
        const { rateLimit } = await import('./rateLimiter');

        const key = 'test-active-key';
        rateLimit(key, 10, 1000);

        // TTL の半分進める
        const TTL_MS = 10 * 60 * 1000;
        await vi.advanceTimersByTimeAsync(TTL_MS / 2);

        // まだ削除されていない
        expect(deleteSpy).not.toHaveBeenCalledWith(key);

        // 再度アクセスして lastRefill を更新
        rateLimit(key, 10, 1000);

        // さらに TTL の半分進める（最初からは TTL 経過しているが、更新からは半分）
        await vi.advanceTimersByTimeAsync(TTL_MS / 2 + 60 * 1000);

        // まだ削除されていないはず（更新されたから）
        expect(deleteSpy).not.toHaveBeenCalledWith(key);
    });
});
