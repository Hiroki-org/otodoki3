import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { usePlaylists } from './usePlaylists';

// テスト用のクエリクライアントを作成するヘルパー
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false, // テストの安定性のためリトライを無効化
        },
    },
});

// テスト用のラッパーコンポーネント
const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestQueryClientProvider';
    return Wrapper;
};

describe('usePlaylists', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('正常系: プレイリスト一覧を取得できること', async () => {
        const mockPlaylists = [
            { id: '1', name: 'Playlist 1', icon: 'icon1', count: 10 },
            { id: '2', name: 'Playlist 2', icon: 'icon2', count: 5 },
        ];

        // fetch のモック
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: mockPlaylists }),
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        // データの取得を待機
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
    });

    it('正常系: プレイリストが空の場合、空配列を返すこと', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: [] }),
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('正常系: レスポンスに playlists が含まれない場合、空配列を返すこと', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({}), // playlists プロパティなし
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('異常系: API エラー時にエラーをスローすること', async () => {
        // 500 エラーのモック
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeInstanceOf(Error);
        expect((result.current.error as Error).message).toBe('Failed to fetch playlists');
        expect((result.current.error as Error & { status?: number }).status).toBe(500);
    });

    it('異常系: ネットワークエラー時にエラーをスローすること', async () => {
        // ネットワークエラーのモック
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network Error')));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeInstanceOf(Error);
        expect((result.current.error as Error).message).toBe('Network Error');
    });
});
