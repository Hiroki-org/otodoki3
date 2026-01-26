import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists } from './usePlaylists';
import type { Playlist } from './usePlaylists';
import { ReactNode } from 'react';

// fetchをモック化
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('usePlaylists', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        mockFetch.mockReset();
        // テストごとに新しい QueryClient を作成し、リトライを無効化
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
    });

    afterEach(() => {
        queryClient.clear();
    });

    const createWrapper = () => {
        const Wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
        return Wrapper;
    };

    it('APIからプレイリストデータが正常に返された場合、正しくデータを取得できること', async () => {
        const mockPlaylists: Playlist[] = [
            { id: '1', name: 'Playlist 1', icon: '🎵', count: 10 },
            { id: '2', name: 'Playlist 2', icon: '🎧', count: 5 },
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
        expect(mockFetch).toHaveBeenCalledWith('/api/playlists');
    });

    it('APIがエラー（500など）を返した場合、エラー状態として処理されること', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
    });

    it('APIから空の配列が返された場合、空配列として処理されること', async () => {
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

    it('playlists フィールドが存在しない場合、空配列として処理されること', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}), // playlistsフィールド欠損
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
