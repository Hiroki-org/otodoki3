import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists } from './usePlaylists';

// Wrapper for React Query
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('usePlaylists', () => {
    const mockFetch = vi.spyOn(global, 'fetch');

    beforeEach(() => {
        mockFetch.mockReset();
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it('正常系: データ取得成功時の動作確認', async () => {
        const mockPlaylists = [
            { id: '1', name: 'Favorites', icon: 'heart', count: 10 },
            { id: '2', name: 'Workout', icon: 'activity', count: 5 },
        ];

        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ playlists: mockPlaylists }),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
        expect(result.current.isLoading).toBe(false);
    });

    it('異常系: APIエラー時のエラーハンドリング確認', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result.current.error as any).status).toBe(500);
    });

    it('準正常系: データが空の場合、または必須フィールドが欠けている場合の動作確認', async () => {
        // Case 1: Empty playlists array
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ playlists: [] }),
        } as Response);

        const { result: resultEmpty } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(resultEmpty.current.isSuccess).toBe(true));
        expect(resultEmpty.current.data).toEqual([]);

        // Case 2: Missing playlists field (should default to empty array)
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({}), // Missing 'playlists'
        } as Response);

        const { result: resultMissing } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(resultMissing.current.isSuccess).toBe(true));
        expect(resultMissing.current.data).toEqual([]);
    });
});
