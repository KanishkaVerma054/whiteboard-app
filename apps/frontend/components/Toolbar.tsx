import { ReactNode, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronUp,
  Circle,
  Diamond,
  Eraser,
  Hand,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  Triangle,
  Type,
} from "lucide-react";

export type Tool = "circle" | "rect" | "pencil" | "line" | "triangle" | "diamond" | "arrow" | "grab" | "select" | "text" | "eraser";

type ShapeTool = "rect" | "circle" | "triangle" | "diamond" | "line";

const ICON = "h-[18px] w-[18px]";

// always-visible tools, in display order
const MAIN_TOOLS: { tool: Tool; label: string; icon: ReactNode }[] = [
  { tool: "select", label: "Select", icon: <MousePointer2 className={ICON} /> },
  { tool: "grab", label: "Hand", icon: <Hand className={ICON} /> },
  { tool: "pencil", label: "Draw", icon: <Pencil className={ICON} /> },
  { tool: "eraser", label: "Eraser", icon: <Eraser className={ICON} /> },
  { tool: "arrow", label: "Arrow", icon: <ArrowUpRight className={ICON} /> },
  { tool: "text", label: "Text", icon: <Type className={ICON} /> },
];

// shapes live behind the ^ chevron; the last-picked one occupies the toolbar's shape slot
const SHAPE_TOOLS: { tool: ShapeTool; label: string; icon: ReactNode }[] = [
  { tool: "rect", label: "Rectangle", icon: <Square className={ICON} /> },
  { tool: "circle", label: "Ellipse", icon: <Circle className={ICON} /> },
  { tool: "triangle", label: "Triangle", icon: <Triangle className={ICON} /> },
  { tool: "diamond", label: "Diamond", icon: <Diamond className={ICON} /> },
  { tool: "line", label: "Line", icon: <Minus className={ICON} /> },
];

const isShapeTool = (t: Tool): t is ShapeTool => SHAPE_TOOLS.some((s) => s.tool === t);

function ToolButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
        active ? "bg-[#4a8cf7] text-white" : "text-neutral-200 hover:bg-white/10"
      }`}
    >
      {icon}
    </button>
  );
}

// bottom-center floating tool dock
export function Toolbar({
  selectedTool,
  setSelectedTool,
}: {
  selectedTool: Tool;
  setSelectedTool: (t: Tool) => void;
}) {
  const [lastShape, setLastShape] = useState<ShapeTool>("rect");
  const [shapesOpen, setShapesOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // close the shapes popover on any outside click or Escape
  useEffect(() => {
    if (!shapesOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setShapesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShapesOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [shapesOpen]);

  const slotShape = isShapeTool(selectedTool) ? selectedTool : lastShape;
  const slot = SHAPE_TOOLS.find((s) => s.tool === slotShape)!;

  const pickShape = (t: ShapeTool) => {
    setLastShape(t);
    setSelectedTool(t);
    setShapesOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 select-none"
    >
      {shapesOpen && (
        <div className="absolute bottom-full right-0 mb-2 flex gap-1 rounded-xl border border-white/5 bg-[#232329] p-1.5 shadow-lg shadow-black/40">
          {SHAPE_TOOLS.map((s) => (
            <ToolButton
              key={s.tool}
              label={s.label}
              icon={s.icon}
              active={selectedTool === s.tool}
              onClick={() => pickShape(s.tool)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 rounded-xl border border-white/5 bg-[#232329] p-1.5 shadow-lg shadow-black/40">
        {MAIN_TOOLS.map((t) => (
          <ToolButton
            key={t.tool}
            label={t.label}
            icon={t.icon}
            active={selectedTool === t.tool}
            onClick={() => setSelectedTool(t.tool)}
          />
        ))}
        <ToolButton
          label={slot.label}
          icon={slot.icon}
          active={selectedTool === slot.tool}
          onClick={() => pickShape(slot.tool)}
        />
        <button
          type="button"
          title="More shapes"
          aria-label="More shapes"
          aria-expanded={shapesOpen}
          onClick={() => setShapesOpen((o) => !o)}
          className={`flex h-10 w-8 items-center justify-center rounded-lg text-neutral-200 transition-colors hover:bg-white/10 ${
            shapesOpen ? "bg-white/10" : ""
          }`}
        >
          <ChevronUp className={`h-4 w-4 transition-transform ${shapesOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}
