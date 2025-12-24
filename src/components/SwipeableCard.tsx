"use client";

import {
  motion,
  useMotionValue,
  useTransform,
  PanInfo,
  animate,
} from "framer-motion";
import { flushSync } from "react-dom";
import { useEffect, useRef, useState } from "react";
import type { CardItem, Track } from "../types/track-pool";
import { TrackCard } from "./TrackCard";
import { TutorialCard } from "./TutorialCard";

const ROTATE_INPUT_RANGE_PX = 200;
const ROTATE_OUTPUT_RANGE_DEG = 30;

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
  const x = useMotionValue(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isTop) return;

    if (e.key === "ArrowLeft") {
      flushSync(() => {
        setExitX(-EXIT_X_OFFSET_PX);
      });
      onSwipe("left", item);
    } else if (e.key === "ArrowRight") {
      flushSync(() => {
        setExitX(EXIT_X_OFFSET_PX);
      });
      onSwipe("right", item);
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
      });
      onSwipe("right", item);
    } else if (swipedLeft) {
      flushSync(() => {
        setExitX(-EXIT_X_OFFSET_PX);
      });
      onSwipe("left", item);
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
      {item.type === "tutorial" ? <TutorialCard /> : <TrackCard track={item} />}
    </motion.button>
  );
}
