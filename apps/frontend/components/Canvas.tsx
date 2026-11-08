import { ReactNode, useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButtton";
import { AlignCenter, AlignLeft, AlignRight, CaseSensitive, Circle, CodeXml, Diamond, Eraser, Hand, Minus, Plus, MousePointer2, MoveRight, Pencil, RectangleHorizontalIcon, Triangle, Type } from "lucide-react";
import { Game } from "@/app/draw/Game";
import { BG_FILLS, DEFAULT_BG_FILL, FONT_FAMILIES, FONT_SIZES, FontFamily, FontSizes, MAX_ZOOM, MIN_ZOOM, PanelState, STROKE_COLOURS, STROKE_WIDTHS, StrokeEdge, StrokeStyle, StrokeWidth, TextAlign, ZOOM_STEP } from "@/types/types";
import { EraserTrail } from "./EraserTrail";

//TODO: use enumns for circle rect pencil etc


export type Tool = "circle" | "rect" | "pencil" | "line" | "triangle" | "diamond" | "arrow" | "grab" | "select" | "text" | "eraser";

const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Ccircle cx='7' cy='7' r='5' fill='black' stroke='white'/%3E%3C/svg%3E") 8 8, auto`;

// icon per font family, shown instead of the text label in the font-family row —
// Pencil doubles as both the pencil *tool* icon and the "hand-drawn" *font* icon
// (the same reuse CollabyDraw's own icon map makes), disambiguated by context
const FONT_FAMILY_ICONS: Record<FontFamily, ReactNode> = {
  "hand-drawn": <Pencil className="w-4 h-4" />,
  sans: <CaseSensitive className="w-4 h-4" />,
  code: <CodeXml className="w-4 h-4" />,
};

const TEXT_ALIGN_ICONS: Record<TextAlign, ReactNode> = {
  left: <AlignLeft className="w-4 h-4" />,
  center: <AlignCenter className="w-4 h-4" />,
  right: <AlignRight className="w-4 h-4" />,
};

const Canvas = ({ roomId, socket }: { roomId: string; socket: WebSocket }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game>();
  const [selectedTool, setSelectedTool] = useState<Tool>("select");
  // const { width, height } = useWindowSize();
  const [scale,  setScale] = useState(1);
  const[panel, setPanel] = useState<PanelState | null>(null);


  useEffect(() => {
    game?.setTool(selectedTool);
  }, [selectedTool, game]);

  useEffect(() => {
    if (canvasRef.current) {
      const g = new Game(canvasRef.current, roomId, socket, setScale,  setPanel );
      setGame(g);

      return () => {
        g.destroy();
      };
    }
  }, [canvasRef, roomId, socket]);

  // To update tool when changed
  useEffect(() => {
    game?.setTool(selectedTool);
  }, [selectedTool, game]);


  // update canvas and redraw on resize
  // useEffect(() => {
  //   if (canvasRef.current && game) {
  //     canvasRef.current.width = width;
  //     canvasRef.current.height = height;
  //     game.clearCanvas();
  //   }
  // }, [width, height, game]);
//   useEffect(() => {
//     if (canvasRef.current) {
//       const g = new Game(canvasRef.current, roomId, socket, setScale);
//       setGame(g);
//       return () => {
//         g.destroy();
//       }
//     }
// }, [canvasRef]);
  
  return (
    <div className="overflow-hidden h-[100vh] relative">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        // width={width}
        // height={height}
        height={window.innerHeight}
        className={
          selectedTool === "grab"
            ? "cursor-grab"
            : selectedTool === "select"
            ? "cursor-default"
            : "cursor-crosshair"
        }
        style={selectedTool === "eraser" ? { cursor: ERASER_CURSOR } : undefined}
      ></canvas>
      <EraserTrail isActive={selectedTool === "eraser"}/>
      <Topbar
        setSelectedTool={setSelectedTool}
        selectedTool={selectedTool}
        panel={panel}
        onFontFamilyChange={(f) => game?.setFontFamily(f)}
        onFontSizeChange={(s) => game?.setFontSize(s)}
        onTextAlignChange={(a) => game?.setTextAlign(a)}
        onStrokeColorChange={(c) => game?.setStrokeColour(c)}
        onStrokeWidthChange={(w) => game?.setStrokeWidth(w)}
        onStrokeStyleChange={(s) => game?.setStrokeStyle(s)}
        onBgFillChange={(c) => game?.setBgFill(c)}
        onStrokeEdgeChange={(e) => game?.setStrokeEdge(e)}
      />
      <ZoomControls
        scale={scale}
        onZoomIn={() => game?.setScale(scale + ZOOM_STEP)}
        onZoomOut={() => game?.setScale(scale - ZOOM_STEP)}
        onReset={() => game?.setScale(1)}
      />
    </div>
  );
};

// bottom-left "−  100%  +" pill; clicking the percentage resets zoom to 100%
function ZoomControls({
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

function Topbar({
  selectedTool,
  setSelectedTool,
  panel,
  onFontFamilyChange,
  onFontSizeChange,
  onTextAlignChange,
  onStrokeColorChange,
  onStrokeWidthChange,
  onStrokeStyleChange,
  onBgFillChange,
  onStrokeEdgeChange
}: {
  selectedTool: Tool;
  setSelectedTool: (s: Tool) => void;
  panel:PanelState | null;
  onFontFamilyChange: (f: FontFamily) => void;
  onFontSizeChange: (s: number) => void;
  onTextAlignChange: (a: TextAlign) => void;
  onStrokeColorChange: (c: string) => void;
  onStrokeWidthChange: (w: number) => void;
  onStrokeStyleChange: (s: StrokeStyle) => void;
  onBgFillChange: (c: string) => void;
  onStrokeEdgeChange: (e: StrokeEdge) => void;
}) {
  const text = panel?.text;
  return (
    <div className="fixed top-[10px] left-[10px]">
      <div className="flex gap-2">
        <IconButton
          activated={selectedTool === "select"}
          icon={<MousePointer2 />}
          onClick={() => {
            setSelectedTool("select");
          }}
        ></IconButton>
        <IconButton
          activated={selectedTool === "pencil"}
          icon={<Pencil />}
          onClick={() => {
            setSelectedTool("pencil");
          }}
        ></IconButton>
        <IconButton
          activated={selectedTool === "rect"}
          icon={<RectangleHorizontalIcon />}
          onClick={() => {
            setSelectedTool("rect");
          }}
        ></IconButton>
        <IconButton
          activated={selectedTool === "circle"}
          icon={<Circle />}
          onClick={() => {
            setSelectedTool("circle");
          }}
        ></IconButton>
        <IconButton
          activated={selectedTool === "line"}
          icon={<Minus />}
          onClick={() => {
            setSelectedTool("line");
          }}
        ></IconButton>
        <IconButton
          activated={selectedTool === "triangle"}
          icon={<Triangle />}
          onClick={() => {
            setSelectedTool("triangle");
          }}
        ></IconButton>
        <IconButton
          activated={selectedTool === "diamond"}
          icon={<Diamond />}
          onClick={() => {
            setSelectedTool("diamond");
          }}
        ></IconButton>
        <IconButton
          activated={selectedTool === "arrow"}
          icon={<MoveRight />}
          onClick={() => {
            setSelectedTool("arrow");
          }}
        ></IconButton>
        <IconButton
          
          activated={selectedTool === "grab"}
          icon={<Hand />}
          onClick={() => {
            setSelectedTool("grab");
          }}
        ></IconButton>
        <IconButton   
          activated={selectedTool === "text"}
          icon={<Type />}
          onClick={() => {
            setSelectedTool("text");
          }}
        ></IconButton>
        <IconButton   
          activated={selectedTool === "eraser"}
          icon={<Eraser />}
          onClick={() => {
            setSelectedTool("eraser");
          }}
        ></IconButton>
      </div>
      {panel && (
        <div
          className="flex flex-col gap-1.5 mt-2 w-fit rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-white"
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="text-xs text-gray-400">Stroke</span>
          <div className="flex gap-1.5">
            {STROKE_COLOURS.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => onStrokeColorChange(c)}
                style={{ backgroundColor: c }}
                className={`h-6 w-6 rounded-md border-2 transition-all ${
                  panel.strokeColor === c ? "border-blue-400 scale-110" : "border-neutral-700"
                }`}
              />
            ))}
          </div>

          {panel.strokeWidth !== undefined && (
            <>
              <span className="text-xs text-gray-400">Stroke width</span>
              <div className="flex gap-1.5">
                {(Object.keys(STROKE_WIDTHS) as StrokeWidth[]).map((p) => (
                  <button
                    key={p}
                    title={p}
                    onClick={() => onStrokeWidthChange(STROKE_WIDTHS[p])}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                      panel.strokeWidth === STROKE_WIDTHS[p]
                        ? "border-blue-400 bg-blue-500/20 text-blue-300"
                        : "border-transparent bg-neutral-700 text-gray-200 hover:bg-neutral-600"
                    }`}
                  >
                    <div className="w-4 rounded-full bg-current" style={{ height: `${STROKE_WIDTHS[p] * 2}px` }} />
                  </button>
                ))}
              </div>
            </>
          )}

          {panel.strokeStyle !== undefined && (
            <>
              <span className="text-xs text-gray-400">Stroke style</span>
              <div className="flex gap-1.5">
                {(["solid", "dashed", "dotted"] as StrokeStyle[]).map((s) => (
                  <button
                    key={s}
                    title={s}
                    onClick={() => onStrokeStyleChange(s)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                      panel.strokeStyle === s
                        ? "border-blue-400 bg-blue-500/20 text-blue-300"
                        : "border-transparent bg-neutral-700 text-gray-200 hover:bg-neutral-600"
                    }`}
                  >
                    <div className="w-4" style={{ borderTopWidth: 2, borderTopStyle: s, borderColor: "currentColor" }} />
                  </button>
                ))}
              </div>
            </>
          )}

          {panel.bgFill !== undefined && (
            <>
              <span className="text-xs text-gray-400">Background</span>
              <div className="flex gap-1.5">
                {BG_FILLS.map((c) => (
                  <button
                    key={c}
                    title={c === DEFAULT_BG_FILL ? "Transparent" : c}
                    onClick={() => onBgFillChange(c)}
                    style={
                      c === DEFAULT_BG_FILL
                        ? { backgroundImage: "repeating-conic-gradient(#555 0% 25%, #333 0% 50%)", backgroundSize: "8px 8px" }
                        : { backgroundColor: c }
                    }
                    className={`h-6 w-6 rounded-md border-2 transition-all ${
                      panel.bgFill === c ? "border-blue-400 scale-110" : "border-neutral-700"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {panel.strokeEdge !== undefined && (
            <>
              <span className="text-xs text-gray-400">Edges</span>
              <div className="flex gap-1.5">
                {(["sharp", "round"] as StrokeEdge[]).map((e) => (
                  <button
                    key={e}
                    title={e}
                    onClick={() => onStrokeEdgeChange(e)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                      panel.strokeEdge === e
                        ? "border-blue-400 bg-blue-500/20 text-blue-300"
                        : "border-transparent bg-neutral-700 text-gray-200 hover:bg-neutral-600"
                    }`}
                  >
                    <div className="h-4 w-4 border-2 border-current" style={{ borderRadius: e === "round" ? 4 : 0 }} />
                  </button>
                ))}
              </div>
            </>
          )}

          {text && (
            <>
              <span className="text-xs text-gray-400">Font family</span>
              <div className="flex gap-1.5">
                {(Object.keys(FONT_FAMILIES) as FontFamily[]).map((f) => (
                  <button
                    key={f}
                    title={FONT_FAMILIES[f].label}
                    onClick={() => onFontFamilyChange(f)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                      text.fontFamily === f
                        ? "border-blue-400 bg-blue-500/20 text-blue-300"
                        : "border-transparent bg-neutral-700 text-gray-200 hover:bg-neutral-600"
                    }`}
                  >
                    {FONT_FAMILY_ICONS[f]}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400">Font size</span>
              <div className="flex gap-1.5">
                {(Object.keys(FONT_SIZES) as FontSizes[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => onFontSizeChange(FONT_SIZES[p])}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
                      text.fontSize === FONT_SIZES[p]
                        ? "border-blue-400 bg-blue-500/20 text-blue-300"
                        : "border-transparent bg-neutral-700 text-gray-200 hover:bg-neutral-600"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400">Text align</span>
              <div className="flex gap-1.5">
                {(["left", "center", "right"] as TextAlign[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => onTextAlignChange(a)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                      text.textAlign === a
                        ? "border-blue-400 bg-blue-500/20 text-blue-300"
                        : "border-transparent bg-neutral-700 text-gray-200 hover:bg-neutral-600"
                    }`}
                  >
                    {TEXT_ALIGN_ICONS[a]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Canvas;