import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTracksFromPool, addTracksToPool, getPoolSize, trimPool, TRACK_POOL_COLUMNS } from '@/lib/track-pool';

// モックの定義
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  upsert: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

describe('src/lib/track-pool.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのチェーン設定
    mocks.from.mockReturnValue({
      select: mocks.select,
      upsert: mocks.upsert,
    });
  });

  describe('getTracksFromPool', () => {
    it('正常系: 指定数のトラックを取得し、正しい形式で返す', async () => {
      const mockData = [
        {
          track_id: '1',
          track_name: 'Test Track',
          artist_name: 'Test Artist',
          preview_url: 'http://example.com/preview',
          metadata: { test: true },
        },
      ];

      // チェーンのモック設定
      // select -> order -> limit -> resolve
      const limitMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      mocks.select.mockReturnValue({ order: orderMock });

      const result = await getTracksFromPool(1);

      expect(mocks.from).toHaveBeenCalledWith('track_pool');
      
      // Verify that explicit column selection is used (not wildcard)
      const selectArg = (mocks.select as any).mock.calls[0][0];
      expect(selectArg).not.toContain('*');
      
      // Verify all required columns are selected
      const actualColumns = selectArg.split(',').map((c: string) => c.trim());
      TRACK_POOL_COLUMNS.forEach((col) => {
        expect(actualColumns).toContain(col);
      });
      
      expect(orderMock).toHaveBeenCalledWith('fetched_at', { ascending: true });
      expect(limitMock).toHaveBeenCalledWith(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'track',
        track_id: 1,
        track_name: 'Test Track',
        artist_name: 'Test Artist',
        collection_name: undefined,
        preview_url: 'http://example.com/preview',
        artwork_url: undefined,
        track_view_url: undefined,
        genre: undefined,
        release_date: undefined,
        metadata: { test: true },
      });
    });

    it('正常系: データが空の場合は空配列を返す', async () => {
      const limitMock = vi.fn().mockResolvedValue({ data: null, error: null }); // data null
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      mocks.select.mockReturnValue({ order: orderMock });

      const result = await getTracksFromPool(5);
      expect(result).toEqual([]);
    });

    it('異常系: データベースエラーが発生した場合は例外を投げる', async () => {
      const dbError = { message: 'DB Connection Error' };
      const limitMock = vi.fn().mockResolvedValue({ data: null, error: dbError });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      mocks.select.mockReturnValue({ order: orderMock });

      await expect(getTracksFromPool(1)).rejects.toThrow('Failed to fetch tracks from pool: DB Connection Error');
    });

    it('異常系: 無効な track_id が含まれる場合はスキップする', async () => {
      const mockData = [
        { track_id: '1', track_name: 'Valid' },
        { track_id: 'invalid-number', track_name: 'Invalid' },
      ];
      const limitMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      mocks.select.mockReturnValue({ order: orderMock });

      const result = await getTracksFromPool(2);
      expect(result).toHaveLength(1);
      expect(result[0].track_name).toBe('Valid');
    });
  });

  describe('addTracksToPool', () => {
    it('正常系: トラックを正常に追加できる', async () => {
      mocks.upsert.mockResolvedValue({ error: null });
      // trimPoolのモック (rpc)
      mocks.rpc.mockResolvedValue({ data: [{ deleted_count: 0 }], error: null });

      const tracks = [
        {
          type: 'track',
          track_id: 1,
          track_name: 'New Track',
          artist_name: 'New Artist',
          preview_url: 'url',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
      ];

      await addTracksToPool(tracks, { method: 'test', weight: 1 });

      expect(mocks.from).toHaveBeenCalledWith('track_pool');
      expect(mocks.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            track_id: '1',
            track_name: 'New Track',
          })
        ]),
        { onConflict: 'track_id', ignoreDuplicates: false }
      );
    });

    it('正常系: 空の配列が渡された場合は何もしない', async () => {
        await addTracksToPool([]);
        expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it('異常系: Upsertエラーが発生した場合は例外を投げる', async () => {
        mocks.upsert.mockResolvedValue({ error: { message: 'Upsert Failed' } });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tracks = [{ track_id: 1 } as any];
        await expect(addTracksToPool(tracks)).rejects.toThrow('Failed to add tracks to pool: Upsert Failed');
    });
  });

  describe('getPoolSize', () => {
    it('正常系: プールサイズを取得できる', async () => {
        // select('*', { count: 'exact', head: true }) が呼ばれる
        // 返り値は Promise<{ count: number, error: null }>
        // ここでは select() 自体が thenable である必要がある、または await される

        // 実装では await supabase.from().select(...)
        // mocks.select が呼ばれ、その返り値が await される

        mocks.select.mockImplementation(() => {
            return Promise.resolve({ count: 100, error: null });
        });

        const size = await getPoolSize();
        expect(size).toBe(100);
        expect(mocks.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });

    it('異常系: エラーが発生した場合は例外を投げる', async () => {
        mocks.select.mockImplementation(() => {
            return Promise.resolve({ count: null, error: { message: 'Count Error' } });
        });

        await expect(getPoolSize()).rejects.toThrow('Failed to get pool size: Count Error');
    });
  });

  describe('trimPool', () => {
    it('正常系: RPCを呼び出してプールをトリムする', async () => {
        mocks.rpc.mockResolvedValue({ data: [{ deleted_count: 5 }], error: null });

        await trimPool(500);

        expect(mocks.rpc).toHaveBeenCalledWith('trim_track_pool', { max_size: 500 });
    });

    it('異常系: RPCエラーが発生した場合は例外を投げる', async () => {
        mocks.rpc.mockResolvedValue({ data: null, error: { message: 'RPC Error' } });

        await expect(trimPool(500)).rejects.toThrow('Failed to trim track pool: RPC Error');
    });

    it('正常系: 削除数が数値以外で返ってきても処理できる (文字)', async () => {
         mocks.rpc.mockResolvedValue({ data: [{ deleted_count: "10" }], error: null });
         // エラーにならなければOK (コンソールログ確認は難しいが処理が通ることを確認)
         await expect(trimPool(500)).resolves.not.toThrow();
    });
  });
});
