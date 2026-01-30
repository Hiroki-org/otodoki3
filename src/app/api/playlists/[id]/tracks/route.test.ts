import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, PATCH } from './route';
import { createMockSupabaseClient, mockAuthenticatedUser } from '@/test/api-test-utils';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');

describe('POST /api/playlists/[id]/tracks', () => {
    let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it('should add a track successfully', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });

        // verifyPlaylistOwnership
        mockSupabase.mockSingle.mockResolvedValueOnce({
            data: { id: 'playlist-1' },
            error: null,
        });

        // track_pool lookup
        mockSupabase.mockSingle.mockResolvedValueOnce({
            data: {
                track_id: 12345,
                track_name: 'Test Track',
                artist_name: 'Test Artist',
                artwork_url: 'https://example.com/artwork.jpg',
                preview_url: 'https://example.com/preview.mp3',
            },
            error: null,
        });

        // maxPosData (empty playlist)
        mockSupabase.mockMaybeSingle.mockResolvedValueOnce({
            data: null,
            error: null,
        });

        // insert
        mockSupabase.mockInsert.mockResolvedValueOnce({
            error: null,
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'POST',
            body: JSON.stringify({ track_id: '12345' }),
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await POST(req, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it('should handle unique constraint violation (409)', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });

        // verifyPlaylistOwnership
        mockSupabase.mockSingle.mockResolvedValueOnce({
            data: { id: 'playlist-1' },
            error: null,
        });

        // maxPosData
        mockSupabase.mockMaybeSingle.mockResolvedValueOnce({
            data: { position: 1 },
            error: null,
        });

        // insert error (23505)
        mockSupabase.mockInsert.mockResolvedValueOnce({
            error: { code: '23505', message: 'Unique violation' },
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'POST',
            body: JSON.stringify({ track_id: '12345' }),
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await POST(req, { params });
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toBe('Track already in playlist');
    });
});

describe('PATCH /api/playlists/[id]/tracks', () => {
    let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it('should reorder tracks successfully', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });

        // verifyPlaylistOwnership
        mockSupabase.mockSingle.mockResolvedValueOnce({
            data: { id: 'playlist-1' },
            error: null,
        });

        // Mock select calls
        // 1. verifyPlaylistOwnership calls select('id')
        mockSupabase.mockSelect.mockResolvedValueOnce({ data: null, error: null });

        // 2. Fetch existing tracks
        mockSupabase.mockSelect.mockResolvedValueOnce({
            data: [{ track_id: 12345 }, { track_id: 67890 }],
            error: null,
        });

        // Mock upsert
        mockSupabase.mockUpsert.mockResolvedValueOnce({
            error: null,
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'PATCH',
            body: JSON.stringify({ tracks: ['12345', '67890'] }),
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await PATCH(req, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);

        // Verify upsert was called with correct data
        expect(mockSupabase.mockUpsert).toHaveBeenCalledWith([
            { playlist_id: 'playlist-1', track_id: 12345, position: 0 },
            { playlist_id: 'playlist-1', track_id: 67890, position: 1 }
        ], { onConflict: 'playlist_id,track_id' });
    });

    it('should ignore unknown tracks during reorder', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });

        // verifyPlaylistOwnership
        mockSupabase.mockSingle.mockResolvedValueOnce({
            data: { id: 'playlist-1' },
            error: null,
        });

        // Mock select calls
        // 1. verifyPlaylistOwnership calls select('id')
        mockSupabase.mockSelect.mockResolvedValueOnce({ data: null, error: null });

        // 2. Fetch existing tracks (only 12345 exists)
        mockSupabase.mockSelect.mockResolvedValueOnce({
            data: [{ track_id: 12345 }],
            error: null,
        });

        // Mock upsert
        mockSupabase.mockUpsert.mockResolvedValueOnce({
            error: null,
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'PATCH',
            body: JSON.stringify({ tracks: ['12345', '99999'] }), // 99999 is unknown
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await PATCH(req, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);

        // Verify upsert was called ONLY with 12345
        expect(mockSupabase.mockUpsert).toHaveBeenCalledWith([
            { playlist_id: 'playlist-1', track_id: 12345, position: 0 }
        ], { onConflict: 'playlist_id,track_id' });
    });

    it('should return 204 when no tracks to update', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });

        // verifyPlaylistOwnership
        mockSupabase.mockSingle.mockResolvedValueOnce({
            data: { id: 'playlist-1' },
            error: null,
        });

        // Mock select calls
        // 1. verifyPlaylistOwnership calls select('id')
        mockSupabase.mockSelect.mockResolvedValueOnce({ data: null, error: null });

        // 2. Fetch existing tracks (none found)
        mockSupabase.mockSelect.mockResolvedValueOnce({
            data: [],
            error: null,
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'PATCH',
            body: JSON.stringify({ tracks: ['99999'] }), // 99999 is unknown
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await PATCH(req, { params });

        expect(response.status).toBe(204);
        expect(mockSupabase.mockUpsert).not.toHaveBeenCalled();
    });
});
