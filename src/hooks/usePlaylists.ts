import { useQuery } from "@tanstack/react-query";

export interface Playlist {
  id: string;
  name: string;
  icon: string;
  count: number;
  is_default?: boolean;
}

async function fetchPlaylists(): Promise<Playlist[]> {
  const res = await fetch("/api/playlists");

  if (!res.ok) {
    const err = new Error("Failed to fetch playlists") as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }

  const data = (await res.json()) as { playlists?: Playlist[] };
  return data.playlists ?? [];
}

export function usePlaylists() {
  return useQuery({
    queryKey: ["playlists"],
    queryFn: fetchPlaylists,
  });
}
