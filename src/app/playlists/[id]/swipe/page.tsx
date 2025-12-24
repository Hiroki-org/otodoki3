"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TrackCardStack } from "@/components/TrackCardStack";

export default function PlaylistSwipePage() {
  const { id } = useParams();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/playlists/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(({ tracks }) => setTracks(tracks))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        読み込み中...
      </div>
    );
  if (tracks.length === 0)
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p>曲がありません</p>
        <button
          onClick={() => router.push(`/playlists/${id}`)}
          className="text-green-400"
        >
          プレイリストに戻る
        </button>
      </div>
    );

  // TrackCardStackにプレイリストモードを渡す
  // 補充なし + 終了時にメッセージ表示
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push(`/playlists/${id}`)}
          className="text-2xl hover:opacity-70"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold">スワイプで再評価</h1>
      </div>
      <div className="flex justify-center">
        <TrackCardStack
          tracks={tracks}
          mode="playlist"
          sourcePlaylist={id as string}
        />
      </div>
    </div>
  );
}
