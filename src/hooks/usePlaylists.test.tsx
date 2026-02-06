import { renderHook, waitFor } from '@testing-library/react';
import { usePlaylists } from './usePlaylists';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';

// React Query のためのラッパーコンポーネントを作成
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // テストのためにリトライを無効化
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }
  return Wrapper;
};

describe('usePlaylists', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('プレイリストの取得に成功した場合、データを返すこと', async () => {
    const mockPlaylists = [
      { id: '1', name: 'Playlist 1', icon: 'icon1', count: 10 },
      { id: '2', name: 'Playlist 2', icon: 'icon2', count: 5 },
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    }));

    const { result } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPlaylists);
  });

  it('APIエラーの場合、エラー状態になること', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }));

    const { result } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    const error = result.current.error as Error & { status?: number };
    expect(error.message).toBe('Failed to fetch playlists');
    expect(error.status).toBe(500);
  });

  it('レスポンスのplaylistsフィールドが存在しない場合、空配列を返すこと', async () => {
    // APIが { playlists: undefined } のような空のオブジェクトを返した場合
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }));

    const { result } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
