import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists } from './usePlaylists';
import React from 'react';

// Mock fetch
const mockFetch = vi.fn();

// Wrapper for QueryClientProvider
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
    const originalFetch = global.fetch;

    beforeAll(() => {
        global.fetch = mockFetch;
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('正常系: プレイリストが正常に取得できること', async () => {
        const mockPlaylists = [
            { id: '1', name: 'Playlist 1', icon: 'icon1', count: 10, is_default: true },
            { id: '2', name: 'Playlist 2', icon: 'icon2', count: 5, is_default: false },
        ];

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: mockPlaylists }),
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
        expect(result.current.error).toBeNull();
    });

    it('異常系: APIエラー時にエラーがスローされること', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Failed to fetch playlists');
    });

    it('準正常系: プレイリストが空の場合、空配列が返ること', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: [] }),
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('準正常系: レスポンスにplaylistsフィールドがない場合、空配列が返ること', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('準正常系: 必須フィールドが欠損している場合でもそのまま返ること', async () => {
        // usePlaylists はスキーマ検証を行わないため、そのまま返る挙動を確認
        const brokenData = [{ id: '1' }];

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: brokenData }),
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(brokenData);
    });
});
