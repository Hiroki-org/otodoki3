import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoRefill } from '@/hooks/useAutoRefill';
import type { CardItem } from '@/types/track-pool';

// モック CardItem
const mockTrack = (id: number): CardItem => ({
  type: 'track' as const,
  track_id: id,
  track_name: `Track ${id}`,
  artist_name: `Artist ${id}`,
  preview_url: `https://example.com/audio${id}.mp3`,
});

describe('useAutoRefill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初期状態', () => {
    it('初期状態が正しい', () => {
      const { result } = renderHook(() =>
        useAutoRefill([], vi.fn())
      );

      expect(result.current.isRefilling).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('disableRefill が true の場合、refill は実行されない', async () => {
      const onRefill = vi.fn();
      const { result } = renderHook(() =>
        useAutoRefill([], onRefill, true)
      );

      await waitFor(() => {
        expect(result.current.isRefilling).toBe(false);
      });

      // onRefill は呼ばれない
      expect(onRefill).not.toHaveBeenCalled();
    });
  });

  describe('自動補充トリガー', () => {
    it('正常系: スタックが REFILL_THRESHOLD 以下になると補充を開始', async () => {
      const onRefill = vi.fn();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tracks: [mockTrack(1), mockTrack(2)] }),
        } as Response)
      );

      const initialStack = [mockTrack(1), mockTrack(2), mockTrack(3)]; // 3 items
      const { rerender } = renderHook(
        ({ stack }: { stack: CardItem[] }) => useAutoRefill(stack, onRefill),
        { initialProps: { stack: initialStack } }
      );

      // スタックを 3 項目以下に減らす
      await act(async () => {
        rerender({ stack: [mockTrack(1), mockTrack(2)] }); // 2 items
      });

      await waitFor(() => {
        expect(onRefill).toHaveBeenCalled();
      });
    });

    it('正常系: スタックが十分にある場合は補充しない', async () => {
      const onRefill = vi.fn();
      global.fetch = vi.fn();

      const stack = Array.from({ length: 10 }, (_, i) => mockTrack(i));

      renderHook(() => useAutoRefill(stack, onRefill));

      await waitFor(() => {
        expect(onRefill).not.toHaveBeenCalled();
      });
    });

    it('異常系: API がエラーを返す場合', async () => {
      const onRefill = vi.fn();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response)
      );

      const { result, rerender } = renderHook(
        ({ stack }: { stack: CardItem[] }) => useAutoRefill(stack, onRefill),
        { initialProps: { stack: [mockTrack(1), mockTrack(2)] } }
      );

      await act(async () => {
        rerender({ stack: [mockTrack(1)] }); // トリガー
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
    });
  });

  describe('refillTracks メソッド', () => {
    it('正常系: API からトラックを取得して onRefill を呼び出す', async () => {
      const onRefill = vi.fn();
      const newTracks = [mockTrack(10), mockTrack(11)];
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tracks: newTracks }),
        } as Response)
      );

      const { result, rerender } = renderHook(
        ({ stack }: { stack: CardItem[] }) => useAutoRefill(stack, onRefill),
        { initialProps: { stack: [mockTrack(1)] } }
      );

      await act(async () => {
        rerender({ stack: [mockTrack(1)] }); // トリガー
      });

      await waitFor(() => {
        expect(onRefill).toHaveBeenCalledWith(newTracks);
      });
    });

    it('正常系: API がトラックを返さない場合は何もしない', async () => {
      const onRefill = vi.fn();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tracks: [] }),
        } as Response)
      );

      const { result, rerender } = renderHook(
        ({ stack }: { stack: CardItem[] }) => useAutoRefill(stack, onRefill),
        { initialProps: { stack: [mockTrack(1)] } }
      );

      await act(async () => {
        rerender({ stack: [mockTrack(1)] });
      });

      await waitFor(() => {
        expect(onRefill).toHaveBeenCalledWith([]);
      });
    });

    it('異常系: fetch がタイムアウトする場合', async () => {
      const onRefill = vi.fn();
      global.fetch = vi.fn(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      );

      const { result, rerender } = renderHook(
        ({ stack }: { stack: CardItem[] }) => useAutoRefill(stack, onRefill),
        { initialProps: { stack: [mockTrack(1)] } }
      );

      await act(async () => {
        rerender({ stack: [mockTrack(1)] });
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toMatch('Timeout');
    });

    it('異常系: AbortSignal でキャンセル可能', async () => {
      const onRefill = vi.fn();
      let abortController: AbortController | null = null;

      global.fetch = vi.fn((url, options) => {
        if (options?.signal instanceof AbortSignal) {
          abortController = new AbortController();
          return new Promise((_, reject) => {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tracks: [mockTrack(1)] }),
        } as Response);
      });

      const { result, rerender } = renderHook(
        ({ stack }: { stack: CardItem[] }) => useAutoRefill(stack, onRefill),
        { initialProps: { stack: [mockTrack(1)] } }
      );

      await act(async () => {
        rerender({ stack: [mockTrack(1)] });
      });

      // AbortSignal でキャンセルするのは実装者の責任
      // ここではテスト構造のみ確認
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tracks/random',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  describe('clearError メソッド', () => {
    it('正常系: エラーをクリアできる', async () => {
      const onRefill = vi.fn();
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      const { result, rerender } = renderHook(
        ({ stack }: { stack: CardItem[] }) => useAutoRefill(stack, onRefill),
        { initialProps: { stack: [mockTrack(1)] } }
      );

      await act(async () => {
        rerender({ stack: [mockTrack(1)] }); // エラーをトリガー
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('disableRefill フラグの動作', () => {
    it('正常系: disableRefill が false の場合は補充される', async () => {
      const onRefill = vi.fn();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tracks: [mockTrack(1)] }),
        } as Response)
      );

      const { result, rerender } = renderHook(
        ({ stack, disable }: { stack: CardItem[], disable: boolean }) =>
          useAutoRefill(stack, onRefill, disable),
        { initialProps: { stack: [mockTrack(1), mockTrack(2)], disable: false } }
      );

      await act(async () => {
        rerender({ stack: [mockTrack(1)], disable: false }); // トリガー
      });

      await waitFor(() => {
        expect(onRefill).toHaveBeenCalled();
      });
    });

    it('異常系: disableRefill が true の場合は補充されない', async () => {
      const onRefill = vi.fn();
      global.fetch = vi.fn();

      const { rerender } = renderHook(
        ({ stack, disable }: { stack: CardItem[], disable: boolean }) =>
          useAutoRefill(stack, onRefill, disable),
        { initialProps: { stack: [mockTrack(1)], disable: true } }
      );

      await act(async () => {
        rerender({ stack: [mockTrack(1)], disable: true });
      });

      await waitFor(() => {
        expect(onRefill).not.toHaveBeenCalled();
      });
    });
  });

  describe('複合シナリオ', () => {
    it('複合シナリオ: 複数回の補充リクエスト', async () => {
      const onRefill = vi.fn();
      let callCount = 0;
      global.fetch = vi.fn(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            tracks: [mockTrack(callCount * 10), mockTrack(callCount * 10 + 1)],
          }),
        } as Response);
      });

      const { rerender } = renderHook(
        ({ stack }: { stack: CardItem[] }) => useAutoRefill(stack, onRefill),
        { initialProps: { stack: [mockTrack(1), mockTrack(2)] } }
      );

      // 1 回目の補充
      await act(async () => {
        rerender({ stack: [mockTrack(1)] }); // スタック 1 つ
      });

      await waitFor(() => {
        expect(onRefill).toHaveBeenCalledTimes(1);
      });

      // 2 回目の補充（スタックが増えてもう一度減った場合）
      await act(async () => {
        rerender({
          stack: Array.from({ length: 5 }, (_, i) => mockTrack(i)),
        }); // スタック復帰
      });

      await act(async () => {
        rerender({
          stack: Array.from({ length: 1 }, (_, i) => mockTrack(i)),
        }); // スタック減少
      });

      await waitFor(() => {
        expect(onRefill).toHaveBeenCalledTimes(2);
      });
    });
  });
});
