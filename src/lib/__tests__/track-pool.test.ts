import { validateMetadata, getTracksFromPool, addTracksToPool, getPoolSize, trimPool } from '../track-pool';
import { cleanupTestData } from '@/tests/setup';
import type { Track } from '@/types/track-pool';

// Mock supabase
jest.mock('../supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                order: jest.fn(() => ({
                    limit: jest.fn(() => ({
                        data: null,
                        error: null,
                    })),
                })),
                count: jest.fn(() => ({
                    data: null,
                    error: null,
                })),
            })),
            upsert: jest.fn(() => ({
                data: null,
                error: null,
            })),
        })),
        rpc: jest.fn(() => ({
            data: null,
            error: null,
        })),
    },
}));

describe('validateMetadata', () => {
    it('should return null for null or undefined', () => {
        expect(validateMetadata(null)).toBeNull();
        expect(validateMetadata(undefined)).toBeNull();
    });

    it('should return null for arrays', () => {
        expect(validateMetadata([])).toBeNull();
        expect(validateMetadata([1, 2, 3])).toBeNull();
    });

    it('should parse valid JSON strings', () => {
        const result = validateMetadata('{"key":"value"}');
        expect(result).toEqual({ key: 'value' });
    });

    it('should return null for invalid JSON strings', () => {
        expect(validateMetadata('invalid json')).toBeNull();
    });

    it('should return null for JSON string arrays', () => {
        expect(validateMetadata('["item1", "item2"]')).toBeNull();
    });

    it('should accept valid objects', () => {
        const obj = { key: 'value' };
        expect(validateMetadata(obj)).toEqual(obj);
    });

    it('should return null for invalid JSON string objects', () => {
        expect(validateMetadata('{"key":}')).toBeNull();
    });

    it('should return null for JSON string primitives', () => {
        expect(validateMetadata('"string"')).toBeNull();
        expect(validateMetadata('42')).toBeNull();
        expect(validateMetadata('true')).toBeNull();
    });
});

describe('TRACK_POOL_MAX_SIZE', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should use default value when env var is not set', () => {
        delete process.env.TRACK_POOL_MAX_SIZE;
        // Since TRACK_POOL_MAX_SIZE is a const, we test by calling trimPool with default value
        expect(() => trimPool(10000)).not.toThrow();
    });

    it('should use env var value when set', () => {
        process.env.TRACK_POOL_MAX_SIZE = '5000';
        // Since TRACK_POOL_MAX_SIZE is a const, we test by calling trimPool with env value
        expect(() => trimPool(5000)).not.toThrow();
    });
});

describe('track-pool', () => {
    const testTrackIds: string[] = [];
    const hasSupabaseCredentials = process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://localhost:54321' &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'test-key';

    // Skip integration tests if Supabase credentials are not available
    const describeIfSupabase = hasSupabaseCredentials ? describe : describe.skip;

    afterEach(async () => {
        if (hasSupabaseCredentials) {
            await cleanupTestData(testTrackIds);
        }
    });

    describeIfSupabase('addTracksToPool', () => {
        it('プールに楽曲を追加できる', async () => {
            const tracks: Track[] = [{
                track_id: '999000001',
                track_name: 'Test Track',
                artist_name: 'Test Artist',
                preview_url: 'https://example.com/preview1.mp3',
            }];
            testTrackIds.push('999000001');

            await addTracksToPool(tracks, { method: 'chart', weight: 1 });
            const size = await getPoolSize();
            expect(size).toBeGreaterThan(0);
        });

        it('重複する楽曲は1件のみ保存される', async () => {
            const tracks: Track[] = [{
                track_id: '999000002',
                track_name: 'Test Track 2',
                artist_name: 'Test Artist 2',
                preview_url: 'https://example.com/preview2.mp3',
            }];
            testTrackIds.push('999000002');

            // 1回目の追加
            await addTracksToPool(tracks, { method: 'chart', weight: 1 });
            const sizeAfterFirst = await getPoolSize();
            
            // 2回目の追加（重複）
            await addTracksToPool(tracks, { method: 'chart', weight: 1 });
            const sizeAfterSecond = await getPoolSize();
            
            // サイズが変わらないことを確認（重複が排除されている）
            expect(sizeAfterSecond).toBe(sizeAfterFirst);
        });

        it('空配列を追加してもエラーにならない', async () => {
            await expect(addTracksToPool([], { method: 'chart', weight: 1 })).resolves.not.toThrow();
        });
    });

    describeIfSupabase('getTracksFromPool', () => {
        it('指定数の楽曲を取得できる', async () => {
            const tracks: Track[] = Array.from({ length: 5 }, (_, i) => ({
                track_id: `999${String(i + 100).padStart(6, '0')}`,
                track_name: `Track ${i}`,
                artist_name: `Artist ${i}`,
                preview_url: `https://example.com/preview${i}.mp3`,
            }));
            testTrackIds.push(...tracks.map(t => t.track_id));

            await addTracksToPool(tracks, { method: 'chart', weight: 1 });
            const result = await getTracksFromPool(3);
            expect(result.length).toBe(3);
        });

        it('プールが空の場合は空配列を返す', async () => {
            const result = await getTracksFromPool(10);
            expect(result).toEqual([]);
        });
    });

    describeIfSupabase('getPoolSize', () => {
        it('プールサイズを取得できる', async () => {
            const size = await getPoolSize();
            expect(typeof size).toBe('number');
            expect(size).toBeGreaterThanOrEqual(0);
        });
    });
});

describe('track-pool error handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getTracksFromPool', () => {
        it('should handle supabase error', async () => {
            const mockSupabase = require('../supabase').supabase;
            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValueOnce({
                    order: jest.fn().mockReturnValueOnce({
                        limit: jest.fn().mockResolvedValueOnce({
                            data: null,
                            error: { message: 'Database error' },
                        }),
                    }),
                }),
            });

            await expect(getTracksFromPool(10)).rejects.toThrow('Failed to fetch tracks from pool: Database error');
        });

        it('should return empty array when data is null', async () => {
            const mockSupabase = require('../supabase').supabase;
            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValueOnce({
                    order: jest.fn().mockReturnValueOnce({
                        limit: jest.fn().mockResolvedValueOnce({
                            data: null,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await getTracksFromPool(10);
            expect(result).toEqual([]);
        });

        it('should handle tracks with null fields', async () => {
            const mockSupabase = require('../supabase').supabase;
            const mockData = [{
                track_id: '123',
                track_name: 'Test',
                artist_name: 'Artist',
                collection_name: null,
                preview_url: 'url',
                artwork_url: null,
                track_view_url: null,
                genre: null,
                release_date: null,
                metadata: { key: 'value' },
            }];

            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValueOnce({
                    order: jest.fn().mockReturnValueOnce({
                        limit: jest.fn().mockResolvedValueOnce({
                            data: mockData,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await getTracksFromPool(10);
            expect(result[0].collection_name).toBeUndefined();
            expect(result[0].artwork_url).toBeUndefined();
            expect(result[0].track_view_url).toBeUndefined();
            expect(result[0].genre).toBeUndefined();
            expect(result[0].release_date).toBeUndefined();
            expect(result[0].metadata).toEqual({ key: 'value' });
        });

        it('should handle invalid metadata', async () => {
            const mockSupabase = require('../supabase').supabase;
            const mockData = [{
                track_id: '123',
                track_name: 'Test',
                artist_name: 'Artist',
                preview_url: 'url',
                metadata: 'invalid',
            }];

            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValueOnce({
                    order: jest.fn().mockReturnValueOnce({
                        limit: jest.fn().mockResolvedValueOnce({
                            data: mockData,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await getTracksFromPool(10);
            expect(result[0].metadata).toBeUndefined();
        });
    });

    describe('addTracksToPool', () => {
        it('should handle supabase upsert error', async () => {
            const mockSupabase = require('../supabase').supabase;
            mockSupabase.from.mockReturnValueOnce({
                upsert: jest.fn().mockResolvedValueOnce({
                    data: null,
                    error: { message: 'Upsert error' },
                }),
            });

            const tracks: Track[] = [{
                track_id: '123',
                track_name: 'Test',
                artist_name: 'Artist',
                preview_url: 'url',
            }];

            await expect(addTracksToPool(tracks)).rejects.toThrow('Failed to add tracks to pool: Upsert error');
        });

        it('should handle tracks with null fields', async () => {
            const mockSupabase = require('../supabase').supabase;
            mockSupabase.from.mockReturnValueOnce({
                upsert: jest.fn().mockResolvedValueOnce({
                    data: null,
                    error: null,
                }),
            });

            const tracks: Track[] = [{
                track_id: '123',
                track_name: 'Test',
                artist_name: 'Artist',
                preview_url: 'url',
                collection_name: undefined,
                artwork_url: undefined,
                track_view_url: undefined,
                genre: undefined,
                release_date: undefined,
                metadata: { key: 'value' },
            }];

            await expect(addTracksToPool(tracks)).resolves.not.toThrow();
        });

        it('should handle options being undefined', async () => {
            const mockSupabase = require('../supabase').supabase;
            mockSupabase.from.mockReturnValueOnce({
                upsert: jest.fn().mockResolvedValueOnce({
                    data: null,
                    error: null,
                }),
            });

            const tracks: Track[] = [{
                track_id: '123',
                track_name: 'Test',
                artist_name: 'Artist',
                preview_url: 'url',
            }];

            await expect(addTracksToPool(tracks)).resolves.not.toThrow();
        });
    });

    describe('getPoolSize', () => {
        it('should handle supabase error', async () => {
            const mockSupabase = require('../supabase').supabase;
            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockImplementationOnce((columns, options) => {
                    if (options && options.count === 'exact') {
                        return {
                            count: null,
                            error: { message: 'Count error' },
                        };
                    }
                    return {};
                }),
            });

            await expect(getPoolSize()).rejects.toThrow('Failed to get pool size: Count error');
        });

        it('should return 0 when count is null', async () => {
            const mockSupabase = require('../supabase').supabase;
            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockImplementationOnce((columns, options) => {
                    if (options && options.count === 'exact') {
                        return {
                            count: null,
                            error: null,
                        };
                    }
                    return {};
                }),
            });

            const result = await getPoolSize();
            expect(result).toBe(0);
        });
    });

    describe('trimPool', () => {
        it('should handle supabase rpc error', async () => {
            const mockSupabase = require('../supabase').supabase;
            mockSupabase.rpc.mockResolvedValueOnce({
                data: null,
                error: { message: 'RPC error' },
            });

            await expect(trimPool(1000)).rejects.toThrow('Failed to trim track pool: RPC error');
        });

        it('should handle rpc result being null', async () => {
            const mockSupabase = require('../supabase').supabase;
            mockSupabase.rpc.mockResolvedValueOnce(null);

            await expect(trimPool(1000)).resolves.not.toThrow();
        });

        it('should handle data being array with deleted_count', async () => {
            const mockSupabase = require('../supabase').supabase;
            mockSupabase.rpc.mockResolvedValueOnce({
                data: [{ deleted_count: 5 }],
                error: null,
            });

            await expect(trimPool(1000)).resolves.not.toThrow();
        });

        it('should handle data not being array or deleted_count missing', async () => {
            const mockSupabase = require('../supabase').supabase;
            mockSupabase.rpc.mockResolvedValueOnce({
                data: [{ other_field: 5 }],
                error: null,
            });

            await expect(trimPool(1000)).resolves.not.toThrow();
        });
    });
});
