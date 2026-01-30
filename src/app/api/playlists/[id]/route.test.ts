import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { createMockSupabaseClient, mockAuthenticatedUser } from '@/test/api-test-utils';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');

describe('GET /api/playlists/[id]', () => {
    let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
    let mockSelectPlaylistTracks: any;
    let mockSelectLikes: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        mockSelectPlaylistTracks = vi.fn().mockReturnThis();
        mockSelectLikes = vi.fn().mockReturnThis();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        // Default auth
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });
    });

    it('should select explicit columns from track_pool for custom playlist', async () => {
        const playlistId = 'playlist-123';
        const params = Promise.resolve({ id: playlistId });
        const request = new NextRequest(`http://localhost/api/playlists/${playlistId}`);

        // Mock chained calls
        const mockPlaylistsQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: playlistId, title: 'My Playlist', user_id: mockAuthenticatedUser.id },
                error: null
            })
        };

        const mockPlaylistTracksQuery = {
            select: mockSelectPlaylistTracks,
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
                data: [],
                error: null
            })
        };

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'playlists') return mockPlaylistsQuery as any;
            if (table === 'playlist_tracks') return mockPlaylistTracksQuery as any;
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
            } as any;
        });

        await GET(request, { params });

        expect(mockSelectPlaylistTracks).toHaveBeenCalledWith(expect.stringContaining('track:track_pool('));
        expect(mockSelectPlaylistTracks).toHaveBeenCalledWith(expect.stringContaining('track_name'));
        expect(mockSelectPlaylistTracks).toHaveBeenCalledWith(expect.stringContaining('artist_name'));
        expect(mockSelectPlaylistTracks).toHaveBeenCalledWith(expect.stringContaining('preview_url'));
        expect(mockSelectPlaylistTracks).toHaveBeenCalledWith(expect.stringContaining('artwork_url'));
        expect(mockSelectPlaylistTracks).toHaveBeenCalledWith(expect.stringContaining('track_view_url'));
        expect(mockSelectPlaylistTracks).toHaveBeenCalledWith(expect.not.stringContaining('metadata'));
    });

    it('should select explicit columns from track_pool for likes playlist', async () => {
        const playlistId = 'likes';
        const params = Promise.resolve({ id: playlistId });
        const request = new NextRequest(`http://localhost/api/playlists/${playlistId}`);

        const mockLikesQuery = {
            select: mockSelectLikes,
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
                data: [],
                error: null
            })
        };

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'likes') return mockLikesQuery as any;
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
            } as any;
        });

        await GET(request, { params });

        expect(mockSelectLikes).toHaveBeenCalledWith(expect.stringContaining('track:track_pool('));
        expect(mockSelectLikes).toHaveBeenCalledWith(expect.stringContaining('track_name'));
        expect(mockSelectLikes).toHaveBeenCalledWith(expect.not.stringContaining('metadata'));
    });
});
