import { ReactNode } from "react";
import { AlignCenter, AlignLeft, AlignRight, CaseSensitive, CodeXml, Pencil } from "lucide-react";
import {
  BG_FILLS,
  DEFAULT_BG_FILL,
  FONT_FAMILIES,
  FONT_SIZES,
  FontFamily,
  FontSizes,
  PanelState,
  STROKE_COLOURS,
  STROKE_WIDTHS,
  StrokeEdge,
  StrokeStyle,
  StrokeWidth,
  TextAlign,
} from "@/types/types";

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

// top-left style panel for the selected shape / current tool / open text editor
export function PropertiesPanel({
  panel,
  onFontFamilyChange,
  onFontSizeChange,
  onTextAlignChange,
  onStrokeColorChange,
  onStrokeWidthChange,
  onStrokeStyleChange,
  onBgFillChange,
  onStrokeEdgeChange,
}: {
  panel: PanelState | null;
  onFontFamilyChange: (f: FontFamily) => void;
  onFontSizeChange: (s: number) => void;
  onTextAlignChange: (a: TextAlign) => void;
  onStrokeColorChange: (c: string) => void;
  onStrokeWidthChange: (w: number) => void;
  onStrokeStyleChange: (s: StrokeStyle) => void;
  onBgFillChange: (c: string) => void;
  onStrokeEdgeChange: (e: StrokeEdge) => void;
}) {
  if (!panel) return null;
  const text = panel.text;
  return (
    <div
      className="fixed top-4 left-4 flex flex-col gap-1.5 w-fit rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-white"
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
  );
}
