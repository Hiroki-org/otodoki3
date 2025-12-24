"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import type { Track, CardItem } from "../types/track-pool";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { SwipeableCard } from "./SwipeableCard";
import { AudioProgressBar } from "./AudioProgressBar";

type SwipeDirection = "left" | "right";

export function TrackCardStack({ tracks }: { tracks: Track[] }) {
  // ライブラリ選定理由:
  // - react-tinder-card は peerDependencies が react@^16.8 || ^17 || ^18 までで、react@19 と依存解決が衝突する可能性が高い
  // - framer-motion は react@^18 || ^19 をサポートしており、このリポジトリ(react 19)で安全に導入できる

  const initialStack: CardItem[] = [
    { type: "tutorial", id: "tutorial-1" },
    ...tracks,
  ];

  const [stack, setStack] = useState<CardItem[]>(initialStack);
  const { play, stop, pause, resume, isPlaying, progress } = useAudioPlayer();
  const hasUserInteractedRef = useRef(false);

  useEffect(() => {
    setStack((prev) => (prev.length === 0 ? initialStack : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  useEffect(() => {
    const top = stack[0];
    if (!top) return;

    // チュートリアルカードなら再生しない（音源がない）
    if ("type" in top && top.type === "tutorial") {
      return;
    }

    // 楽曲カードの場合のみ処理
    if (!("track_id" in top)) return;
    if (!top.preview_url) return;

    // 初回インタラクション前は再生しない（自動再生ポリシー対策）
    if (!hasUserInteractedRef.current) return;

    play(top.preview_url);
    // 指示: 依存配列は track_id のみ（ジェスチャー起点を維持したい）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack[0]?.type === "track" ? stack[0].track_id : stack[0]?.id]);

  const swipeTop = (direction: SwipeDirection, item: CardItem) => {
    // ユーザージェスチャー内で同期的に停止（自動再生ポリシー対策）
    stop();

    // 初回スワイプでフラグをON
    hasUserInteractedRef.current = true;

    // チュートリアルカード判定
    if ("type" in item && item.type === "tutorial") {
      console.log("Tutorial swiped", direction);
      setStack((prev) => prev.slice(1));
      return;
    }

    // 楽曲カード処理
    const track = item as Track;
    if (direction === "right") {
      console.log("Like", track.track_id);
    } else {
      console.log("Skip", track.track_id);
    }

    setStack((prev) => {
      if (prev.length === 0) return prev;
      const top = prev[0];
      if (
        "track_id" in top &&
        "track_id" in track &&
        top.track_id === track.track_id
      ) {
        return prev.slice(1);
      }
      return prev.filter(
        (t) =>
          !(
            "track_id" in t &&
            "track_id" in track &&
            t.track_id === track.track_id
          )
      );
    });
  };

  const handlePlayPauseClick = () => {
    // 初回インタラクション時のフラグをON
    hasUserInteractedRef.current = true;

    if (isPlaying) {
      pause();
    } else {
      // 再生中でない場合、最上位カードの曲を再生（または再開）
      const top = stack[0];
      if (!top) return;

      // チュートリアルカードの場合はスキップ
      if ("type" in top && top.type === "tutorial") return;

      // 楽曲カードの場合、preview_urlがあれば再生または再開
      if ("track_id" in top && top.preview_url) {
        // audio要素に既にsrcがセットされていれば再開、なければ新規再生
        resume();
      }
    }
  };

  if (stack.length === 0) {
    return (
      <div className="flex h-[70vh] max-h-140 w-[92vw] max-w-sm items-center justify-center rounded-3xl border border-black/8 bg-background text-foreground dark:border-white/15">
        <p className="text-sm opacity-80">今日のディスカバリーはここまで 🎵</p>
      </div>
    );
  }

  return (
    <div className="relative h-[70vh] max-h-140 w-[92vw] max-w-sm">
      {/* 再生/停止ボタン */}
      <button
        onClick={handlePlayPauseClick}
        className="absolute right-4 top-4 z-300 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/70 active:scale-95"
        aria-label={isPlaying ? "一時停止" : "再生"}
      >
        {isPlaying ? (
          // 停止アイコン
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
          >
            <path
              fillRule="evenodd"
              d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          // 再生アイコン
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
          >
            <path
              fillRule="evenodd"
              d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <div className="absolute inset-x-0 bottom-0 z-200">
        <AudioProgressBar progress={progress} />
      </div>
      <AnimatePresence initial={false}>
        {stack.map((item, index) => {
          const isTop = index === 0;

          return (
            <SwipeableCard
              key={
                "type" in item && item.type === "tutorial"
                  ? item.id
                  : item.track_id
              }
              item={item}
              isTop={isTop}
              index={index}
              onSwipe={swipeTop}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
