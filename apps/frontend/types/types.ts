export const CANVAS_STORAGE_KEY = "simple_canvas_key"
export const VIEWPORT_SECRET_KEY = "canvas_viewport"
export const HANDLE_SCREEN_SIZE = 8; // px, kept constant on screen regardless of zoom
export const HIT_TEST_PADDING = 6; // px, generous click target for thin shapes like line/arrow
export const ROTATE_HANDLE_OFFSET = 24; // px above the box's top edge, constant on screen regardless of zoom
export const SELECTION_COLOR = "#3182ed" // or "#6965db"; 
export const SELECTION_PADDING = 4; // px gap between a shape and its selection outline, constant on screen regardless of zoom

export type FontFamily = "hand-drawn" | "sans" | "code";
export const FONT_FAMILIES: Record<FontFamily, {label: string; css: string}> = {
    "hand-drawn" : {label: "Hand Drawn", css: '"HandDrawn", "Comic Sans MS", cursive'},
    sans: {label: "Simple", css: "sans-serif"},
    code: {label: "Code", css: "ui-monospace, Menlo, Consolas, monospace"}
}
export const DEFAULT_FONT_FAMILY: FontFamily = "sans";
export const LINE_HEIGHT = 1.2;
export type PanelState = { kind: "text"; fontFamily: FontFamily }; // TODO: we can extend "kind" to stoke, colour, etc 