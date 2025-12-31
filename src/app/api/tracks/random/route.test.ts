import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { createMockSupabaseClient, mockAuthenticatedUser, mockTrackPoolData } from '@/test/api-test-utils';

// Supabase クライアントをモック
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase/server');
const { createAdminClient } = await import('@/lib/supabase/admin');

describe('GET /api/tracks/random', () => {
    let mockUserSupabase: ReturnType<typeof createMockSupabaseClient>;
    let mockAdminSupabase: ReturnType<typeof createMockSupabaseClient>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockUserSupabase = createMockSupabaseClient();
        mockAdminSupabase = createMockSupabaseClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(createClient).mockResolvedValue(mockUserSupabase as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(createAdminClient).mockReturnValue(mockAdminSupabase as any);
    });

    describe('正常系', () => {
        it('認証済みユーザーがランダムなトラックを取得できる', async () => {
            // Mock authenticated user
            mockUserSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockAuthenticatedUser },
                error: null,
            });

            // Mock empty dislikes and likes (no filtering)
            mockUserSupabase.mockSelect.mockResolvedValueOnce({ data: [], error: null }); // dislikes
            mockUserSupabase.mockSelect.mockResolvedValueOnce({ data: [], error: null }); // likes

            // Mock RPC response for get_random_tracks
            mockAdminSupabase.mockRpc.mockResolvedValue({
                data: mockTrackPoolData.slice(0, 2),
                error: null,
            });

            const request = new NextRequest('http://localhost:3000/api/tracks/random?count=2');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.tracks).toHaveLength(2);
            expect(data.tracks[0]).toHaveProperty('track_id');
            expect(data.tracks[0]).toHaveProperty('track_name');
            expect(data.tracks[0]).toHaveProperty('artist_name');
        });

        it('未認証ユーザーもトラックを取得できる', async () => {
            // Mock unauthenticated user
            mockUserSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: new Error('Not authenticated'),
            });

            // Mock RPC response for get_random_tracks
            mockAdminSupabase.mockRpc.mockResolvedValue({
                data: mockTrackPoolData,
                error: null,
            });

            const request = new NextRequest('http://localhost:3000/api/tracks/random');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.tracks).toBeDefined();
            expect(Array.isArray(data.tracks)).toBe(true);
        });

        it('count パラメータを指定してトラック数を制御できる', async () => {
            mockUserSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const manyTracks = Array.from({ length: 50 }, (_, i) => ({
                track_id: String(i + 1),
                track_name: `Track ${i + 1}`,
                artist_name: `Artist ${i + 1}`,
                artwork_url: `https://example.com/artwork${i + 1}.jpg`,
                preview_url: `https://example.com/preview${i + 1}.mp3`,
            }));

            // Mock RPC response for get_random_tracks with count=25
            mockAdminSupabase.mockRpc.mockResolvedValue({
                data: manyTracks.slice(0, 25),
                error: null,
            });

            const request = new NextRequest('http://localhost:3000/api/tracks/random?count=25');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.tracks).toHaveLength(25);
        });

        it('count が範囲外の場合は適切に制限される（最小1、最大100）', async () => {
            mockUserSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            // Test count=0 (should default to 1)
            mockAdminSupabase.mockRpc.mockResolvedValueOnce({
                data: mockTrackPoolData.slice(0, 1),
                error: null,
            });
            const request1 = new NextRequest('http://localhost:3000/api/tracks/random?count=0');
            const response1 = await GET(request1);
            const data1 = await response1.json();
            expect(data1.tracks).toHaveLength(1);

            // Test count=200 (should be capped at 100, but we only have mockTrackPoolData.length tracks)
            mockAdminSupabase.mockRpc.mockResolvedValueOnce({
                data: mockTrackPoolData,
                error: null,
            });
            const request2 = new NextRequest('http://localhost:3000/api/tracks/random?count=200');
            const response2 = await GET(request2);
            const data2 = await response2.json();
            expect(data2.tracks).toHaveLength(mockTrackPoolData.length);
        });

        it('認証済みユーザーの場合、dislike/like 履歴に基づいてフィルタリングされる', async () => {
            mockUserSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockAuthenticatedUser },
                error: null,
            });

            // Mock dislikes and likes
            mockUserSupabase.mockSelect.mockResolvedValueOnce({
                data: [{ track_id: 12345 }],
                error: null,
            }); // dislikes
            mockUserSupabase.mockSelect.mockResolvedValueOnce({
                data: [{ track_id: 67890 }],
                error: null,
            }); // likes

            // Mock track pool data (should exclude 12345 and 67890)
            const filteredTracks = [
                {
                    track_id: '99999',
                    track_name: 'New Track',
                    artist_name: 'New Artist',
                    artwork_url: 'https://example.com/artwork.jpg',
                    preview_url: 'https://example.com/preview.mp3',
                },
            ];

            mockAdminSupabase.mockRpc.mockResolvedValue({
                data: filteredTracks,
                error: null,
            });

            const request = new NextRequest('http://localhost:3000/api/tracks/random?count=10');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.tracks).toBeDefined();
            // Verify that RPC was called with excluded_track_ids containing both IDs
            expect(mockAdminSupabase.mockRpc).toHaveBeenCalledWith(
                'get_random_tracks',
                expect.objectContaining({
                    limit_count: 10,
                    excluded_track_ids: expect.arrayContaining([
                        '12345',
                        '67890',
                    ]),
                })
            );
        });
    });

    describe('異常系', () => {
        it('トラックプールが空の場合は 404 を返す', async () => {
            mockUserSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            mockAdminSupabase.mockRpc.mockResolvedValue({
                data: [],
                error: null,
            });

            const request = new NextRequest('http://localhost:3000/api/tracks/random');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.success).toBe(false);
            expect(data.error).toContain('No tracks available');
        });

        it('データベースエラー時は 500 を返す', async () => {
            mockUserSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            mockAdminSupabase.mockRpc.mockResolvedValue({
                data: null,
                error: new Error('Database connection failed'),
            });

            const request = new NextRequest('http://localhost:3000/api/tracks/random');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            expect(data.error).toContain('Failed to fetch tracks');
        });
    });

    describe('エッジケース', () => {
        it('count パラメータが不正な値の場合はデフォルト10を使用', async () => {
            mockUserSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            // Create exactly 10 tracks for the expected response
            const tenTracks = Array.from({ length: 10 }, (_, i) => ({
                track_id: String(i + 1),
                track_name: `Track ${i + 1}`,
                artist_name: `Artist ${i + 1}`,
                artwork_url: `https://example.com/artwork${i + 1}.jpg`,
                preview_url: `https://example.com/preview${i + 1}.mp3`,
            }));

            mockAdminSupabase.mockRpc.mockResolvedValue({
                data: tenTracks,
                error: null,
            });

            const request = new NextRequest('http://localhost:3000/api/tracks/random?count=invalid');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.tracks).toHaveLength(10); // Default count
            // Verify RPC was called with count=10
            expect(mockAdminSupabase.mockRpc).toHaveBeenCalledWith(
                'get_random_tracks',
                expect.objectContaining({
                    limit_count: 10,
                })
            );
        });

        it('除外トラック数が多い場合でも正常に動作する', async () => {
            mockUserSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockAuthenticatedUser },
                error: null,
            });

            // Mock 1500 dislikes (exceeds MAX_EXCLUDE of 1000)
            const manyDislikes = Array.from({ length: 1500 }, (_, i) => ({
                track_id: i + 1,
            }));

            mockUserSupabase.mockSelect.mockResolvedValueOnce({
                data: manyDislikes,
                error: null,
            }); // dislikes
            mockUserSupabase.mockSelect.mockResolvedValueOnce({
                data: [],
                error: null,
            }); // likes

            mockAdminSupabase.mockRpc.mockResolvedValue({
                data: mockTrackPoolData,
                error: null,
            });

            const request = new NextRequest('http://localhost:3000/api/tracks/random?count=5');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            // Should handle large exclude list by truncating
        });
    });
});
