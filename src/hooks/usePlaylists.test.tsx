import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePlaylists, type Playlist } from './usePlaylists';

// Mock data
const mockPlaylists: Playlist[] = [
    {
        id: '1',
        name: 'Favorites',
        icon: 'heart',
        count: 10,
        is_default: true,
    },
    {
        id: '2',
        name: 'Rock',
        icon: 'guitar',
        count: 5,
        is_default: false,
    },
];

describe('usePlaylists', () => {
    // Mock fetch
    const mockFetch = vi.fn();

    beforeEach(() => {
        vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    // Wrapper component for React Query
    const createWrapper = () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
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

    it('should fetch and return playlists successfully', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: mockPlaylists }),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
        expect(mockFetch).toHaveBeenCalledWith('/api/playlists');
    });

    it('should return empty array when API returns no playlists', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: [] }),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('should handle API errors', async () => {
        mockFetch.mockResolvedValue({
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
});
