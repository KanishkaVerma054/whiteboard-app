import { DEFAULT_BG_FILL } from "@/types/types";
import type { Shape } from "./Game";
import { SelectionLogic } from "./SelectionLogic";

type Point = { x: number; y: number };

export class EraserLogic {
  // Shortest distance from a point to the segment a-b. Clamping t keeps the answer on the
  // segment itself instead of on the infinite line through it.
  static distanceToSegment(px: number, py: number, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(px - a.x, py - a.y);
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSq));
    return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
  }

  static isPointNearPath(px: number, py: number, points: Point[], tolerance: number): boolean {
    for (let i = 1; i < points.length; i++) {
      if (this.distanceToSegment(px, py, points[i - 1], points[i]) <= tolerance) return true;
    }
    return false;
  }

  // Ray casting: a ray from the point crosses a polygon's edges an odd number of times only if the point is inside.
  static isPointInPolygon(px: number, py: number, vertices: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const a = vertices[i];
      const b = vertices[j];
      if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) {
        inside = !inside;
      }
    }
    return inside;
  }

  static isPointOnPolygon(px: number, py: number, vertices: Point[], tolerance: number, filled: boolean): boolean {
    if (filled && this.isPointInPolygon(px, py, vertices)) return true;
    return this.isPointNearPath(px, py, [...vertices, vertices[0]], tolerance);
  }

  // Unlike isPointInBox this follows the shape's real outline. A shape with no background
  // only counts along its stroke; a filled one counts across its whole inside too.
  static isPointOnShape(shape: Shape, x: number, y: number, tolerance: number): boolean {
    const box = SelectionLogic.getBoundingBox(shape);
    const { x: px, y: py } = SelectionLogic.toLocalPoint(x, y, box, shape.rotation);
    const filled = "bgFill" in shape && (shape.bgFill ?? DEFAULT_BG_FILL) !== DEFAULT_BG_FILL;

    switch (shape.type) {
      case "rect": {
        const right = box.x + box.width;
        const bottom = box.y + box.height;
        return this.isPointOnPolygon(px, py, [
          { x: box.x, y: box.y },
          { x: right, y: box.y },
          { x: right, y: bottom },
          { x: box.x, y: bottom },
        ], tolerance, filled);
      }
      case "triangle":
        return this.isPointOnPolygon(px, py, [
          { x: box.x + box.width / 2, y: box.y },
          { x: box.x, y: box.y + box.height },
          { x: box.x + box.width, y: box.y + box.height },
        ], tolerance, filled);
      case "diamond":
        return this.isPointOnPolygon(px, py, [
          { x: box.x + box.width / 2, y: box.y },
          { x: box.x + box.width, y: box.y + box.height / 2 },
          { x: box.x + box.width / 2, y: box.y + box.height },
          { x: box.x, y: box.y + box.height / 2 },
        ], tolerance, filled);
      case "circle": {
        const dx = px - shape.x;
        const dy = py - shape.y;
        const insideOuter = Math.hypot(dx / (shape.radiusX + tolerance), dy / (shape.radiusY + tolerance)) <= 1;
        if (!insideOuter) return false;
        const innerX = shape.radiusX - tolerance;
        const innerY = shape.radiusY - tolerance;
        // a circle smaller than the tolerance has no hollow middle left to miss
        if (filled || innerX <= 0 || innerY <= 0) return true;
        return Math.hypot(dx / innerX, dy / innerY) >= 1;
      }
      case "line":
        return this.distanceToSegment(px, py, { x: shape.startX, y: shape.startY }, { x: shape.endX, y: shape.endY }) <= tolerance;
      case "arrow":
        return this.distanceToSegment(px, py, { x: shape.x, y: shape.y }, { x: shape.toX, y: shape.toY }) <= tolerance;
      case "pencil": {
        if (!Array.isArray(shape.points)) return false;
        if (filled && SelectionLogic.isPencilPathClosed(shape.points) && this.isPointInPolygon(px, py, shape.points)) return true;
        return this.isPointNearPath(px, py, shape.points, tolerance);
      }
      case "text":
        return SelectionLogic.isPointInBox(px, py, box, tolerance);
      default:
        return false;
    }
  }

  // Topmost shape actually touched at (x, y), or null. Same backward walk as hitTest.
  static hitTestShapeGeometry(shapes: Shape[], x: number, y: number, tolerance: number): number | null {
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (this.isPointOnShape(shapes[i], x, y, tolerance)) return i;
    }
    return null;
  }
}
