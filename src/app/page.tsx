"use client";

import { useQuery } from "@tanstack/react-query";

import { TrackCardStack } from "../components/TrackCardStack";
import type { Track } from "../types/track-pool";

export default function Home() {
  const count = 10;

  const {
    data: tracks,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["tracks", "random", count],
    queryFn: async (): Promise<Track[]> => {
      const res = await fetch(`/api/tracks/random?count=${count}`);
      const json = (await res.json()) as
        | { success: true; tracks: Track[] }
        | { success: false; error: string };

      if (!res.ok || !json.success) {
        const message = "error" in json ? json.error : "Failed to fetch tracks";
        throw new Error(message);
      }

      return json.tracks;
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <main className="flex w-full flex-col items-center gap-6 py-10">
        <header className="w-[92vw] max-w-sm">
          <h1 className="text-xl font-bold">ディスカバリー</h1>
          <p className="mt-1 text-sm opacity-70">
            右スワイプ: Like / 左スワイプ: Skip
          </p>
        </header>

        {isLoading ? (
          <div className="flex h-[70vh] max-h-140 w-[92vw] max-w-sm items-center justify-center rounded-3xl border border-black/8 bg-background dark:border-white/15">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-foreground border-t-transparent"
              aria-label="Loading"
            />
          </div>
        ) : null}

        {isError ? (
          <div className="w-[92vw] max-w-sm rounded-2xl border border-black/8 bg-background p-4 text-sm dark:border-white/15">
            <p className="font-semibold">エラー</p>
            <p className="mt-1 opacity-80">
              {error instanceof Error ? error.message : "Failed"}
            </p>
          </div>
        ) : null}

        {!isLoading && !isError ? (
          tracks && tracks.length > 0 ? (
            <TrackCardStack tracks={tracks} />
          ) : (
            <div className="flex h-[70vh] max-h-140 w-[92vw] max-w-sm items-center justify-center rounded-3xl border border-black/8 bg-background text-foreground dark:border-white/15">
              <p className="text-sm opacity-80">楽曲がありません</p>
            </div>
          )
        ) : null}
      </main>
    </div>
  );
}
