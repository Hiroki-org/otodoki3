"use client";

type AudioProgressBarProps = {
  progress: number; // 0-100
};

export function AudioProgressBar({ progress }: AudioProgressBarProps) {
  const clamped = Number.isFinite(progress)
    ? Math.min(100, Math.max(0, progress))
    : 0;

  return (
    <div
      className="pointer-events-none h-0.5 w-full bg-black/10 dark:bg-white/15"
      aria-hidden="true"
    >
      <div className="h-full bg-foreground" style={{ width: `${clamped}%` }} />
    </div>
  );
}
