"use client";

import {
  motion,
  useMotionValue,
  useTransform,
  PanInfo,
  animate,
  AnimatePresence,
} from "framer-motion";
import { flushSync } from "react-dom";
import { useEffect, useRef, useState } from "react";
import type { CardItem, Track } from "../types/track-pool";
import { TrackCard } from "./TrackCard";
import { TutorialCard } from "./TutorialCard";

const ROTATE_INPUT_RANGE_PX = 200;
const ROTATE_OUTPUT_RANGE_DEG = 15; // 30から15に変更（回転を緩やかに）

const OPACITY_INPUT_RANGE_PX: number[] = [-200, -150, 0, 150, 200];
const OPACITY_OUTPUT_RANGE: number[] = [0, 1, 1, 1, 0];

const SWIPE_THRESHOLD_SCREEN_WIDTH_RATIO = 0.25;
const VELOCITY_THRESHOLD_PX_PER_SEC = 200;

const EXIT_X_OFFSET_PX = 500;

const DRAG_ELASTIC = 0.2;
const WHILE_DRAG_SCALE = 1.05;

const STACK_Y_STEP_PX = 10;
const STACK_Y_CAP_PX = 30;

const EXIT_DURATION_SEC = 0.2;
const SNAP_BACK_SPRING = {
  type: "spring",
  stiffness: 350,
  damping: 30,
} as const;

interface SwipeableCardProps {
  item: CardItem;
  isTop: boolean;
  onSwipe: (direction: "left" | "right", item: CardItem) => void;
  index: number;
}

export function SwipeableCard({
  item,
  isTop,
  onSwipe,
  index,
}: SwipeableCardProps) {
  const [exitX, setExitX] = useState<number | null>(null);
  const [showReaction, setShowReaction] = useState<"like" | "skip" | null>(
    null
  );
  const x = useMotionValue(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isTop) return;

    if (e.key === "ArrowLeft") {
      flushSync(() => {
        setExitX(-EXIT_X_OFFSET_PX);
        setShowReaction("skip");
      });
      setTimeout(() => {
        onSwipe("left", item);
      }, EXIT_DURATION_SEC * 1000);
    } else if (e.key === "ArrowRight") {
      flushSync(() => {
        setExitX(EXIT_X_OFFSET_PX);
        setShowReaction("like");
      });
      setTimeout(() => {
        onSwipe("right", item);
      }, EXIT_DURATION_SEC * 1000);
    }
  };

  const rotate = useTransform(
    x,
    [-ROTATE_INPUT_RANGE_PX, ROTATE_INPUT_RANGE_PX],
    [-ROTATE_OUTPUT_RANGE_DEG, ROTATE_OUTPUT_RANGE_DEG]
  );
  const opacity = useTransform(x, OPACITY_INPUT_RANGE_PX, OPACITY_OUTPUT_RANGE);

  // While regular cards just stack, the top one is interactive
  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (!isTop) return;

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 375;
    const swipeThreshold = screenWidth * SWIPE_THRESHOLD_SCREEN_WIDTH_RATIO;

    const isRight = offset > 0;
    const isLeft = offset < 0;

    const swipedRight =
      isRight &&
      (offset > swipeThreshold || velocity > VELOCITY_THRESHOLD_PX_PER_SEC);
    const swipedLeft =
      isLeft &&
      (offset < -swipeThreshold || velocity < -VELOCITY_THRESHOLD_PX_PER_SEC);

    if (swipedRight) {
      flushSync(() => {
        setExitX(EXIT_X_OFFSET_PX);
        setShowReaction("like");
      });
      // アニメーション終了後にonSwipeを呼ぶ
      setTimeout(() => {
        onSwipe("right", item);
      }, EXIT_DURATION_SEC * 1000);
    } else if (swipedLeft) {
      flushSync(() => {
        setExitX(-EXIT_X_OFFSET_PX);
        setShowReaction("skip");
      });
      setTimeout(() => {
        onSwipe("left", item);
      }, EXIT_DURATION_SEC * 1000);
    } else {
      animate(x, 0, SNAP_BACK_SPRING);
    }
  };

  return (
    <motion.button
      className="absolute inset-0 border-none bg-transparent p-0"
      style={{
        zIndex: 100 - index, // Simple zIndex stack
        x,
        rotate,
        opacity,
      }}
      drag={isTop ? "x" : false}
      dragElastic={DRAG_ELASTIC}
      onDragEnd={handleDragEnd}
      onKeyDown={handleKeyDown}
      whileDrag={{ scale: WHILE_DRAG_SCALE }}
      initial={{
        scale: isTop ? 1 : 0.95,
        y: isTop ? 0 : Math.min(index * STACK_Y_STEP_PX, STACK_Y_CAP_PX),
      }}
      animate={{
        scale: isTop ? 1 : 0.95,
        y: isTop ? 0 : Math.min(index * STACK_Y_STEP_PX, STACK_Y_CAP_PX),
      }}
      exit={{
        x: exitX ?? EXIT_X_OFFSET_PX,
        opacity: 0,
        transition: { duration: EXIT_DURATION_SEC },
      }}
      aria-label={
        item.type === "tutorial"
          ? "チュートリアルカードをスワイプ"
          : `${item.track_name} by ${item.artist_name}をスワイプ`
      }
      tabIndex={isTop ? 0 : -1}
    >
      {/* リアクションアイコンアニメーション */}
      <AnimatePresence>
        {showReaction && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: EXIT_DURATION_SEC }}
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              {showReaction === "like" ? (
                // いいねアイコン
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-14 w-14 text-red-500"
                >
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              ) : (
                // スキップアイコン
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-14 w-14 text-gray-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {item.type === "tutorial" ? <TutorialCard /> : <TrackCard track={item} />}
    </motion.button>
  );
}
