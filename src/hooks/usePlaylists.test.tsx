import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { usePlaylists } from './usePlaylists';

// ラッパーコンポーネントの作成ヘルパー
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // テストのタイムアウトを防ぐためリトライを無効化
            },
        },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'QueryClientWrapper';
    return Wrapper;
};

describe('usePlaylists', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterAll(() => {
        vi.unstubAllGlobals();
    });

    it('プレイリストの一覧を正常に取得できること', async () => {
        const mockPlaylists = [
            { id: '1', name: 'Playlist 1', icon: '🎵', count: 10 },
            { id: '2', name: 'Playlist 2', icon: '🔥', count: 5 },
        ];

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ playlists: mockPlaylists }),
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
    });

    it('レスポンスが空の場合、空配列を返すこと', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ playlists: [] }),
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('APIエラー時にエラーを返すこと', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({}), // エラーレスポンスのモック
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Failed to fetch playlists');
    });

    it('fetchが例外を投げた場合、エラーを処理できること', async () => {
        const networkError = new Error('Network Error');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Network Error');
    });
});
