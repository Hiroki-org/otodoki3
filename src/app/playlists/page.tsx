"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Layout } from "@/components/Layout";

type Playlist = { id: string; name: string; icon: string; count: number };

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/playlists");
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          console.error("Fetch error:", res.status);
          setLoading(false);
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
    fetchData();
  }, [router]);

  if (loading)
    return (
      <Layout>
        <div className="bg-black text-white flex items-center justify-center">
          読み込み中...
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="bg-black text-white p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">プレイリスト</h1>
        </div>
        <div className="space-y-3">
          {playlists.map((pl) => (
            <Link
              key={pl.id}
              href={`/playlists/${pl.id}`}
              className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700"
              data-testid="playlist-item"
            >
              <span className="text-3xl">{pl.icon}</span>
              <div className="flex-1">
                <p className="font-medium">{pl.name}</p>
                <p className="text-sm text-gray-400">{pl.count}曲</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
