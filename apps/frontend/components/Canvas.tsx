import { ReactNode, useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButtton";
import { AlignCenter, AlignLeft, AlignRight, CaseSensitive, Circle, CodeXml, Diamond, Hand, Minus, MousePointer2, MoveRight, PanelBottom, Pencil, RectangleHorizontalIcon, Triangle, Type } from "lucide-react";
import { Game } from "@/app/draw/Game";
import { FONT_FAMILIES, FONT_SIZES, FontFamily, FontSizes, PanelState, TextAlign } from "@/types/types";
// import { useWindowSize } from "@/hooks/useWindowSize";

//TODO: use enumns for circle rect pencil etc


export type Tool = "circle" | "rect" | "pencil" | "line" | "triangle" | "diamond" | "arrow" | "grab" | "select" | "text";

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
      ></canvas>
      <Topbar
        setSelectedTool={setSelectedTool}
        selectedTool={selectedTool}
        panel={panel}
        onFontFamilyChange={(f) => game?.setFontFamily(f)}
        onFontSizeChange={(s) => game?.setFontSize(s)}
        onTextAlignChange={(a) => game?.setTextAlign(a)}
      />
    </div>
  );
};

function Topbar({
  selectedTool,
  setSelectedTool,
  panel,
  onFontFamilyChange,
  onFontSizeChange,
  onTextAlignChange
}: {
  selectedTool: Tool;
  setSelectedTool: (s: Tool) => void;
  panel:PanelState | null;
  onFontFamilyChange: (f: FontFamily) => void;
  onFontSizeChange: (s: number) => void;
  onTextAlignChange: (a: TextAlign) => void;
}) {
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
      </div>
      {panel?.kind === "text" && (
        <div
          className="flex flex-col gap-1.5 mt-2 w-fit rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-white"
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="text-xs text-gray-400">Font family</span>
          <div className="flex gap-1.5">
            {(Object.keys(FONT_FAMILIES) as FontFamily[]).map((f) => (
              <button
                key={f}
                title={FONT_FAMILIES[f].label}
                onClick={() => onFontFamilyChange(f)}
                className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                  panel.fontFamily === f
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
                  panel.fontSize === FONT_SIZES[p]
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
                  panel.textAlign === a
                    ? "border-blue-400 bg-blue-500/20 text-blue-300"
                    : "border-transparent bg-neutral-700 text-gray-200 hover:bg-neutral-600"
                }`}
              >
                {TEXT_ALIGN_ICONS[a]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Canvas;