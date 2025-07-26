import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButtton";
import { Circle, Pencil, RectangleHorizontalIcon } from "lucide-react";
import { Game } from "@/app/draw/Game";
import { useWindowSize } from "@/hooks/useWindowSize";


//TODO: use enumns for circle rect pencil etc
export type Tool = "circle" | "rect" | "pencil";


const Canvas = ({ roomId, socket }: { roomId: string; socket: WebSocket }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game>();
  const [selectedTool, setSelectedTool] = useState<Tool>("circle");
  const { width, height } = useWindowSize();


  useEffect(() => {
    game?.setTool(selectedTool);
  }, [selectedTool, game]);

  useEffect(() => {
    if (canvasRef.current && !game) {
      const g = new Game(canvasRef.current, roomId, socket);
      setGame(g);

      return () => {
        g.destroy();
      };
    }
  }, [canvasRef, roomId, socket, game]);

  // To update tool when changed
  useEffect(() => {
    game?.setTool(selectedTool);
  }, [selectedTool, game]);


  // update canvas and redraw on resize
  useEffect(() => {
    if (canvasRef.current && game) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      game.clearCanvas();
    }
  }, [width, height, game]);
  
  return (
    <div className="overflow-hidden h-[100vh]">
      <canvas
        ref={canvasRef}
        // width={window.innerWidth}
        width={width}
        height={height}
        // height={window.innerHeight}
      ></canvas>
      <Topbar setSelectedTool={setSelectedTool} selectedTool={selectedTool} />
    </div>
  );
};

function Topbar({
  selectedTool,
  setSelectedTool,
}: {
  selectedTool: Tool;
  setSelectedTool: (s: Tool) => void;
}) {
  return (
    <div className="fixed top-[10px] left-[10px]">
      <div className="flex gap-2">
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
      </div>
    </div>
  );
}

export default Canvas;
