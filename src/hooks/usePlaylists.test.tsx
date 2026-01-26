import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists, Playlist } from './usePlaylists';

// Mock fetch
const fetchSpy = vi.spyOn(global, 'fetch');

// Wrapper for React Query
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    // Explicit displayName to fix react/display-name ESLint error
    Wrapper.displayName = 'QueryClientWrapper';

    return Wrapper;
};

describe('usePlaylists', () => {
    beforeEach(() => {
        fetchSpy.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and return playlists successfully', async () => {
        const mockPlaylists: Playlist[] = [
            { id: '1', name: 'Favorites', icon: 'heart', count: 10, is_default: true },
            { id: '2', name: 'Workout', icon: 'activity', count: 5 },
        ];

        fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ playlists: mockPlaylists }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
        expect(fetchSpy).toHaveBeenCalledWith('/api/playlists');
    });

    it('should handle API errors correctly', async () => {
        fetchSpy.mockResolvedValueOnce(new Response(null, {
            status: 500,
            statusText: 'Internal Server Error',
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        // The hook throws an error with message "Failed to fetch playlists"
        expect(result.current.error?.message).toBe('Failed to fetch playlists');
    });

    it('should return empty array when response is empty or playlists property is missing', async () => {
        // Case 1: Empty JSON object
        fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);

        // Case 2: playlists is null (if API could return that) or undefined (already tested above)
        // Let's test with a different query key or just another run to be safe,
        // but since we are using fresh QueryClient in wrapper, we can just do another test case or rerun renderHook
    });

    it('should return empty array when playlists is null in response', async () => {
         fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ playlists: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });
});
