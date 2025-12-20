-- 1. users（publicプロファイル）
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. track_pool（楽曲プール - グローバル共有）
CREATE TABLE public.track_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id BIGINT UNIQUE NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  collection_name TEXT,
  preview_url TEXT NOT NULL,
  artwork_url TEXT,
  track_view_url TEXT,
  genre TEXT,
  release_date DATE,
  metadata JSONB DEFAULT '{}',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_track_pool_track_id ON public.track_pool(track_id);
CREATE INDEX idx_track_pool_fetched_at ON public.track_pool(fetched_at);

ALTER TABLE public.track_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Track pool is publicly readable" ON public.track_pool
  FOR SELECT USING (true);

-- 3. played_tracks（再生履歴 - 7日除外用）
CREATE TABLE public.played_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  track_id BIGINT NOT NULL REFERENCES public.track_pool(track_id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_played_tracks_user_played ON public.played_tracks(user_id, played_at DESC);

ALTER TABLE public.played_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own played_tracks" ON public.played_tracks
  FOR ALL USING (auth.uid() = user_id);

-- 4. likes（お気に入り）
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  track_id BIGINT NOT NULL REFERENCES public.track_pool(track_id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX idx_likes_user ON public.likes(user_id, created_at DESC);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own likes" ON public.likes
  FOR ALL USING (auth.uid() = user_id);

-- 5. dislikes（除外リスト - 30日期限）
CREATE TABLE public.dislikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  track_id BIGINT NOT NULL REFERENCES public.track_pool(track_id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX idx_dislikes_user_created ON public.dislikes(user_id, created_at DESC);

ALTER TABLE public.dislikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own dislikes" ON public.dislikes
  FOR ALL USING (auth.uid() = user_id);

-- 6. playlists（プレイリスト）
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_playlists_user ON public.playlists(user_id, created_at DESC);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own playlists" ON public.playlists
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. playlist_tracks（中間テーブル）
CREATE TABLE public.playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id BIGINT NOT NULL REFERENCES public.track_pool(track_id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

CREATE INDEX idx_playlist_tracks_playlist ON public.playlist_tracks(playlist_id, position);

ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own playlist tracks" ON public.playlist_tracks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_tracks.playlist_id
        AND playlists.user_id = auth.uid()
    )
  );
