import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";
import { RectangleEllipsis } from "lucide-react";
import { CANVAS_STORAGE_KEY, VIEWPORT_SECRET_KEY } from "@/types/types";
import { SelectionLogic, type HandleName } from "./SelectionLogic";

const HANDLE_SCREEN_SIZE = 8; // px, kept constant on screen regardless of zoom
const HIT_TEST_PADDING = 6; // px, generous click target for thin shapes like line/arrow

// `id` mirrors the owning Chat row's `shapeId` — how the backend finds this shape again to
// persist a move/resize/delete. Every shape, old or new, is guaranteed to have one (see
// getExistingShapes in http.ts and the backfill of legacy rows).
export type Shape = { id: string } & (
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
  | {
      type: "diamond";
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      type: "arrow";
      x: number;
      y: number;
      toX: number;
      toY: number;
    }
);

const KNOWN_SHAPE_TYPES = new Set<Shape["type"]>([
  "rect",
  "circle",
  "pencil",
  "line",
  "triangle",
  "diamond",
  "arrow",
]);

// Guards against legacy/malformed rows from the backend (e.g. an old, since-removed tool's
// leftover data) or a garbage message from another client — anything not a currently-known shape.
function isKnownShape(shape: unknown): shape is Shape {
  return (
    !!shape &&
    typeof shape === "object" &&
    KNOWN_SHAPE_TYPES.has((shape as { type?: string }).type as Shape["type"])
  );
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private existingShapes: Shape[];
  private roomId: string;
  private clicked: boolean;
  private startX: number = 0;
  private startY: number = 0;
  private panX: number = 0;
  private panY: number = 0;
  private scale: number = 1;
  private onScaleChangeCallback: (scale: number) => void;
  // private outputScale: number = 1
  private saveViewportTimeout: ReturnType<typeof setTimeout> | null = null // // Holds the pending debounce timer's id, so a new pan/zoom event can cancel the previous scheduled save
  private isStandalone: boolean = false;
  private selectedTool: Tool = "arrow";
  private selectedShapeIndex: number | null = null;
  private isDraggingShape: boolean = false;
  private activeHandle: HandleName | null = null;
  private resizeAnchor: { x: number; y: number } | null = null;
  private currentPencilStroke: { x: number; y: number }[] = [];
  socket: WebSocket;

  constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket, onScaleChangeCallback: (scale: number) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.existingShapes = [];
    this.roomId = roomId;
    this.socket = socket;
    this.clicked = false;
    this.onScaleChangeCallback = onScaleChangeCallback;
    this.init();
    this.initHandlers();
    this.initMouseHandlers();
    window.addEventListener("keydown", this.keyDownHandler);
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.mouseDownHandler);

    this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
    this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);

    this.canvas.removeEventListener("wheel", this.mouseWheelHandler)
    window.removeEventListener("keydown", this.keyDownHandler);
  }

  // Delete/Backspace removes the selected shape (and broadcasts the delete); Escape clears the selection.
  keyDownHandler = (e: KeyboardEvent) => {
    if (this.selectedTool !== "select" || this.selectedShapeIndex === null) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      const shape = this.existingShapes[this.selectedShapeIndex];
      this.existingShapes.splice(this.selectedShapeIndex, 1);
      this.selectedShapeIndex = null;
      this.clearCanvas();

      this.socket.send(
        JSON.stringify({
          type: "shape_delete",
          shapeId: shape.id,
          roomId: this.roomId,
        })
      );
    } else if (e.key === "Escape") {
      this.selectedShapeIndex = null;
      this.clearCanvas();
    }
  };

  setTool(
    tool: "circle" | "pencil" | "rect" | "line" | "triangle" | "diamond" | "arrow" | "grab" | "select"
  ) {
    if (tool !== "select") {
      this.selectedShapeIndex = null;
      this.activeHandle = null;
      this.resizeAnchor = null;
      this.isDraggingShape = false;
    }
    this.selectedTool = tool;
    this.clearCanvas();
  }

  async init() {
    this.existingShapes = await getExistingShapes(this.roomId);

    if (this.isStandalone) {
      try {
        const storedShapes = localStorage.getItem(CANVAS_STORAGE_KEY)
        if (storedShapes) {
          const parsedData = JSON.parse(storedShapes);
          this.existingShapes = [...this.existingShapes, ...parsedData]
        }
      } catch(e) {
        console.error("Error loading shapes from localStorage: ", e)
      }
    }

    this.existingShapes = this.existingShapes.filter(isKnownShape);

    try {
      const storedViewport = localStorage.getItem(this.viewportStorageKey())
      if (storedViewport) {
        const { panX, panY, scale } = JSON.parse(storedViewport)
        this.panX = panX;
        this.panY = panY;
        this.scale = scale;
        this.onScaleChange(this.scale)
      }
    } catch (e) {
      console.error("Error loading viewport from localStorage:", e);
    }

    this.clearCanvas();
  }

  initHandlers() {
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type == "chat") {
        const parsedShape = JSON.parse(message.message);
        if (isKnownShape(parsedShape.shape)) {
          this.existingShapes.push(parsedShape.shape);
          this.clearCanvas();
        }
      } else if (message.type === "shape_update") {
        const parsed = JSON.parse(message.message);
        if (isKnownShape(parsed.shape)) {
          const index = this.existingShapes.findIndex((s) => s.id === message.shapeId);
          if (index !== -1) {
            this.existingShapes[index] = parsed.shape;
            this.clearCanvas();
          }
        }
      } else if (message.type === "shape_delete") {
        const index = this.existingShapes.findIndex((s) => s.id === message.shapeId);
        if (index !== -1) {
          this.existingShapes.splice(index, 1);
          if (this.selectedShapeIndex === index) {
            this.selectedShapeIndex = null;
          } else if (this.selectedShapeIndex !== null && this.selectedShapeIndex > index) {
            // keep pointing at the same shape after the splice shifts everything after it down by one
            this.selectedShapeIndex -= 1;
          }
          this.clearCanvas();
        }
      }
    };
  }

  // ClearCanvas(){} -> Clears everything; Redraws the permanent shapes; Draw the current preview shape
  clearCanvas() {
    // Clears the entire canvas:
    // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // panning and zooming using setTransform()
    this.ctx.setTransform(this.scale, 0, 0, this.scale, this.panX, this.panY)
    this.ctx.clearRect(
      -this.panX/this.scale,
      -this.panY/this.scale,
      this.canvas.width/this.scale,
      this.canvas.height/this.scale
    )

    // Sets the background to black:
    this.ctx.fillStyle = "rgba(0, 0, 0)";
    // this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillRect(
      -this.panX/this.scale,
      -this.panY/this.scale,
      this.canvas.width/this.scale,
      this.canvas.height/this.scale
    );

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
        if (shape.points && shape.points.length > 1) {
          this.ctx.beginPath();
          this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
          shape.points.forEach((point) => {
            this.ctx.lineTo(point.x, point.y);
          });
          this.ctx.stroke();
          // this.ctx.closePath();
        }
      } else if (shape.type === "diamond") {
        this.DiamondShape(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === "arrow") {
        this.ArrowShape(shape.x, shape.y, shape.toX, shape.toY);
      }
    });

    if (this.selectedShapeIndex !== null && this.existingShapes[this.selectedShapeIndex]) {
      this.drawSelectionOutline(this.existingShapes[this.selectedShapeIndex]);
    }
  }

  private drawSelectionOutline(shape: Shape) {
    const box = SelectionLogic.getBoundingBox(shape);

    this.ctx.save();
    this.ctx.setLineDash([4 / this.scale, 4 / this.scale]);
    this.ctx.lineWidth = 1 / this.scale;
    this.ctx.strokeStyle = "rgba(56, 161, 255, 0.9)";
    this.ctx.strokeRect(box.x, box.y, box.width, box.height);
    this.ctx.restore();

    const handleSize = HANDLE_SCREEN_SIZE / this.scale;
    this.ctx.save();
    this.ctx.fillStyle = "rgba(56, 161, 255, 1)";
    this.ctx.strokeStyle = "white";
    this.ctx.lineWidth = 1 / this.scale;
    Object.values(SelectionLogic.getHandlePositions(box)).forEach((h) => {
      this.ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      this.ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
    });
    this.ctx.restore();
  }

  // mouseDownHandler: User presses the mouse button; shapes begin to draw; Records where the user started to clicking
  mouseDownHandler = (e: MouseEvent) => {
    const {x, y} = this.transformScreenToWorld(e.clientX, e.clientY)
    this.clicked = true;

    // this.startX = e.clientX;
    // this.startY = e.clientY;

    this.startX = x;
    this.startY = y;

    if (this.selectedTool === "select") {
      // if a shape is already selected, check its resize handles before re-hit-testing
      if (this.selectedShapeIndex !== null) {
        const box = SelectionLogic.getBoundingBox(this.existingShapes[this.selectedShapeIndex]);
        const handle = SelectionLogic.hitTestHandle(box, x, y, HANDLE_SCREEN_SIZE / this.scale);
        if (handle) {
          this.activeHandle = handle;
          this.resizeAnchor = SelectionLogic.getResizeAnchor(box, handle);
          return;
        }
      }

      const hitIndex = SelectionLogic.hitTest(this.existingShapes, x, y, HIT_TEST_PADDING / this.scale);
      this.selectedShapeIndex = hitIndex;
      this.isDraggingShape = hitIndex !== null;
      this.clearCanvas();
      return;
    }

    if(this.selectedTool === "grab") {
      // grab tool stores raw client coords, not world coords —
      // the mousemove handler re-derives world coords from these each frame

      this.startX = e.clientX;
      this.startY = e.clientY;
    }

    if (this.selectedTool === "pencil") {
      this.currentPencilStroke = [{ x: this.startX, y: this.startY }];
    }
  };

  // mouseUpHandler: When user release the mouse button, it finalizes the shape and saves it permanently
  mouseUpHandler = (e: MouseEvent) => {
    this.clicked = false;

    if (this.selectedTool === "select") {
      const wasEditing = this.activeHandle !== null || this.isDraggingShape;
      const editedIndex = this.selectedShapeIndex;
      this.activeHandle = null;
      this.resizeAnchor = null;
      this.isDraggingShape = false;

      if (wasEditing && editedIndex !== null) {
        const shape = this.existingShapes[editedIndex];
        this.socket.send(
          JSON.stringify({
            type: "shape_update",
            shapeId: shape.id,
            message: JSON.stringify({ shape }),
            roomId: this.roomId,
          })
        );
      }
      return; // select tool never creates a new shape
    }

    const { x: endX, y: endY } = this.transformScreenToWorld(e.clientX, e.clientY);
    const width = endX - this.startX;
    const height = endY - this.startY;

    const selectedTool = this.selectedTool;
    const newShapeId = crypto.randomUUID();
    let shape: Shape | null = null;
    if (selectedTool === "rect") {
      shape = {
        id: newShapeId,
        type: "rect",
        x: this.startX,
        y: this.startY,
        height,
        width,
      };
    } else if (selectedTool === "circle") {
      const dx = endX - this.startX; // difference between the the mouse movement started and the current mouse position in x-axis
      const dy = endY - this.startY;

      const calradiusX = Math.abs(dx / 2); // cal. radius of x
      const calradiusY = Math.abs(dy / 2); // cal. radius of y
      shape = {
        id: newShapeId,
        type: "circle",
        x: this.startX + dx / 2,
        y: this.startY + dy / 2,
        radiusX: calradiusX,
        radiusY: calradiusY,
      };
    } else if (selectedTool === "line") {
      shape = {
        id: newShapeId,
        type: "line",
        startX: this.startX,
        startY: this.startY,
        endX,
        endY,
      };
    } else if (selectedTool === "triangle") {
      const triSide = Math.max(width, height);
      shape = {
        id: newShapeId,
        type: "triangle",
        x: this.startX,
        y: this.startY,
        side: triSide,
      };
    } else if (
      selectedTool === "pencil" &&
      this.currentPencilStroke.length > 1
    ) {
      shape = {
        id: newShapeId,
        type: "pencil",
        points: this.currentPencilStroke,
      };
      this.currentPencilStroke = [];
    } else if (selectedTool === "diamond") {
      const dx = endX - this.startX;
      const dy = endY - this.startY;

      // center of the diamond from where the drag happens
      const cx = this.startX + dx/2;
      const cy = this.startY + dy/2;

      const width = Math.abs(dx);
      const height = Math.abs(dy);
      shape = {
        id: newShapeId,
        type: "diamond",
        x: cx,
        y: cy,
        width: width,
        height: height
      }
    } else if (selectedTool === "arrow") {
      shape = {
        id: newShapeId,
        type: "arrow",
        x: this.startX,
        y: this.startY,
        toX: endX,
        toY: endY
      }
    }

    if (!shape) {
      return;
    }

    this.existingShapes.push(shape);

    this.socket.send(
      JSON.stringify({
        type: "chat",
        shapeId: shape.id,
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
      const selectedTool: Tool = this.selectedTool;
      const { x: curX, y: curY } =
        selectedTool === "grab"
          ? { x: e.clientX, y: e.clientY }
          : this.transformScreenToWorld(e.clientX, e.clientY);
      const width = curX - this.startX;
      const height = curY - this.startY;
      this.clearCanvas();

      this.ctx.strokeStyle = "rgba(255, 255, 255)";

      if (selectedTool === "rect") {
        this.ctx.strokeRect(this.startX, this.startY, width, height);
      } else if (selectedTool === "circle") {
        // const radius = Math.max(width, height) / 2;
        // const centerX = this.startX + radius;
        // const centerY = this.startY + radius;
        const dx = curX - this.startX;
        const dy = curY - this.startY;
        const radiusX = Math.abs(dx / 2);
        const radiusY = Math.abs(dy / 2);
        const x = this.startX + dx / 2;
        const y = this.startY + dy / 2;

        this.ctx.beginPath();
        // this.ctx.ellipse(centerX, centerY, Math.abs(radius), 0, Math.PI * 2);
        this.ctx.ellipse(
          x,
          y,
          Math.abs(radiusX),
          Math.abs(radiusY),
          0,
          0,
          Math.PI * 2
        );
        this.ctx.closePath();
        this.ctx.stroke();
      } else if (selectedTool === "line") {
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(curX, curY);
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
        this.currentPencilStroke.push({ x: curX, y: curY });
        this.ctx.beginPath();
        this.ctx.moveTo(
          this.currentPencilStroke[0].x,
          this.currentPencilStroke[0].y
        );
        this.currentPencilStroke.forEach((point) => {
          this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.stroke();
        // this.ctx.closePath();
      } else if (selectedTool === "diamond") {
        const dx = curX - this.startX;
        const dy = curY - this.startY;

        // center point calculation
        const cx = this.startX + dx/2;
        const cy = this.startY + dy/2;

        const width = Math.abs(dx);
        const height = Math.abs(dy);
        this.DiamondShape(cx, cy, width, height);
      } else if (selectedTool === "arrow") {
        this.ArrowShape(this.startX, this.startY, curX, curY)
      } else if (selectedTool === "select") {
        if (this.activeHandle !== null && this.resizeAnchor !== null && this.selectedShapeIndex !== null) {
          const anchor = this.resizeAnchor;
          const box = {
            x: Math.min(anchor.x, curX),
            y: Math.min(anchor.y, curY),
            width: Math.abs(curX - anchor.x),
            height: Math.abs(curY - anchor.y),
          };
          this.existingShapes[this.selectedShapeIndex] = SelectionLogic.applyBoundingBox(
            this.existingShapes[this.selectedShapeIndex],
            box
          );
        } else if (this.isDraggingShape && this.selectedShapeIndex !== null) {
          const dx = curX - this.startX;
          const dy = curY - this.startY;
          this.existingShapes[this.selectedShapeIndex] = SelectionLogic.translateShape(
            this.existingShapes[this.selectedShapeIndex],
            dx,
            dy
          );
          this.startX = curX;
          this.startY = curY;
        }
        this.clearCanvas()
      } else if (this.clicked && selectedTool === "grab") {
        
        const {x: trasformedX, y: transformedY} = this.transformScreenToWorld(e.clientX, e.clientY)
        const {x: startTransformedX, y: startTransformedY} = this.transformScreenToWorld(this.startX, this.startY)

        const deltaX = trasformedX - startTransformedX;
        const deltaY = transformedY - startTransformedY;

        this.panX += deltaX * this.scale;
        this.panY += deltaY * this.scale;
        this.startX = e.clientX;
        this.startY = e.clientY;

        this.saveViewport() // for saving to localstorage

        this.clearCanvas()
      }
    }
  };

  mouseWheelHandler = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // zoom
      const scaleAmount = -e.deltaY/200 // for scrollling "up" // -ve deltaY means zoom in
      const newScale = this.scale * (1 + scaleAmount)

      const mouseX = e.clientX - this.canvas.offsetLeft
      const mouseY = e.clientY - this.canvas.offsetTop

      const worldX = (mouseX-this.panX)/this.scale;
      const worldY = (mouseY-this.panY)/this.scale;

      this.panX -= worldX * (newScale - this.scale)
      this.panY -= worldY * (newScale - this.scale)

      this.scale = newScale
      this.onScaleChange(this.scale)
      this.saveViewport() // for saving to localstorage
    } else {
      // pan
      this.panX -= e.deltaX,
      this.panY -= e.deltaY
      this.saveViewport() // for saving to localstorage
    }
    this.clearCanvas()
  }

  initMouseHandlers() {
    this.canvas.addEventListener("mouseup", this.mouseUpHandler);
    this.canvas.addEventListener("mousedown", this.mouseDownHandler);
    this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.addEventListener("wheel", this.mouseWheelHandler, {passive: false});
  }

  // TODO:-----------Shape Logic...will be moved to saperate file later on----------------

  DiamondShape(centerX: number, centerY: number, width: number, height: number) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    const topX = centerX;
    const topY = centerY - halfHeight;

    const rightX = centerX + halfWidth;
    const rightY = centerY;

    const bottomX = centerX;
    const bottomY = centerY + halfHeight;

    const leftX = centerX - halfWidth;
    const leftY = centerY;

    this.ctx.beginPath();
    this.ctx.moveTo(topX, topY);
    this.ctx.lineTo(rightX, rightY);
    this.ctx.lineTo(bottomX, bottomY);
    this.ctx.lineTo(leftX, leftY);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  ArrowShape(fromX: number, fromY: number, toX: number, toY: number) {
    var arrowHeadAngle = Math.atan2(toY-fromY, toX-fromX)
    var ARROW_HEAD_LENGTH = 10;

    const arrowLength = ARROW_HEAD_LENGTH

    const arrowX1 = toX - arrowLength * Math.cos(arrowHeadAngle - Math.PI / 6)
    const arrowY1 = toY - arrowLength * Math.sin(arrowHeadAngle - Math.PI / 6)
    const arrowX2 = toX - arrowLength * Math.cos(arrowHeadAngle + Math.PI / 6)
    const arrowY2 = toY - arrowLength * Math.sin(arrowHeadAngle + Math.PI / 6)

    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.lineTo(arrowX1, arrowY1);
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(arrowX2, arrowY2);
    this.ctx.stroke();
  }

  //----------------------------Panning and Zooming-----------------------------------------------

  transformScreenToWorld(clientX: number, clientY: number): {x: number; y: number} {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left - this.panX)/this.scale;
    const y = (clientY - rect.top - this.panY)/this.scale;
    return {x, y};
  };

  setScale(newScale: number) {
    const rect = this.canvas.getBoundingClientRect();
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    this.panX -= centerX * (newScale - this.scale);
    this.panY -= centerY * (newScale - this.scale);

    this.scale = newScale
    this.onScaleChange(this.scale)
    this.saveViewport() // for saving to localstorage
    this.clearCanvas()
  }

  onScaleChange(scale: number) {
    // this.outputScale = scale;
    // if (this.onScaleChangeCallback) {
    //   this.onScaleChangeCallback(scale)
    // }
    this.onScaleChangeCallback?.(scale);
  }
  
  //----------------------------Bounding Box-----------------------------------------------

  

  //----------------------------Panning and Zooming-----------------------------------------
  
  // Builds a per-room storage key so switching rooms doesn't leak one room's saved camera position into another's
  private viewportStorageKey(): string {
    return `${VIEWPORT_SECRET_KEY}${this.roomId}`;
  }
  
  // Debounced write of panX/panY/scale to localStorage — only persists once pan/zoom activity pauses for 150ms
  private saveViewport() {
    if(this.saveViewportTimeout) clearTimeout(this.saveViewportTimeout) // cancel any pending save
    this.saveViewportTimeout = setTimeout(() => { // schedule a new one, remember its handle
      try {
        localStorage.setItem(
          this.viewportStorageKey(),
          JSON.stringify({panX: this.panX, panY: this.panY, scale: this.scale})
        )
      } catch (e) {
        console.error("Error saving viewport to localStorage:", e)
      }
    }, 150)
  }
}