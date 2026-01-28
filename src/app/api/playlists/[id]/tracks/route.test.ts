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

        // Mock select for existing tracks
        // First call is from verifyPlaylistOwnership (result ignored)
        mockSupabase.mockSelect.mockResolvedValueOnce({ data: [], error: null });
        // Second call is from our new logic - return all tracks as existing
        mockSupabase.mockSelect.mockResolvedValueOnce({
            data: [{ track_id: 101 }, { track_id: 102 }, { track_id: 103 }],
            error: null,
        });

        // Mock upsert
        mockSupabase.mockUpsert.mockResolvedValue({
            error: null,
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'PATCH',
            body: JSON.stringify({ tracks: [103, 101, 102] }),
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await PATCH(req, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        // Expect 3 update calls (one per track)
        expect(mockSupabase.mockUpdate).toHaveBeenCalledTimes(3);
    });

    it('should return 400 when tracks array is empty', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'PATCH',
            body: JSON.stringify({ tracks: [] }),
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await PATCH(req, { params });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Tracks array is required');
    });

    it('should return 400 when tracks array contains duplicates', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });

        // verifyPlaylistOwnership
        mockSupabase.mockSingle.mockResolvedValueOnce({
            data: { id: 'playlist-1' },
            error: null,
        });

        // Mock existing tracks
        mockSupabase.mockSelect.mockResolvedValueOnce({ data: null, error: null }); // Consumed by verifyPlaylistOwnership
        mockSupabase.mockSelect.mockResolvedValueOnce({
            data: [
                { track_id: 101 },
                { track_id: 102 },
                { track_id: 103 },
            ],
            error: null,
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'PATCH',
            body: JSON.stringify({ tracks: [101, 101, 102] }), // 101 is duplicated
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await PATCH(req, { params });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Duplicate track IDs are not allowed in reorder request');
    });

    it('should return 400 when trying to reorder tracks not in playlist', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });

        // verifyPlaylistOwnership
        mockSupabase.mockSingle.mockResolvedValueOnce({
            data: { id: 'playlist-1' },
            error: null,
        });

        // Mock existing tracks (has 101, 102)
        mockSupabase.mockSelect.mockResolvedValueOnce({ data: null, error: null }); // Consumed by verifyPlaylistOwnership
        mockSupabase.mockSelect.mockResolvedValueOnce({
            data: [
                { track_id: 101 },
                { track_id: 102 },
            ],
            error: null,
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'PATCH',
            body: JSON.stringify({ tracks: [101, 102, 999] }), // 999 not in playlist
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await PATCH(req, { params });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Some tracks are not in the playlist');
        expect(data.invalid_tracks).toContain(999);
    });

    it('should return 400 when not all tracks are included in reorder', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });

        // verifyPlaylistOwnership
        mockSupabase.mockSingle.mockResolvedValueOnce({
            data: { id: 'playlist-1' },
            error: null,
        });

        // Mock existing tracks (has 101, 102, 103)
        mockSupabase.mockSelect.mockResolvedValueOnce({ data: null, error: null }); // Consumed by verifyPlaylistOwnership
        mockSupabase.mockSelect.mockResolvedValueOnce({
            data: [
                { track_id: 101 },
                { track_id: 102 },
                { track_id: 103 },
            ],
            error: null,
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'PATCH',
            body: JSON.stringify({ tracks: [101, 102] }), // Missing track 103
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await PATCH(req, { params });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('All tracks in the playlist must be included in the reorder request');
        expect(data.expected_count).toBe(3);
        expect(data.provided_count).toBe(2);
    });

    it('should return 500 when update fails', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });

        // verifyPlaylistOwnership
        mockSupabase.mockSingle.mockResolvedValueOnce({
            data: { id: 'playlist-1' },
            error: null,
        });

        // Mock existing tracks
        mockSupabase.mockSelect.mockResolvedValueOnce({ data: null, error: null }); // Consumed by verifyPlaylistOwnership
        mockSupabase.mockSelect.mockResolvedValueOnce({
            data: [
                { track_id: 101 },
                { track_id: 102 },
            ],
            error: null,
        });

        // Mock update to fail
        mockSupabase.mockUpdate.mockResolvedValue({
            error: { message: 'Database error' },
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'PATCH',
            body: JSON.stringify({ tracks: [102, 101] }),
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await PATCH(req, { params });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to update order completely');
        expect(data.failed_tracks).toEqual([102, 101]);
    });

    it('should ignore tracks not in the playlist', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: mockAuthenticatedUser },
            error: null,
        });

        // verifyPlaylistOwnership
        mockSupabase.mockSingle.mockResolvedValueOnce({
            data: { id: 'playlist-1' },
            error: null,
        });

        // Mock select for existing tracks
        // First call is from verifyPlaylistOwnership (.select('id')) - result ignored
        mockSupabase.mockSelect.mockResolvedValueOnce({ data: [], error: null });
        // Second call is from our new logic (.select('track_id')) - result used
        mockSupabase.mockSelect.mockResolvedValueOnce({
            data: [{ track_id: 101 }, { track_id: 102 }],
            error: null,
        });

        // Mock upsert
        mockSupabase.mockUpsert.mockResolvedValue({
            error: null,
        });

        const req = new NextRequest('http://localhost/api/playlists/playlist-1/tracks', {
            method: 'PATCH',
            // 999 is unknown (not in mockSelect response)
            body: JSON.stringify({ tracks: [101, 999, 102] }),
        });

        const params = Promise.resolve({ id: 'playlist-1' });
        const response = await PATCH(req, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);

        // Expect 1 upsert with filtered data
        expect(mockSupabase.mockUpsert).toHaveBeenCalledTimes(1);
        expect(mockSupabase.mockUpsert).toHaveBeenCalledWith(
            [
                { playlist_id: 'playlist-1', track_id: 101, position: 0 },
                // 999 skipped
                { playlist_id: 'playlist-1', track_id: 102, position: 2 },
            ],
            { onConflict: 'playlist_id,track_id' }
        );
    });
});
