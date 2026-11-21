export const CANVAS_STORAGE_KEY = "simple_canvas_key"
export const VIEWPORT_SECRET_KEY = "canvas_viewport"
export const HANDLE_SCREEN_SIZE = 8; // px, kept constant on screen regardless of zoom
export const HIT_TEST_PADDING = 6; // px, generous click target for thin shapes like line/arrow
export const ROTATE_HANDLE_OFFSET = 24; // px above the box's top edge, constant on screen regardless of zoom
export const SELECTION_COLOR = "#3182ed" // or "#6965db"; 
export const SELECTION_PADDING = 4; // px gap between a shape and its selection outline, constant on screen regardless of zoom
export const ERASER_TOLERANCE = 6;
export const ERASER_DIM_OPACITY = 0.3

export type FontFamily = "hand-drawn" | "sans" | "code";
export const FONT_FAMILIES: Record<FontFamily, {label: string; css: string}> = {
    "hand-drawn" : {label: "Hand Drawn", css: '"HandDrawn", "Comic Sans MS", cursive'},
    sans: {label: "Simple", css: "sans-serif"},
    code: {label: "Code", css: "ui-monospace, Menlo, Consolas, monospace"}
}
export const DEFAULT_FONT_FAMILY: FontFamily = "sans";
export const LINE_HEIGHT = 1.2;
export type FontSizes = "S"| "M" | "L" | "XL";
export const FONT_SIZES: Record<FontSizes, number> = { S: 16, M: 20, L: 28, XL: 36};
export const DEFAULT_FONT_SIZE = FONT_SIZES.M 
export type TextAlign = "left" | "center" | "right";
export const DEFAULT_TEXT_ALIGN: TextAlign = "left";

//----------------------Stroke Colours--------------------------------
export const STROKE_COLOURS = ["#ffffff", "#e03131", "#2f9e44", "#1971c2", "#f08c00"]
export const DEFAULT_STROKE_COLOUR = STROKE_COLOURS[0];

//----------------------Stroke Width--------------------------------
export type StrokeWidth = "thin" | "medium" | "bold";
export const STROKE_WIDTHS: Record<StrokeWidth, number> = { thin: 1, medium: 2, bold: 4}
export const DEFAULT_STROKE_WIDTH = STROKE_WIDTHS.thin
//----------------------Stroke styles--------------------------------
export type StrokeStyle = "solid" | "dashed" | "dotted";
export const DEFAULT_STROKE_STYLE: StrokeStyle = "solid"

//---------------------Shapes Background Colour----------------------
export const BG_FILLS = ["#00000000", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#ffec99"]
export const DEFAULT_BG_FILL = BG_FILLS[0];

//--------edges----------
export type StrokeEdge = "sharp" | "round";
export const DEFAULT_STROKE_EDGE: StrokeEdge = "sharp";

export type PanelState = {
    strokeColor: string;
    strokeWidth?: number;
    strokeStyle?: StrokeStyle;
    bgFill?: string;
    strokeEdge?: StrokeEdge;
    text?: { fontFamily: FontFamily; fontSize: number; textAlign: TextAlign };
};

export const LINE_THRESHOLD = 8;

// zoom limits and button step (same values Excalidraw uses: 10%–3000%, ±10% per click)
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 30;
export const ZOOM_STEP = 0.1;


//-----message type for websockets--------
export type OutgoingMessage =
    | { type: "chat"; shapeId: string; message: string; roomId: string }
    | { type: "shape_update"; shapeId: string; message: string; roomId: string }
    | {type: "shape_delete"; shapeId: string; roomId: string};

export type StoredShapeRow = {message: string; shapeId: string | null};