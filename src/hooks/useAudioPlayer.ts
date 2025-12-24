"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AudioPlayerState = {
    isPlaying: boolean;
    progress: number; // 0-100
};

export function useAudioPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [state, setState] = useState<AudioPlayerState>({
        isPlaying: false,
        progress: 0,
    });

    const stop = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.pause();
        audio.currentTime = 0;

        setState((prev) => ({ ...prev, isPlaying: false, progress: 0 }));
    }, []);

    const play = useCallback(
        (previewUrl: string) => {
            const audio = audioRef.current;
            if (!audio) return;

            const trimmed = previewUrl.trim();
            if (!trimmed) return;

            if (audio.src !== trimmed) {
                audio.src = trimmed;
            }

            // 再生開始はユーザージェスチャーに紐づく必要がある
            // （呼び出し側で非同期を挟まないこと）
            const playPromise = audio.play();

            setState((prev) => ({ ...prev, isPlaying: true }));

            if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch((err) => {
                    console.error("Failed to play preview audio", err);
                    stop();
                });
            }
        },
        [stop]
    );

    useEffect(() => {
        if (audioRef.current) return;

        const audio = new Audio();
        audio.preload = "auto";
        audioRef.current = audio;

        const handleTimeUpdate = () => {
            const duration = audio.duration;
            const currentTime = audio.currentTime;
            const progress =
                Number.isFinite(duration) && duration > 0
                    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
                    : 0;

            setState((prev) => (prev.progress === progress ? prev : { ...prev, progress }));
        };

        const handleEnded = () => {
            setState((prev) => ({ ...prev, isPlaying: false, progress: 100 }));
        };

        const handleError = () => {
            // 403/404 などもここに来る
            console.error("Audio element error", {
                src: audio.src,
                error: audio.error,
            });
            stop();
        };

        const handlePlay = () => {
            setState((prev) => ({ ...prev, isPlaying: true }));
        };

        const handlePause = () => {
            setState((prev) => ({ ...prev, isPlaying: false }));
        };

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);
        audio.addEventListener("play", handlePlay);
        audio.addEventListener("pause", handlePause);

        return () => {
            audio.pause();
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("error", handleError);
            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("pause", handlePause);
            audioRef.current = null;
        };
    }, [stop]);

    return {
        audioRef,
        play,
        stop,
        isPlaying: state.isPlaying,
        progress: state.progress,
    };
}
