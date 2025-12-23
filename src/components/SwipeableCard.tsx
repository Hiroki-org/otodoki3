"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useState } from "react";
import { Track } from "../types/track-pool";
import { TrackCard } from "./TrackCard";

interface SwipeableCardProps {
    track: Track;
    isTop: boolean;
    onSwipe: (direction: "left" | "right", track: Track) => void;
    index: number;
}

export function SwipeableCard({ track, isTop, onSwipe, index }: SwipeableCardProps) {
    const [exitX, setExitX] = useState<number | null>(null);
    const x = useMotionValue(0);

    // Rail motion (Fan arc)
    // Input range [-200, 200] roughly maps to screen width drags
    // Output rotation [-30, 30] creates the fan effect
    const rotate = useTransform(x, [-200, 200], [-30, 30]);

    // Opacity fade out when dragging far
    // const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]); // Optional per user snippet, keeping it simpler for now or strictly following snippet?
    // User snippet: const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

    // While regular cards just stack, the top one is interactive
    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!isTop) return;

        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // Dynamic threshold based on screen width if possible, else fallback
        const screenWidth = typeof window !== "undefined" ? window.innerWidth : 375;
        // User requested "Screen Width Threshold"
        // Let's say 25-30% of screen width is a good intent threshold
        const swipeThreshold = screenWidth * 0.25;

        // Velocity threshold to allow "flicks"
        const velocityThreshold = 200; // pixels per second

        // Determine direction
        // Logic: 
        // 1. If moved far enough (offset > threshold), SWIPE.
        // 2. If moved fast enough (velocity > threshold) AND moved in that direction, SWIPE.
        // 3. Otherwise, return.

        const isRight = offset > 0;
        const isLeft = offset < 0;

        let swipedRight = false;
        let swipedLeft = false;

        if (isRight) {
            if (offset > swipeThreshold) swipedRight = true;
            else if (velocity > velocityThreshold) swipedRight = true;
        } else if (isLeft) {
            if (offset < -swipeThreshold) swipedLeft = true;
            else if (velocity < -velocityThreshold) swipedLeft = true;
        }

        if (swipedRight) {
            setExitX(500); // Fly off screen
            setTimeout(() => onSwipe("right", track), 10);
        } else if (swipedLeft) {
            setExitX(-500);
            setTimeout(() => onSwipe("left", track), 10);
        } else {
            // Snap back
            // We rely on dragConstraints to snap back smoothly.
            // No manual set(0) needed as it conflicts with constraints animation.
        }
    };

    return (
        <motion.div
            className="absolute inset-0"
            style={{
                zIndex: 100 - index, // Simple zIndex stack
                x,
                rotate,
                opacity
            }}
            drag={isTop ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }} // This creates the 'snap back' force if we don't override it? 
            // User snippet had NO dragConstraints in one example, but 'minimal' example has none?
            // Actually user snippet:
            // const handleDragEnd = ... else { x.set(0) }
            // And `dragConstraints` usage usually auto-snaps if you release.
            // If we put dragConstraints={{ left: 0, right: 0 }}, it snaps back HARD. 
            // For "rail" feel we want free movement then custom snap.
            // So we generally REMOVE dragConstraints or make them infinite, then handle snap ourselves.
            // WAIT. If we use `x` motion value, we conflict with `dragConstraints` if we want manual control.
            // The user snippet has `drag={isTop ? "x" : false}` and `onDragEnd` doing `x.set(0)`.
            // This suggests NO dragConstraints or loose ones. 
            // BUT, `dragElastic` is commonly used.
            // Let's try NO dragConstraints to allow full freedom, then manual snap back.
            dragElastic={0.1} // Add some resistance
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.05 }}
            initial={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : index * 10 }} // Stacking effect
            animate={{
                scale: isTop ? 1 : 0.95,
                y: isTop ? 0 : Math.min(index * 10, 30), // Cap stacking depth
                x: 0 // Ensure it resets if re-rendered as top? No, x is motion value.
            }}
            exit={{
                x: exitX ?? (track.track_id ? -500 : 500), // Default exit if somehow needed, but exitX state should drive it
                opacity: 0,
                transition: { duration: 0.2 }
            }}
        >
            <TrackCard track={track} />
        </motion.div>
    );
}
