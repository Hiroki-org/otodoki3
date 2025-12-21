import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Fisher-Yates shuffle algorithm
 * @param array - Array to shuffle
 * @returns Shuffled array
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * GET /api/tracks/random
 * Returns random tracks from the track pool
 * @param request - Next.js request object
 * @returns JSON response with random tracks
 */
export async function GET(request: NextRequest) {
    try {
        // Parse count parameter (default: 10, max: 100)
        const { searchParams } = new URL(request.url);
        const countParam = searchParams.get('count');
        const parsedCount = parseInt(countParam || '10', 10);
        const count = Math.min(
            Math.max(1, Number.isNaN(parsedCount) ? 10 : parsedCount),
            100
        );

        // Fetch count * 3 tracks to improve shuffle quality
        const fetchCount = count * 3;
        const { data: tracks, error } = await supabase
            .from('track_pool')
            .select('*')
            .order('fetched_at', { ascending: false })
            .limit(fetchCount);

        if (error) {
            console.error('Failed to fetch tracks from pool:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch tracks' },
                { status: 500 }
            );
        }

        if (!tracks || tracks.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No tracks available in pool' },
                { status: 404 }
            );
        }

        // Shuffle and take requested count
        const shuffled = shuffleArray(tracks);
        const result = shuffled.slice(0, count);

        return NextResponse.json({
            success: true,
            tracks: result,
        });
    } catch (err) {
        console.error('Unexpected error in /api/tracks/random:', err);
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred' },
            { status: 500 }
        );
    }
}
