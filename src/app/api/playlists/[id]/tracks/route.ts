import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';

async function verifyPlaylistOwnership(supabase: SupabaseClient, playlistId: string, userId: string) {
    const { data: playlist, error } = await supabase
        .from('playlists')
        .select('id')
        .eq('id', playlistId)
        .eq('user_id', userId)
        .single();

    return { playlist, error };
}

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
    let { track_id } = body;

    // track_idをnumberに変換
    if (typeof track_id === 'string') {
        track_id = parseInt(track_id, 10);
    }

    console.log('[POST /api/playlists/[id]/tracks] Request:', {
        playlistId: id,
        trackId: track_id,
        trackIdType: typeof track_id
    });

    if (!track_id || isNaN(track_id)) {
        return NextResponse.json({ error: 'Track ID is required and must be a number' }, { status: 400 });
    }

    // Verify playlist ownership
    const { playlist, error: playlistError } = await verifyPlaylistOwnership(supabase, id, user.id);

    console.log('[POST /api/playlists/[id]/tracks] Playlist verification:', {
        playlistId: id,
        userId: user.id,
        found: !!playlist,
        error: playlistError?.message
    });

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
        .maybeSingle();

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
        if (error.code === '23505') { // Unique violation
            return NextResponse.json({ error: 'Track already in playlist' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to add track' }, { status: 500 });
    }

    // Get the track info to return in response
    const { data: trackData } = await supabase
        .from('track_pool')
        .select('track_id, track_name, artist_name, artwork_url, preview_url')
        .eq('track_id', track_id)
        .single();

    return NextResponse.json({
        success: true,
        track: trackData
    });
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
    let { track_id } = body;

    // track_idをnumberに変換
    if (typeof track_id === 'string') {
        track_id = parseInt(track_id, 10);
    }

    if (!track_id || isNaN(track_id)) {
        return NextResponse.json({ error: 'Track ID is required and must be a number' }, { status: 400 });
    }

    // Verify playlist ownership
    const { playlist, error: playlistError } = await verifyPlaylistOwnership(supabase, id, user.id);

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
    let { tracks } = body; // Expecting array of track_ids in the new order

    if (!tracks || !Array.isArray(tracks)) {
        return NextResponse.json({ error: 'Tracks array is required' }, { status: 400 });
    }

    // Convert all track_ids to numbers
    const numericTracks = tracks.map(trackId => {
        if (typeof trackId === 'string') {
            return parseInt(trackId, 10);
        }
        return trackId;
    });

    if (numericTracks.some(id => !id || isNaN(id))) {
        return NextResponse.json({ error: 'All track IDs must be valid numbers' }, { status: 400 });
    }

    // Verify playlist ownership
    const { playlist, error: playlistError } = await verifyPlaylistOwnership(supabase, id, user.id);

    if (playlistError || !playlist) {
        return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Update positions
    const updates = numericTracks.map((trackId, index) =>
        supabase
            .from('playlist_tracks')
            .update({ position: index })
            .eq('playlist_id', id)
            .eq('track_id', trackId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
        console.error('Failed to update some track positions:', errors);
        return NextResponse.json({ error: 'Failed to update order completely' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
