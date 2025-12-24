import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // デフォルトプレイリストのメタ情報を返却
    const [likesCount, dislikesCount] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('dislikes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    if (likesCount.error) console.error('Failed to count likes:', likesCount.error);
    if (dislikesCount.error) console.error('Failed to count dislikes:', dislikesCount.error);

    return NextResponse.json({
        playlists: [
            { id: 'likes', name: 'お気に入り', icon: '❤️', count: likesCount.count ?? 0 },
            { id: 'dislikes', name: 'スキップ済み', icon: '🚫', count: dislikesCount.count ?? 0 },
        ],
    });
}
