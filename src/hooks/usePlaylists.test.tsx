import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlaylists, Playlist } from './usePlaylists';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// QueryClientProviderのラッパーを作成
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // テスト用にリトライを無効化
            },
        },
    });
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('usePlaylists', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('正常にプレイリストを取得できること', async () => {
        const mockPlaylists: Playlist[] = [
            { id: '1', name: 'Playlist 1', icon: '🎵', count: 10 },
            { id: '2', name: 'Playlist 2', icon: '🎸', count: 5 },
        ];

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ playlists: mockPlaylists }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(false);
    });

    it('APIエラーを適切にハンドリングできること', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
    });

    it('データが空の場合を適切にハンドリングできること', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ playlists: [] }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('playlistsフィールドが存在しない場合に空配列を返すこと', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}), // playlistsフィールドなし
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
