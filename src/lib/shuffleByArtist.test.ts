import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shuffleByArtist } from "./shuffleByArtist";

describe("shuffleByArtist", () => {
  beforeEach(() => {
    // テストの再現性のためにMath.randomをモック
    vi.spyOn(Math, "random");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("空の配列を返す", () => {
    const result = shuffleByArtist([]);
    expect(result).toEqual([]);
  });

  it("1つの要素の配列をそのまま返す", () => {
    const tracks = [{ artist_name: "Artist A", track_name: "Track 1" }];
    const result = shuffleByArtist(tracks);
    expect(result).toEqual(tracks);
  });

  it("異なるアーティストの2曲をシャッフルする", () => {
    const tracks = [
      { artist_name: "Artist A", track_name: "Track 1" },
      { artist_name: "Artist B", track_name: "Track 2" },
    ];
    const result = shuffleByArtist(tracks);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(tracks[0]);
    expect(result).toContainEqual(tracks[1]);
  });

  it("同じアーティストが連続しないようにシャッフルする", () => {
    const tracks = [
      { artist_name: "Artist A", track_name: "Track 1" },
      { artist_name: "Artist A", track_name: "Track 2" },
      { artist_name: "Artist B", track_name: "Track 3" },
      { artist_name: "Artist B", track_name: "Track 4" },
      { artist_name: "Artist C", track_name: "Track 5" },
      { artist_name: "Artist C", track_name: "Track 6" },
    ];

    // 複数回実行して連続がないことを確認
    for (let run = 0; run < 10; run++) {
      const result = shuffleByArtist(tracks);

      // すべてのトラックが含まれていることを確認
      expect(result).toHaveLength(tracks.length);
      for (const track of tracks) {
        expect(result).toContainEqual(track);
      }

      // 連続する同じアーティストがないことを確認
      for (let i = 1; i < result.length; i++) {
        expect(result[i].artist_name).not.toBe(result[i - 1].artist_name);
      }
    }
  });

  it("同じアーティストの曲が多すぎる場合も処理できる（完全な分散は保証しない）", () => {
    // 同じアーティストの曲が5曲、他が1曲ずつ
    const tracks = [
      { artist_name: "Artist A", track_name: "Track 1" },
      { artist_name: "Artist A", track_name: "Track 2" },
      { artist_name: "Artist A", track_name: "Track 3" },
      { artist_name: "Artist A", track_name: "Track 4" },
      { artist_name: "Artist A", track_name: "Track 5" },
      { artist_name: "Artist B", track_name: "Track 6" },
      { artist_name: "Artist C", track_name: "Track 7" },
    ];

    const result = shuffleByArtist(tracks);

    // すべてのトラックが含まれていることを確認
    expect(result).toHaveLength(tracks.length);
    for (const track of tracks) {
      expect(result).toContainEqual(track);
    }

    // 関数がエラーなく完了することを確認（完全な分散は保証しない）
    expect(result.length).toBe(tracks.length);
  });

  it("すべて同じアーティストの場合もエラーなく処理する", () => {
    const tracks = [
      { artist_name: "Artist A", track_name: "Track 1" },
      { artist_name: "Artist A", track_name: "Track 2" },
      { artist_name: "Artist A", track_name: "Track 3" },
    ];

    const result = shuffleByArtist(tracks);

    // すべてのトラックが含まれていることを確認
    expect(result).toHaveLength(tracks.length);
    for (const track of tracks) {
      expect(result).toContainEqual(track);
    }
  });

  it("元の配列を変更しない（イミュータブル）", () => {
    const tracks = [
      { artist_name: "Artist A", track_name: "Track 1" },
      { artist_name: "Artist B", track_name: "Track 2" },
      { artist_name: "Artist C", track_name: "Track 3" },
    ];
    const originalTracks = [...tracks];

    shuffleByArtist(tracks);

    expect(tracks).toEqual(originalTracks);
  });

  it("多くのアーティストでも連続しないようにシャッフルする", () => {
    const tracks = [
      { artist_name: "Artist A", track_name: "Track 1" },
      { artist_name: "Artist A", track_name: "Track 2" },
      { artist_name: "Artist B", track_name: "Track 3" },
      { artist_name: "Artist B", track_name: "Track 4" },
      { artist_name: "Artist C", track_name: "Track 5" },
      { artist_name: "Artist D", track_name: "Track 6" },
      { artist_name: "Artist E", track_name: "Track 7" },
      { artist_name: "Artist F", track_name: "Track 8" },
      { artist_name: "Artist G", track_name: "Track 9" },
      { artist_name: "Artist H", track_name: "Track 10" },
    ];

    // 複数回実行して連続がないことを確認
    for (let run = 0; run < 10; run++) {
      const result = shuffleByArtist(tracks);

      // すべてのトラックが含まれていることを確認
      expect(result).toHaveLength(tracks.length);

      // 連続する同じアーティストがないことを確認
      for (let i = 1; i < result.length; i++) {
        expect(result[i].artist_name).not.toBe(result[i - 1].artist_name);
      }
    }
  });
});
