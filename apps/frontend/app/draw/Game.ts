import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";

type Shape =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      type: "circle";
      x: number;
      y: number;
      radiusX: number;
      radiusY: number;
    }
  | {
      type: "pencil";
      points: {
        x: number;
        y: number;
      }[];
    }
  | {
      type: "line";
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    }
  | {
      type: "triangle";
      x: number;
      y: number;
      side: number; // side of equilatral triangle
    }

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private existingShapes: Shape[];
  private roomId: string;
  private clicked: boolean;
  private startX = 0;
  private startY = 0;
  private selectedTool: Tool = "circle";
  private currentPencilStroke: { x: number; y:number }[] = []
  socket: WebSocket;

  constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.existingShapes = [];
    this.roomId = roomId;
    this.socket = socket;
    this.clicked = false;
    this.init();
    this.initHandlers();
    this.initMouseHandlers();
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.mouseDownHandler);

    this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
    this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
  }

  setTool(tool: "circle" | "pencil" | "rect" | "line" | "triangle") {
    this.selectedTool = tool;
  }

  async init() {
    this.existingShapes = await getExistingShapes(this.roomId);
    this.clearCanvas();
  }

  initHandlers() {
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type == "chat") {
        const parsedShape = JSON.parse(message.message);
        this.existingShapes.push(parsedShape.shape);
        this.clearCanvas();
      }
    };
  }

  // ClearCanvas(){} -> Clears everything; Redraws the permanent shapes; Draw the current preview shape
  clearCanvas() {
    // Clears the entire canvas:
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Sets the background to black:
    this.ctx.fillStyle = "rgba(0, 0, 0)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Redraws Existing Shapes
    this.existingShapes.map((shape) => {

      // Drawing logic of each shape type
      if (shape.type === "rect") {
        this.ctx.strokeStyle = "rgba(255, 255, 255)";
        this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === "circle") {
        this.ctx.beginPath();
        this.ctx.ellipse(
          shape.x,
          shape.y,
          shape.radiusX,
          shape.radiusY,
          0, // here 0 is the rotation of the ellipse
          0, // here 0 is the rotation of the ellipse
          Math.PI * 2
        );
        this.ctx.closePath();
        this.ctx.stroke();
      } else if (shape.type === "line") {
        this.ctx.beginPath();
        this.ctx.moveTo(shape.startX, shape.startY);
        this.ctx.lineTo(shape.endX, shape.endY);
        this.ctx.stroke();
      } else if (shape.type === "triangle") {
        this.ctx.beginPath();

        const height = (shape.side * Math.sqrt(3)) / 2;
        this.ctx.moveTo(shape.x + shape.side / 2, shape.y);
        this.ctx.lineTo(shape.x, shape.y + height);
        this.ctx.lineTo(shape.x + shape.side, shape.y + height);

        this.ctx.closePath();
        this.ctx.stroke();
      } else if (shape.type === "pencil" && Array.isArray(shape.points)) {
        if(shape.points && shape.points.length > 1){
          this.ctx.beginPath();
          this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
          shape.points.forEach(point => {
            this.ctx.lineTo(point.x, point.y);
          });
          this.ctx.stroke();
          // this.ctx.closePath();
        }
      } 
    });
  }

  // mouseDownHandler: User presses the mouse button; shapes begin to draw; Records where the user started to clicking
  mouseDownHandler = (e: MouseEvent) => {
    this.clicked = true;
    
    this.startX = e.clientX;
    this.startY = e.clientY;

    if (this.selectedTool === "pencil") {
      this.currentPencilStroke = [{x: this.startX, y: this.startY}]
    }
  };

  // mouseUpHandler: When user release the mouse button, it finalizes the shape and saves it permanently
  mouseUpHandler = (e: MouseEvent) => {
    this.clicked = false;
    const width = e.clientX - this.startX;
    const height = e.clientY - this.startY;

    const selectedTool = this.selectedTool;
    let shape: Shape | null = null; 
    if (selectedTool === "rect") {
      shape = {
        type: "rect",
        x: this.startX,
        y: this.startY,
        height,
        width,
      };
    } else if (selectedTool === "circle") {
      const dx = e.clientX - this.startX // difference between the the mouse movement started and the current mouse position in x-axis
      const dy = e.clientY - this.startY

      const calradiusX = Math.abs(dx / 2) // cal. radius of x
      const calradiusY = Math.abs(dy / 2) // cal. radius of y
      shape = {
        type: "circle",
        x: this.startX + dx / 2,
        y: this.startY + dy / 2,
        radiusX: calradiusX,
        radiusY: calradiusY,
      };
    } else if (selectedTool === "line") {
      shape = {
        type: "line",
        startX: this.startX,
        startY: this.startY,
        endX: e.clientX,
        endY: e.clientY,
      };
    } else if (selectedTool === "triangle") {
      const triSide = Math.max(width, height);
      shape = {
        type: "triangle",
        x: this.startX,
        y: this.startY,
        side: triSide,
      };
    } else if (selectedTool === "pencil" && this.currentPencilStroke.length > 1) {
      shape = {
        type: "pencil",
        points: this.currentPencilStroke,
      };
      this.currentPencilStroke = [];
    }

    if (!shape) {
      return;
    }

    this.existingShapes.push(shape);

    this.socket.send(
      JSON.stringify({
        type: "chat",
        message: JSON.stringify({
          shape,
        }),
        roomId: this.roomId,
      })
    );
  };

  // mouseMoveHandler: While user drag the mouse it shows live preview of the shape.
  mouseMoveHandler = (e: MouseEvent) => {
    if (this.clicked) {
      const width = e.clientX - this.startX;
      const height = e.clientY - this.startY;
      this.clearCanvas();

      this.ctx.strokeStyle = "rgba(255, 255, 255)";

      const selectedTool: Tool = this.selectedTool;

      if (selectedTool === "rect") {
        this.ctx.strokeRect(this.startX, this.startY, width, height);
      } else if (selectedTool === "circle") {
        // const radius = Math.max(width, height) / 2;
        // const centerX = this.startX + radius;
        // const centerY = this.startY + radius;
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        const radiusX = Math.abs(dx / 2);
        const radiusY = Math.abs(dy / 2);
        const x = this.startX + dx / 2;
        const y = this.startY + dy / 2;

        this.ctx.beginPath();
        // this.ctx.ellipse(centerX, centerY, Math.abs(radius), 0, Math.PI * 2);
        this.ctx.ellipse(x, y, Math.abs(radiusX), Math.abs(radiusY), 0, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.stroke();
      } else if (selectedTool === "line") {
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(e.clientX, e.clientY);
        this.ctx.stroke();
      } else if (selectedTool === "triangle") {
        this.ctx.beginPath();

        const side = Math.max(Math.abs(width), Math.abs(height));
        const triangleHeight = (side * Math.sqrt(3)) / 2;

        this.ctx.moveTo(this.startX + side / 2, this.startY);
        this.ctx.lineTo(this.startX, this.startY + triangleHeight);
        this.ctx.lineTo(this.startX + side, this.startY + triangleHeight);
        this.ctx.closePath();
        this.ctx.stroke();
      } else if (selectedTool === "pencil") {
        this.currentPencilStroke.push({x: e.clientX, y: e.clientY})
        this.ctx.beginPath();
        this.ctx.moveTo(this.currentPencilStroke[0].x, this.currentPencilStroke[0].y);
        this.currentPencilStroke.forEach(point => {
          this.ctx.lineTo(point.x, point.y);
        })
        this.ctx.stroke();
        // this.ctx.closePath();
      } 
    }
  };

  initMouseHandlers() {
    this.canvas.addEventListener("mousedown", this.mouseDownHandler);
    this.canvas.addEventListener("mouseup", this.mouseUpHandler);
    this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
  }
}
