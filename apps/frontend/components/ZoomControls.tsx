import { Minus, Plus } from "lucide-react";
import { MAX_ZOOM, MIN_ZOOM } from "@/types/types";

// bottom-left "−  100%  +" pill; clicking the percentage resets zoom to 100%
export function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const btn =
    "flex h-9 w-10 items-center justify-center text-gray-200 transition-colors hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div
      className="fixed bottom-4 left-4 flex items-center overflow-hidden rounded-lg bg-neutral-800 select-none"
      onMouseDown={(e) => e.preventDefault()}
    >
      <button title="Zoom out" className={btn} onClick={onZoomOut} disabled={scale <= MIN_ZOOM}>
        <Minus className="h-4 w-4" />
      </button>
      <button
        title="Reset zoom"
        className="h-9 min-w-14 px-2 text-sm text-gray-200 tabular-nums transition-colors hover:bg-neutral-700"
        onClick={onReset}
      >
        {Math.round(scale * 100)}%
      </button>
      <button title="Zoom in" className={btn} onClick={onZoomIn} disabled={scale >= MAX_ZOOM}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
