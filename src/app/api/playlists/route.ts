import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // デフォルトプレイリストのメタ情報を返却
    const [likesCount, dislikesCount, userPlaylists] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('dislikes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('playlists').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    if (likesCount.error) console.error('Failed to count likes:', likesCount.error);
    if (dislikesCount.error) console.error('Failed to count dislikes:', dislikesCount.error);
    if (userPlaylists.error) console.error('Failed to fetch user playlists:', userPlaylists.error);

    const defaultPlaylists = [
        { id: 'likes', name: 'お気に入り', icon: '❤️', count: likesCount.count ?? 0, is_default: true },
        { id: 'dislikes', name: 'スキップ済み', icon: '🚫', count: dislikesCount.count ?? 0, is_default: true },
    ];

    const customPlaylists = userPlaylists.data?.map(p => ({
        id: p.id,
        name: p.title,
        icon: '🎵',
        count: 0, // TODO: Count tracks for each playlist. For now 0 or fetch separately.
        is_default: false
    })) ?? [];

    // Fetch track counts for custom playlists
    if (customPlaylists.length > 0) {
        const { data: trackCounts, error: trackCountsError } = await supabase
            .from('playlist_tracks')
            .select('playlist_id')
            .in('playlist_id', customPlaylists.map(p => p.id));

        if (!trackCountsError && trackCounts) {
            const counts = trackCounts.reduce((acc, curr) => {
                acc[curr.playlist_id] = (acc[curr.playlist_id] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            customPlaylists.forEach(p => {
                p.count = counts[p.id] || 0;
            });
        }
    }

    return NextResponse.json({
        playlists: [...defaultPlaylists, ...customPlaylists],
    });
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const { data: playlist, error } = await supabase
            .from('playlists')
            .insert({
                user_id: user.id,
                title,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating playlist:', error);
            return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
        }

        return NextResponse.json({ playlist });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
