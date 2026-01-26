import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePlaylists, Playlist } from './usePlaylists';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ラッパーコンポーネントの作成
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // テスト時はリトライを無効化
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
        // fetch をモック化
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        // モックをリセット
        vi.unstubAllGlobals();
    });

    it('正常系: APIからプレイリストデータが正常に返された場合、正しくデータを取得できること', async () => {
        const mockPlaylists: Playlist[] = [
            { id: '1', name: 'Playlist 1', icon: '🎵', count: 10, is_default: true },
            { id: '2', name: 'Playlist 2', icon: '🎸', count: 5, is_default: false },
        ];

        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: mockPlaylists }),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
    });

    it('異常系: APIがエラー（500など）を返した場合、エラー状態として処理されること', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Failed to fetch playlists');
    });

    it('準正常系: APIから空の配列が返された場合、空配列として処理されること', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: [] }),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it('準正常系: playlistsフィールドが存在しない場合、空配列として処理されること', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({}), // playlistsフィールドなし
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });
});
