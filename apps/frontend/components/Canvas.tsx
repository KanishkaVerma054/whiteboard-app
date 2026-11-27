import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Game } from "@/app/draw/Game";
import { PanelState, ZOOM_STEP } from "@/types/types";
import { clearToken } from "@/lib/auth";
import { EraserTrail } from "./EraserTrail";
import { Toolbar, Tool } from "./Toolbar";
import { PropertiesPanel } from "./PropertiesPanel";
import { ZoomControls } from "./ZoomControls";

// re-exported so existing `import { Tool } from "@/components/Canvas"` (Game.ts) keeps working
export type { Tool };

const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Ccircle cx='7' cy='7' r='5' fill='black' stroke='white'/%3E%3C/svg%3E") 8 8, auto`;

const Canvas = ({ roomId, token }: { roomId: string; token: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game>();
  const [selectedTool, setSelectedTool] = useState<Tool>("select");
  const [scale,  setScale] = useState(1);
  const [iConnected, setIsConnected] = useState(false);
  const[panel, setPanel] = useState<PanelState | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (canvasRef.current) {
      const g = new Game(canvasRef.current, roomId, token, setScale,  setPanel, setIsConnected, () => {
        clearToken();
        router.push(`/signin?callbackUrl=${encodeURIComponent(`/canvas/${roomId}`)}`);
      } );
      setGame(g);

      return () => {
        g.destroy();
      };
    }
  }, [canvasRef, roomId, token, router]);

  // To update tool when changed
  useEffect(() => {
    game?.setTool(selectedTool);
  }, [selectedTool, game]);

  return (
    <div className="overflow-hidden h-screen relative">
      <canvas
        ref={canvasRef}
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
      <PropertiesPanel
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
      <Toolbar selectedTool={selectedTool} setSelectedTool={setSelectedTool} />
      <ZoomControls
        scale={scale}
        onZoomIn={() => game?.setScale(scale + ZOOM_STEP)}
        onZoomOut={() => game?.setScale(scale - ZOOM_STEP)}
        onReset={() => game?.setScale(1)}
      />
    </div>
  );
};

export default Canvas;