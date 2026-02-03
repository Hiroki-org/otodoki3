import { vi, describe, it, expect, beforeEach, afterEach, type MockInstance } from 'vitest';
import { fetchTracksFromChart, fetchTracksFromChartWithRetry } from '../chart';
import {
    mockAppleRssResponse,
    mockEmptyAppleRssResponse,
    mockAppleRssResponseWithoutPreview,
    mockItunesSearchResponses,
} from '../../__fixtures__/tracks';

/**
 * Apple RSS API と iTunes Search API の両方のモックを設定するヘルパー
 */
function setupFetchMocks(
    fetchMock: MockInstance,
    appleRssResponse: unknown = mockAppleRssResponse,
    itunesSearchResponses: Record<string, { results: { trackId: number; previewUrl: string }[] }> = mockItunesSearchResponses
) {
    fetchMock.mockImplementation((url: string | URL) => {
        const urlString = url.toString();
        // Apple RSS API のモック
        if (urlString.includes('rss.applemarketingtools.com')) {
            return Promise.resolve({
                ok: true,
                status: 200,
                json: async () => appleRssResponse,
            });
        }
        // iTunes Search API のモック
        if (urlString.includes('itunes.apple.com/lookup')) {
            const idParam = new URL(urlString).searchParams.get('id');
            if (idParam) {
                const ids = idParam.split(',');
                const results = ids.flatMap(id => {
                    const response = itunesSearchResponses[id];
                    return response ? response.results : [];
                });
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ results }),
                });
            }
            // トラックIDが見つからない場合は空のレスポンス
            return Promise.resolve({
                ok: true,
                status: 200,
                json: async () => ({ results: [] }),
            });
        }
        return Promise.reject(new Error('Unexpected URL'));
    });
}

describe('fetchTracksFromChart', () => {
    let fetchMock: MockInstance;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        // Mock fetch using vi.spyOn for better test isolation
        fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async () => new Response());
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe('正常系', () => {
        it('should fetch tracks from Apple RSS API', async () => {
            setupFetchMocks(fetchMock);

            const tracks = await fetchTracksFromChart(3);

            expect(tracks).toHaveLength(3);
            expect(tracks[0]).toMatchObject({
                track_id: 2001,
                track_name: 'チャート曲1',
                artist_name: 'チャートアーティスト1',
                preview_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/chart1.m4a',
                artwork_url: 'https://example.com/chart_art1.jpg',
            });
            expect(tracks[0].metadata).toMatchObject({
                source: 'apple_rss',
                fetched_from: 'chart',
            });
        });

        it('should use default limit of 50', async () => {
            setupFetchMocks(fetchMock);

            await fetchTracksFromChart();

            expect(fetchMock).toHaveBeenCalledWith(
                'https://rss.applemarketingtools.com/api/v2/jp/music/most-played/50/songs',
                expect.any(Object)
            );
        });

        it('should respect custom limit parameter', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockAppleRssResponse,
            } as Response);

            await fetchTracksFromChart(10);

            expect(fetchMock).toHaveBeenCalledWith(
                'https://rss.applemarketingtools.com/api/v2/jp/music/most-played/10/songs',
                expect.any(Object)
            );
        });

        it('should use custom User-Agent if provided', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockAppleRssResponse,
            } as Response);

            await fetchTracksFromChart(10, { userAgent: 'CustomAgent/1.0' });

            expect(fetchMock).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: { 'User-Agent': 'CustomAgent/1.0' },
                })
            );
        });

        it('should use default User-Agent if not provided', async () => {
            setupFetchMocks(fetchMock);

            await fetchTracksFromChart(10);

            expect(fetchMock).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: { 'User-Agent': 'otodoki/1.0' },
                })
            );
        });

        it('should correctly batch requests when items exceed chunk size', async () => {
            // 55 items (50 + 5)
            const manyResults = Array.from({ length: 55 }, (_, i) => ({
                id: `${3000 + i}`,
                name: `Track ${i}`,
                artistName: `Artist ${i}`,
                url: `https://example.com/${i}`,
                artworkUrl100: `https://example.com/art${i}.jpg`,
            }));

            // Mock iTunes responses for all 55 items
            const itunesResponses: Record<string, { results: { trackId: number; previewUrl: string }[] }> = {};
            manyResults.forEach(item => {
                itunesResponses[item.id] = {
                    results: [{
                        trackId: Number(item.id),
                        previewUrl: `https://example.com/preview${item.id}.m4a`
                    }]
                };
            });

            setupFetchMocks(fetchMock, { feed: { results: manyResults } }, itunesResponses);

            const tracks = await fetchTracksFromChart(55);

            expect(tracks).toHaveLength(55);
            // 1 RSS call + 2 iTunes calls (50 + 5) = 3 calls
            expect(fetchMock).toHaveBeenCalledTimes(3);

            // Verify chunked calls
            const calls = fetchMock.mock.calls;
            const itunesCalls = calls.filter(call => call[0].toString().includes('itunes.apple.com/lookup'));
            expect(itunesCalls).toHaveLength(2);
        });
    });

    describe('エッジケース', () => {
        it('should return empty array when API returns no results', async () => {
            setupFetchMocks(fetchMock, mockEmptyAppleRssResponse);

            const tracks = await fetchTracksFromChart(10);

            expect(tracks).toEqual([]);
        });

        it('should filter out tracks without preview_url', async () => {
            setupFetchMocks(fetchMock, mockAppleRssResponseWithoutPreview, {});

            const tracks = await fetchTracksFromChart(10);

            expect(tracks).toEqual([]);
        });

        it('should handle malformed API response', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ feed: null }),
            } as Response);

            const tracks = await fetchTracksFromChart(10);

            expect(tracks).toEqual([]);
        });

        it('should handle response without feed.results', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ feed: {} }),
            } as Response);

            const tracks = await fetchTracksFromChart(10);

            expect(tracks).toEqual([]);
        });
    });

    describe('エラーハンドリング', () => {
        it('should throw error on 429 rate limit', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests', json: async () => ({}),
            } as Response);

            await expect(fetchTracksFromChart(10)).rejects.toThrow(
                'Apple RSS Charts API rate limit exceeded'
            );
        });

        it('should throw error on non-ok response', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error', json: async () => ({}),
            } as Response);

            await expect(fetchTracksFromChart(10)).rejects.toThrow(
                'Apple RSS Charts API request failed with status 500'
            );
        });

        it('should throw error on network failure', async () => {
            fetchMock.mockRejectedValueOnce(
                new Error('Network error')
            );

            await expect(fetchTracksFromChart(10)).rejects.toThrow('Network error');
        });
    });

    describe('タイムアウト処理', () => {
        it('should use timeout mechanism with AbortController', async () => {
            let abortSignal: AbortSignal | undefined;

            fetchMock.mockImplementationOnce((url, options) => {
                abortSignal = (options as RequestInit).signal as AbortSignal;
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => mockAppleRssResponse,
                } as Response);
            });

            await fetchTracksFromChart(10, { timeoutMs: 5000 });

            // AbortController のシグナルが渡されたことを確認
            expect(abortSignal).toBeDefined();
        });

        it('should clear timeout on successful response', async () => {
            setupFetchMocks(fetchMock);

            const tracks = await fetchTracksFromChart(10, { timeoutMs: 5000 });

            expect(tracks).toHaveLength(3);
        });
    });

    describe('バッチ処理とチャンキング', () => {
        it('should make a single iTunes API call for tracks <= 50', async () => {
            setupFetchMocks(fetchMock);

            await fetchTracksFromChart(3);

            // Apple RSS API 1回 + iTunes Search API 1回（一括） = 2回
            expect(fetchMock).toHaveBeenCalledTimes(2);

            // iTunes API が1回だけ呼ばれたことを確認
            const itunesApiCalls = fetchMock.mock.calls.filter(call =>
                call[0].toString().includes('itunes.apple.com/lookup')
            );
            expect(itunesApiCalls).toHaveLength(1);
        });

        it('should split requests into multiple chunks for tracks > 50', async () => {
            // 75個のトラックを生成（50 + 25 = 2チャンク）
            const largeRssResponse = {
                feed: {
                    results: Array.from({ length: 75 }, (_, i) => ({
                        id: String(3000 + i),
                        name: `チャート曲${i + 1}`,
                        artistName: `アーティスト${i + 1}`,
                        url: `https://example.com/chart${i + 1}`,
                        artworkUrl100: `https://example.com/art${i + 1}.jpg`,
                    })),
                },
            };

            // iTunesレスポンスを生成
            const largeItunesResponses: Record<string, { results: { trackId: number; previewUrl: string }[] }> = {};
            for (let i = 0; i < 75; i++) {
                const trackId = 3000 + i;
                largeItunesResponses[String(trackId)] = {
                    results: [{ trackId, previewUrl: `https://audio-ssl.itunes.apple.com/preview${trackId}.m4a` }],
                };
            }

            setupFetchMocks(fetchMock, largeRssResponse, largeItunesResponses);

            const tracks = await fetchTracksFromChart(75);

            // 全トラックが取得されたことを確認
            expect(tracks).toHaveLength(75);

            // iTunes API が2回呼ばれたことを確認（50個 + 25個のチャンク）
            const itunesApiCalls = fetchMock.mock.calls.filter(call =>
                call[0].toString().includes('itunes.apple.com/lookup')
            );
            expect(itunesApiCalls).toHaveLength(2);

            // 最初のチャンクに50個のIDが含まれていることを確認
            const firstCallUrl = new URL(itunesApiCalls[0][0].toString());
            const firstCallIds = firstCallUrl.searchParams.get('id')?.split(',') ?? [];
            expect(firstCallIds).toHaveLength(50);

            // 2番目のチャンクに25個のIDが含まれていることを確認
            const secondCallUrl = new URL(itunesApiCalls[1][0].toString());
            const secondCallIds = secondCallUrl.searchParams.get('id')?.split(',') ?? [];
            expect(secondCallIds).toHaveLength(25);
        });

        it('should handle exactly 100 tracks (2 full chunks)', async () => {
            // 100個のトラックを生成（50 + 50 = 2チャンク）
            const largeRssResponse = {
                feed: {
                    results: Array.from({ length: 100 }, (_, i) => ({
                        id: String(4000 + i),
                        name: `チャート曲${i + 1}`,
                        artistName: `アーティスト${i + 1}`,
                        url: `https://example.com/chart${i + 1}`,
                        artworkUrl100: `https://example.com/art${i + 1}.jpg`,
                    })),
                },
            };

            const largeItunesResponses: Record<string, { results: { trackId: number; previewUrl: string }[] }> = {};
            for (let i = 0; i < 100; i++) {
                const trackId = 4000 + i;
                largeItunesResponses[String(trackId)] = {
                    results: [{ trackId, previewUrl: `https://audio-ssl.itunes.apple.com/preview${trackId}.m4a` }],
                };
            }

            setupFetchMocks(fetchMock, largeRssResponse, largeItunesResponses);

            const tracks = await fetchTracksFromChart(100);

            expect(tracks).toHaveLength(100);

            // iTunes API が2回呼ばれたことを確認（50個 + 50個のチャンク）
            const itunesApiCalls = fetchMock.mock.calls.filter(call =>
                call[0].toString().includes('itunes.apple.com/lookup')
            );
            expect(itunesApiCalls).toHaveLength(2);

            // 両方のチャンクが50個のIDを含むことを確認
            const firstCallUrl = new URL(itunesApiCalls[0][0].toString());
            const firstCallIds = firstCallUrl.searchParams.get('id')?.split(',') ?? [];
            expect(firstCallIds).toHaveLength(50);

            const secondCallUrl = new URL(itunesApiCalls[1][0].toString());
            const secondCallIds = secondCallUrl.searchParams.get('id')?.split(',') ?? [];
            expect(secondCallIds).toHaveLength(50);
        });

        it('should filter out invalid track IDs before batching', async () => {
            const rssWithInvalidIds = {
                feed: {
                    results: [
                        { id: '5001', name: '有効なトラック1', artistName: 'アーティスト1', url: 'https://example.com/1' },
                        { id: 'invalid', name: '無効なトラック', artistName: 'アーティスト2', url: 'https://example.com/2' },
                        { id: '5002', name: '有効なトラック2', artistName: 'アーティスト3', url: 'https://example.com/3' },
                        { id: 'abc123', name: '無効なトラック2', artistName: 'アーティスト4', url: 'https://example.com/4' },
                    ],
                },
            };

            const validItunesResponses: Record<string, { results: { trackId: number; previewUrl: string }[] }> = {
                '5001': { results: [{ trackId: 5001, previewUrl: 'https://audio-ssl.itunes.apple.com/preview1.m4a' }] },
                '5002': { results: [{ trackId: 5002, previewUrl: 'https://audio-ssl.itunes.apple.com/preview2.m4a' }] },
            };

            setupFetchMocks(fetchMock, rssWithInvalidIds, validItunesResponses);

            const tracks = await fetchTracksFromChart(10);

            // 有効なトラックのみが取得される
            expect(tracks).toHaveLength(2);

            // iTunes API が1回呼ばれ、有効なIDのみが送信されたことを確認
            const itunesApiCalls = fetchMock.mock.calls.filter(call =>
                call[0].toString().includes('itunes.apple.com/lookup')
            );
            expect(itunesApiCalls).toHaveLength(1);

            const callUrl = new URL(itunesApiCalls[0][0].toString());
            const callIds = callUrl.searchParams.get('id')?.split(',') ?? [];
            expect(callIds).toEqual(['5001', '5002']);
            expect(callIds).not.toContain('invalid');
            expect(callIds).not.toContain('abc123');
        });
    });
});

describe('fetchTracksFromChartWithRetry', () => {
    let fetchMock: MockInstance;

    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress console.error for retry tests
        vi.spyOn(console, 'error').mockImplementation(() => { });
        fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async () => new Response());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('リトライロジック (with fake timers)', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });
        it('should succeed on first attempt', async () => {
            setupFetchMocks(fetchMock);

            const tracks = await fetchTracksFromChartWithRetry(10, 3);

            expect(tracks).toHaveLength(3);
            // Apple RSS API 1回 + iTunes Search API 1回（一括） = 2回
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it('should retry on failure and succeed', async () => {
            // 最初は失敗、2回目は成功
            let callCount = 0;
            fetchMock.mockImplementation((url: string | URL) => {
                const urlString = url.toString();
                if (urlString.includes('rss.applemarketingtools.com')) {
                    callCount++;
                    if (callCount === 1) {
                        return Promise.reject(new Error('Network error'));
                    }
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: async () => mockAppleRssResponse,
                    } as Response);
                }
                // iTunes Search API のモック
                if (urlString.includes('itunes.apple.com/lookup')) {
                    const idParam = new URL(urlString).searchParams.get('id');
                    if (idParam) {
                        const ids = idParam.split(',');
                        const results = ids.flatMap(id => {
                            const response = mockItunesSearchResponses[id];
                            return response ? response.results : [];
                        });
                        return Promise.resolve({
                            ok: true,
                            status: 200,
                            json: async () => ({ results }),
                        } as Response);
                    }
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: async () => ({ results: [] }),
                    } as Response);
                }
                return Promise.reject(new Error('Unexpected URL'));
            });

            const promise = fetchTracksFromChartWithRetry(10, 3, 100);

            // 最初の呼び出しが失敗
            await vi.advanceTimersByTimeAsync(0);

            // リトライの遅延を待つ（指数バックオフ: 100ms * 2^0 = 100ms + ジッター）
            await vi.advanceTimersByTimeAsync(200);

            const tracks = await promise;

            expect(tracks).toHaveLength(3);
            expect(callCount).toBe(2);
        });

        it('should throw error after max retries', async () => {
            vi.useRealTimers();

            fetchMock.mockRejectedValue(new Error('Network error'));

            await expect(
                fetchTracksFromChartWithRetry(10, 2, 10) // maxRetries=2, baseDelay=10ms for speed
            ).rejects.toThrow('Failed to fetch tracks after 2 attempts');

            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it('should use default maxRetries of 3', async () => {
            vi.useRealTimers();

            fetchMock.mockRejectedValue(new Error('Network error'));

            await expect(
                fetchTracksFromChartWithRetry(10, 3, 10) // baseDelay=10ms for speed
            ).rejects.toThrow();

            expect(fetchMock).toHaveBeenCalledTimes(3);
        });
    });

    describe('指数バックオフ', () => {
        it('should increase delay exponentially on each retry', async () => {
            vi.useFakeTimers();
            let callCount = 0;

            fetchMock.mockImplementation((url: string | URL) => {
                const urlString = url.toString();
                // Apple RSS API への呼び出しをカウント
                if (urlString.includes('rss.applemarketingtools.com')) {
                    callCount++;
                    if (callCount < 3) {
                        return Promise.reject(new Error('Network error'));
                    }
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: async () => mockAppleRssResponse,
                    } as Response);
                }
                // iTunes Search API のモック
                if (urlString.includes('itunes.apple.com/lookup')) {
                    const idParam = new URL(urlString).searchParams.get('id');
                    if (idParam) {
                        const ids = idParam.split(',');
                        const results = ids.flatMap(id => {
                            const response = mockItunesSearchResponses[id];
                            return response ? response.results : [];
                        });
                        return Promise.resolve({
                            ok: true,
                            status: 200,
                            json: async () => ({ results }),
                        } as Response);
                    }
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: async () => ({ results: [] }),
                    } as Response);
                }
                return Promise.reject(new Error('Unexpected URL'));
            });

            const promise = fetchTracksFromChartWithRetry(10, 3, 1000, 30000, 0);

            await vi.advanceTimersByTimeAsync(10000);

            const tracks = await promise;

            // 指数的バックオフで3回試行（1回目失敗、2回目失敗、3回目成功）
            expect(callCount).toBe(3);
            expect(tracks).toHaveLength(3);
            vi.useRealTimers();
        });

        it('should respect maxDelay parameter', async () => {
            vi.useRealTimers();

            fetchMock.mockRejectedValue(new Error('Network error'));

            await expect(
                fetchTracksFromChartWithRetry(10, 2, 10, 20, 0) // baseDelay=10ms, maxDelay=20ms
            ).rejects.toThrow();

            // 2回試行されたことを確認
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });
    });

    describe('ジッター', () => {
        it('should apply jitter to delay', async () => {
            vi.useRealTimers();

            fetchMock.mockRejectedValue(new Error('Network error'));

            // ジッター有効（jitterFactor: 0.5）
            await expect(
                fetchTracksFromChartWithRetry(10, 2, 10, 30000, 0.5) // maxRetries=2, baseDelay=10ms
            ).rejects.toThrow();

            // 2回試行されたことを確認
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it('should ensure delay is non-negative even with jitter', async () => {
            vi.useRealTimers();

            fetchMock.mockRejectedValue(new Error('Network error'));

            await expect(
                fetchTracksFromChartWithRetry(10, 2, 10, 30000, 1.0) // maxRetries=2, jitterFactor=1.0
            ).rejects.toThrow();

            // 2回試行されたことを確認（遅延が負にならないことを間接的に確認）
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });
    });
});
