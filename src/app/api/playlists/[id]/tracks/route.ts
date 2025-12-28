import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { track_id } = body;

    if (!track_id) {
        return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    // Verify playlist ownership
    const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (playlistError || !playlist) {
        return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Get current max position
    const { data: maxPosData } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', id)
        .order('position', { ascending: false })
        .limit(1)
        .single();

    const nextPosition = (maxPosData?.position ?? -1) + 1;

    const { error } = await supabase
        .from('playlist_tracks')
        .insert({
            playlist_id: id,
            track_id,
            position: nextPosition,
        });

    if (error) {
        console.error('Error adding track to playlist:', error);
        return NextResponse.json({ error: 'Failed to add track' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { track_id } = body;

    if (!track_id) {
        return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    // Verify playlist ownership
    const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (playlistError || !playlist) {
        return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    const { error } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', id)
        .eq('track_id', track_id);

    if (error) {
        return NextResponse.json({ error: 'Failed to remove track' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tracks } = body; // Expecting array of track_ids in the new order

    if (!tracks || !Array.isArray(tracks)) {
        return NextResponse.json({ error: 'Tracks array is required' }, { status: 400 });
    }

    // Verify playlist ownership
    const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (playlistError || !playlist) {
        return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Update positions
    const updates = tracks.map((trackId, index) =>
        supabase
            .from('playlist_tracks')
            .update({ position: index })
            .eq('playlist_id', id)
            .eq('track_id', trackId)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
}
