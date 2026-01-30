import { describe, it, expect } from 'vitest';

// Simulate network latency and DB processing time
const NETWORK_LATENCY = 20; // ms
const DB_LATENCY = 10; // ms per operation

// Simulate a connection pool/semaphore to realistically limit concurrency
class ConnectionPool {
    private active = 0;
    private queue: (() => void)[] = [];
    private maxConnections: number;

    constructor(max: number) {
        this.maxConnections = max;
    }

    async acquire() {
        if (this.active < this.maxConnections) {
            this.active++;
            return;
        }
        await new Promise<void>((resolve) => this.queue.push(resolve));
        this.active++;
    }

    release() {
        this.active--;
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next?.();
        }
    }
}

// Assume a realistic browser/server connection limit for database requests
const pool = new ConnectionPool(6);

const mockSupabase = {
    from: (table: string) => ({
        select: (cols: string) => ({
            eq: (col: string, val: any) => ({
                in: async (col2: string, val2: any[]) => {
                    await pool.acquire();
                    await new Promise(r => setTimeout(r, NETWORK_LATENCY + DB_LATENCY));
                    pool.release();
                    // Return mock objects matching the input IDs
                    return { data: val2.map(id => ({ track_id: id })), error: null };
                }
            })
        }),
        update: (data: any) => ({
            eq: (col: string, val: any) => ({
                eq: async (col2: string, val2: any) => {
                    await pool.acquire();
                    await new Promise(r => setTimeout(r, NETWORK_LATENCY + DB_LATENCY));
                    pool.release();
                    return { error: null };
                }
            })
        }),
        upsert: async (data: any, options: any) => {
            await pool.acquire();
            // Bulk upsert is heavier than single update but only one round trip
            // Simulating a slightly higher cost for the bulk operation itself
            await new Promise(r => setTimeout(r, NETWORK_LATENCY + DB_LATENCY * 2));
            pool.release();
            return { error: null };
        }
    })
};

async function runBenchmark(trackCount: number, iterations: number = 5) {
    const tracks = Array.from({ length: trackCount }, (_, i) => i + 1);
    const playlistId = 'playlist-123';

    let totalLoopTime = 0;
    let totalBulkTime = 0;

    for (let i = 0; i < iterations; i++) {
        // --- Baseline: Loop ---
        const startLoop = performance.now();
        const updates = tracks.map((trackId, index) =>
            mockSupabase
                .from('playlist_tracks')
                .update({ position: index })
                .eq('playlist_id', playlistId)
                .eq('track_id', trackId)
        );
        await Promise.all(updates);
        const endLoop = performance.now();
        totalLoopTime += (endLoop - startLoop);

        // --- Optimization: Bulk Upsert ---
        const startBulk = performance.now();
        // Step 1: Fetch existing (simulated)
        await mockSupabase
            .from('playlist_tracks')
            .select('track_id')
            .eq('playlist_id', playlistId)
            .in('track_id', tracks);

        // Step 2: Upsert
        const upsertData = tracks.map((trackId, index) => ({
            playlist_id: playlistId,
            track_id: trackId,
            position: index,
        }));
        await mockSupabase.from('playlist_tracks').upsert(upsertData, { onConflict: 'playlist_id,track_id' });

        const endBulk = performance.now();
        totalBulkTime += (endBulk - startBulk);
    }

    return {
        avgLoopTime: totalLoopTime / iterations,
        avgBulkTime: totalBulkTime / iterations
    };
}

describe('Performance Benchmark: Playlist Reorder', () => {
    it('should demonstrate performance improvement across different playlist sizes', async () => {
        const sizes = [10, 50, 100];

        console.log('\n========================================');
        console.log('PERFORMANCE BENCHMARK RESULTS');
        console.log('========================================');

        for (const size of sizes) {
            const { avgLoopTime, avgBulkTime } = await runBenchmark(size, 5);
            const speedup = avgLoopTime / avgBulkTime;

            console.log(`\nPlaylist Size: ${size} tracks (Avg of 5 runs)`);
            console.log(`----------------------------------------`);
            console.log(`Baseline (N Updates):       ${avgLoopTime.toFixed(2)} ms`);
            console.log(`Optimization (Select+Upsert): ${avgBulkTime.toFixed(2)} ms`);
            console.log(`Improvement:                ${speedup.toFixed(1)}x faster`);

            // Assertions
            // For small lists, the overhead of the extra safety check (SELECT) might make it slightly slower
            // But for larger lists, the bulk approach should win significantly
            if (size >= 50) {
                expect(avgBulkTime).toBeLessThan(avgLoopTime);
                expect(speedup).toBeGreaterThan(2);
            }
        }
        console.log('\n========================================\n');
    }, 20000);
});
