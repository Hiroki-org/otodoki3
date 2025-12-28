"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Ban, ChevronRight, Plus, Music, X } from "lucide-react";

import { Layout } from "@/components/Layout";

type Playlist = {
  id: string;
  name: string;
  icon: string;
  count: number;
  is_default?: boolean;
};

const PlaylistIcon = ({ id, icon }: { id: string; icon?: string }) => {
  switch (id) {
    case "likes":
      return <Heart className="h-6 w-6 text-red-500 fill-current" />;
    case "dislikes":
      return <Ban className="h-6 w-6 text-zinc-400" />;
    default:
      return <Music className="h-6 w-6 text-zinc-400" />;
  }
};

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const fetchPlaylists = async () => {
    try {
      const res = await fetch("/api/playlists");
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        console.error("Fetch error:", res.status);
        return;
      }
      const { playlists } = await res.json();
      setPlaylists(playlists);
    } catch (err) {
      console.error("Network error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [router]);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: newPlaylistTitle }),
      });

      if (res.ok) {
        setNewPlaylistTitle("");
        setIsModalOpen(false);
        fetchPlaylists();
      } else {
        console.error("Failed to create playlist");
      }
    } catch (err) {
      console.error("Error creating playlist:", err);
    } finally {
      setCreating(false);
    }
  };

  if (loading)
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
          読み込み中...
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="min-h-full p-6 pb-24 relative">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ライブラリ</h1>
            <p className="text-zinc-400 text-sm mt-1">
              保存した曲やスキップした曲
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-white text-black rounded-full hover:bg-zinc-200 transition-colors"
            aria-label="Create Playlist"
          >
            <Plus className="h-6 w-6" />
          </button>
        </header>

        <div className="grid gap-4">
          {playlists.map((pl) => (
            <Link
              key={pl.id}
              href={`/playlists/${pl.id}`}
              className="group flex items-center gap-4 p-4 glass rounded-2xl hover:bg-white/10 transition-all active:scale-[0.98]"
              data-testid="playlist-item"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
                <PlaylistIcon id={pl.id} icon={pl.icon} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">{pl.name}</p>
                <p className="text-sm text-zinc-400">{pl.count} 曲</p>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </Link>
          ))}
        </div>

        {/* Create Playlist Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">新規プレイリスト作成</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreatePlaylist}>
                <input
                  type="text"
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  placeholder="プレイリスト名"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 mb-6"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={!newPlaylistTitle.trim() || creating}
                    className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? "作成中..." : "作成"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
