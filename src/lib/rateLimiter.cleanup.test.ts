import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('rateLimit cleanup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should clean up stale buckets after TTL', async () => {
    // Map.prototype.delete をスパイ
    const deleteSpy = vi.spyOn(Map.prototype, 'delete');

    // モジュールを動的にインポート（setInterval を開始させるため）
    const { rateLimit } = await import('./rateLimiter');

    const key = 'stale-key';
    const limit = 5;
    const windowMs = 1000;

    // バケットを作成
    rateLimit(key, limit, windowMs);

    // TTL (10分) + クリーンアップ間隔 (1分) 経過させる
    // 念のため少し余分に進める
    const TTL_MS = 10 * 60 * 1000;
    const CLEANUP_INTERVAL_MS = 60 * 1000;

    // 時間を進めてクリーンアップをトリガー
    await vi.advanceTimersByTimeAsync(TTL_MS + CLEANUP_INTERVAL_MS + 1000);

    // delete が呼ばれたことを確認
    // 他の Map 操作による delete もあるかもしれないので、特定のキーで呼ばれたか確認
    expect(deleteSpy).toHaveBeenCalledWith(key);
  });
});
