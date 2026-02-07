import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists, type Playlist } from './usePlaylists';
import React, { type ReactNode } from 'react';

// React Query のラッパーコンポーネントを作成
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // テストのタイムアウトを防ぐためリトライを無効化
            },
        },
    });

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'Wrapper';
    return Wrapper;
};

describe('usePlaylists', () => {
    beforeEach(() => {
        // fetch をグローバルにスタブ化
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        // スタブを解除してクリーンアップ
        vi.unstubAllGlobals();
    });

    it('プレイリスト一覧を正常に取得できること', async () => {
        const mockPlaylists: Playlist[] = [
            { id: '1', name: 'Playlist 1', icon: '🎵', count: 10, is_default: true },
            { id: '2', name: 'Playlist 2', icon: '🎸', count: 5 },
        ];

        // 成功レスポンスのモック
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ playlists: mockPlaylists }),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        // データの取得完了を待機
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
        expect(fetch).toHaveBeenCalledWith('/api/playlists');
    });

    it('プレイリストが空の場合、空配列を返すこと', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ playlists: [] }),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('APIエラー時にエラー状態になること', async () => {
        // エラーレスポンスのモック
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        // エラー状態になることを待機
        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        // エラー内容の検証
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = result.current.error as any;
        expect(error.message).toBe('Failed to fetch playlists');
        expect(error.status).toBe(500);
    });

    it('レスポンスに playlists フィールドが含まれない場合、空配列を返すこと', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({}), // Missing playlists key
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });
});
