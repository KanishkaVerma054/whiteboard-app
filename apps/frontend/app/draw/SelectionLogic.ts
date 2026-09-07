import type { Shape } from "./Game";

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HandleName = "nw" | "ne" | "sw" | "se";

const OPPOSITE_HANDLE: Record<HandleName, HandleName> = {
  nw: "se",
  ne: "sw",
  sw: "ne",
  se: "nw",
};

export class SelectionLogic {
  // Normalizes every shape type down to a top-left/width/height box in world coords.
  static getBoundingBox(shape: Shape): BoundingBox {
    switch (shape.type) {
      case "rect": {
        const x = Math.min(shape.x, shape.x + shape.width);
        const y = Math.min(shape.y, shape.y + shape.height);
        return { x, y, width: Math.abs(shape.width), height: Math.abs(shape.height) };
      }
      case "circle": {
        return {
          x: shape.x - shape.radiusX,
          y: shape.y - shape.radiusY,
          width: shape.radiusX * 2,
          height: shape.radiusY * 2,
        };
      }
      case "line": {
        const x = Math.min(shape.startX, shape.endX);
        const y = Math.min(shape.startY, shape.endY);
        return {
          x,
          y,
          width: Math.abs(shape.endX - shape.startX),
          height: Math.abs(shape.endY - shape.startY),
        };
      }
      case "arrow": {
        const x = Math.min(shape.x, shape.toX);
        const y = Math.min(shape.y, shape.toY);
        return {
          x,
          y,
          width: Math.abs(shape.toX - shape.x),
          height: Math.abs(shape.toY - shape.y),
        };
      }
      case "triangle": {
        const height = (shape.side * Math.sqrt(3)) / 2;
        return { x: shape.x, y: shape.y, width: shape.side, height };
      }
      case "diamond": {
        // stored center-based, so shift back to top-left
        return {
          x: shape.x - shape.width / 2,
          y: shape.y - shape.height / 2,
          width: shape.width,
          height: shape.height,
        };
      }
      case "pencil": {
        // legacy/malformed rows can have a missing or empty points array — treat as an empty box
        if (!Array.isArray(shape.points) || shape.points.length === 0) {
          return { x: 0, y: 0, width: 0, height: 0 };
        }
        const xs = shape.points.map((p) => p.x);
        const ys = shape.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
      default:
        // an unrecognized shape.type shouldn't be possible (callers filter with isKnownShape),
        // but don't let a bad runtime value crash hit-testing — treat it as empty/unselectable
        return { x: 0, y: 0, width: 0, height: 0 };
    }
  }

  static isPointInBox(x: number, y: number, box: BoundingBox, padding = 0): boolean {
    return (
      x >= box.x - padding &&
      x <= box.x + box.width + padding &&
      y >= box.y - padding &&
      y <= box.y + box.height + padding
    );
  }

  // Topmost shape whose bounding box contains (x, y), or null if none hit.
  // padding lets thin shapes (a zero-height line, say) still be clickable.
  static hitTest(shapes: Shape[], x: number, y: number, padding = 0): number | null {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const box = this.getBoundingBox(shapes[i]);
      const local = this.toLocalPoint(x, y, box, shapes[i].rotation);
      // if (this.isPointInBox(x, y, this.getBoundingBox(shapes[i]), padding)) {
      if (this.isPointInBox(local.x, local.y, box, padding)) {
        return i;
      }
    }
    return null;
  }

  static getRotateHandlePosition(box: BoundingBox, offset: number): {x: number; y: number} {
    return {
      x : box.x + box.width / 2,
      y: box.y - offset
    };
  }

  static getHandlePositions(box: BoundingBox): Record<HandleName, { x: number; y: number }> {
    return {
      nw: { x: box.x, y: box.y },
      ne: { x: box.x + box.width, y: box.y },
      sw: { x: box.x, y: box.y + box.height },
      se: { x: box.x + box.width, y: box.y + box.height },
    };
  }

  // Which corner handle (if any) contains (x, y). handleSize is the hit-test square's full side length, in the same units as the box.
  static hitTestHandle(box: BoundingBox, x: number, y: number, handleSize: number): HandleName | null {
    const half = handleSize / 2;
    const handles = this.getHandlePositions(box);
    for (const name of Object.keys(handles) as HandleName[]) {
      const h = handles[name];
      if (Math.abs(x - h.x) <= half && Math.abs(y - h.y) <= half) {
        return name;
      }
    }
    return null;
  }

  // World-space position of the corner opposite a handle — stays fixed while that handle is dragged to resize.
  static getResizeAnchor(box: BoundingBox, handle: HandleName): { x: number; y: number } {
    return this.getHandlePositions(box)[OPPOSITE_HANDLE[handle]];
  }

  static translateShape(shape: Shape, dx: number, dy: number): Shape {
    switch (shape.type) {
      case "rect":
      case "circle":
      case "triangle":
      case "diamond":
        return { ...shape, x: shape.x + dx, y: shape.y + dy };
      case "line":
        return {
          ...shape,
          startX: shape.startX + dx,
          startY: shape.startY + dy,
          endX: shape.endX + dx,
          endY: shape.endY + dy,
        };
      case "arrow":
        return { ...shape, x: shape.x + dx, y: shape.y + dy, toX: shape.toX + dx, toY: shape.toY + dy };
      case "pencil":
        if (!Array.isArray(shape.points)) return shape;
        return { ...shape, points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
      default:
        return shape;
    }
  }

  // Inverse of getBoundingBox: rewrites a shape's geometry to fit a new box.
  static applyBoundingBox(shape: Shape, box: BoundingBox): Shape {
    switch (shape.type) {
      case "rect":
        return { ...shape, x: box.x, y: box.y, width: box.width, height: box.height };
      case "circle":
        return {
          ...shape,
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
          radiusX: box.width / 2,
          radiusY: box.height / 2,
        };
      case "triangle":
        // triangle only has one size field (equilateral side) so width/height
        // can't move independently — match the larger drag distance, same as
        // how the triangle tool itself derives `side` on creation
        return { ...shape, x: box.x, y: box.y, side: Math.max(box.width, box.height) };
      case "diamond":
        return {
          ...shape,
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
          width: box.width,
          height: box.height,
        };
      case "line":
        return { ...shape, startX: box.x, startY: box.y, endX: box.x + box.width, endY: box.y + box.height };
      case "arrow":
        return { ...shape, x: box.x, y: box.y, toX: box.x + box.width, toY: box.y + box.height };
      case "pencil": {
        if (!Array.isArray(shape.points) || shape.points.length === 0) {
          return shape;
        }
        // no direct fields to resize — rescale every point from the old box into the new one
        const old = this.getBoundingBox(shape);
        const sx = old.width === 0 ? 1 : box.width / old.width;
        const sy = old.height === 0 ? 1 : box.height / old.height;
        return {
          ...shape,
          points: shape.points.map((p) => ({
            x: box.x + (p.x - old.x) * sx,
            y: box.y + (p.y - old.y) * sy,
          })),
        };
      }
      default:
        return shape;
    }
  }

  // Converts a world-space point into the shape's local (unrotated) frame, by rotating it
  // backwards around the box's center — the inverse of the rotation applied at render time.
  static toLocalPoint(x: number, y: number, box: BoundingBox, rotation: number) {
    if (rotation === 0) {
      return {x, y}
    }
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const dx = x - cx;
    const dy = y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  }
}
