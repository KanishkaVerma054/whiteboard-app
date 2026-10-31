"use client";

import { useEffect, useRef } from "react";

// Same values as Excalidraw's EraserTrail (packages/excalidraw/eraser/index.ts)
const TRAIL_DECAY_TIME = 200; // ms a point stays visible before it has fully faded
const TRAIL_DECAY_LENGTH = 10; // how many of the newest points the trail tapers across
const TRAIL_SIZE = 5; // px from the trail's centre to its edge at the newest end
const TRAIL_STREAMLINE = 0.3; // 0 follows the mouse exactly, higher smooths out more jitter
const TRAIL_FILL = "rgba(255, 255, 255, 0.2)";

type TrailPoint = { x: number; y: number; time: number };

const easeOut = (k: number) => 1 - Math.pow(1 - k, 4);

// Thinner the older a point is, and the further it sits from the newest point.
const getPointSize = (time: number, index: number, total: number, now: number) => {
  const t = Math.max(0, 1 - (now - time) / TRAIL_DECAY_TIME);
  const l = (TRAIL_DECAY_LENGTH - Math.min(TRAIL_DECAY_LENGTH, total - index)) / TRAIL_DECAY_LENGTH;
  return TRAIL_SIZE * Math.min(easeOut(l), easeOut(t));
};

export const EraserTrail = ({ isActive }: { isActive: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let points: TrailPoint[] = [];
    let pressed = false;
    let frameId = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // One filled shape around the whole trail, so overlaps can't show up as darker beads.
    const drawTrail = (now: number) => {
      const total = points.length;
      const head = points[total - 1];
      const headSize = pressed ? TRAIL_SIZE : getPointSize(head.time, total - 1, total, now);

      ctx.fillStyle = TRAIL_FILL;
      ctx.beginPath();

      if (total === 1) {
        ctx.arc(head.x, head.y, headSize, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      const left: { x: number; y: number }[] = [];
      const right: { x: number; y: number }[] = [];
      points.forEach((point, i) => {
        const prev = points[Math.max(i - 1, 0)];
        const next = points[Math.min(i + 1, total - 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const length = Math.hypot(dx, dy) || 1;
        const size = i === total - 1 ? headSize : getPointSize(point.time, i, total, now);
        left.push({ x: point.x - (dy / length) * size, y: point.y + (dx / length) * size });
        right.push({ x: point.x + (dy / length) * size, y: point.y - (dx / length) * size });
      });

      // round cap around the front of the newest point, from its left edge to its right edge
      const beforeHead = points[total - 2];
      const headAngle = Math.atan2(head.y - beforeHead.y, head.x - beforeHead.x);
      const cap: { x: number; y: number }[] = [];
      for (let i = 1; i < 8; i++) {
        const angle = headAngle + Math.PI / 2 - (Math.PI * i) / 8;
        cap.push({ x: head.x + Math.cos(angle) * headSize, y: head.y + Math.sin(angle) * headSize });
      }

      const outline = [...left, ...cap, ...right.reverse()];

      // curve through the midpoints between outline points, so corners come out rounded
      const midpoint = (i: number) => {
        const a = outline[i];
        const b = outline[(i + 1) % outline.length];
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      };
      const start = midpoint(outline.length - 1);
      ctx.moveTo(start.x, start.y);
      outline.forEach((point, i) => {
        const end = midpoint(i);
        ctx.quadraticCurveTo(point.x, point.y, end.x, end.y);
      });
      ctx.closePath();
      ctx.fill();
    };

    const draw = () => {
      const now = performance.now();
      // while the button is held the newest point stays, so the trail's head never disappears
      points = points.filter(
        (p, i) => now - p.time < TRAIL_DECAY_TIME || (pressed && i === points.length - 1)
      );
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (points.length > 0) drawTrail(now);

      // only keep the loop alive while there's still something to draw
      frameId = points.length > 0 ? requestAnimationFrame(draw) : 0;
    };

    const addPoint = (e: MouseEvent) => {
      // the mouse can report the same spot twice, which would leave a segment with no direction
      if (points.length > 0 && e.clientX === lastMouseX && e.clientY === lastMouseY) return;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      const last = points[points.length - 1];
      const keep = 1 - TRAIL_STREAMLINE;
      points.push({
        x: last ? last.x + (e.clientX - last.x) * keep : e.clientX,
        y: last ? last.y + (e.clientY - last.y) * keep : e.clientY,
        time: performance.now(),
      });
      if (frameId === 0) frameId = requestAnimationFrame(draw);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // this overlay ignores the mouse, so a press on the board always targets the drawing canvas
      pressed = e.button === 0 && e.target instanceof HTMLCanvasElement;
      if (!pressed) return;
      points = []; // a new stroke must not connect to the tail of the previous one
      addPoint(e);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!pressed) return;
      // a release outside the browser window never fires mouseup here
      if ((e.buttons & 1) === 0) {
        pressed = false;
        return;
      }
      addPoint(e);
    };

    const handleMouseUp = () => {
      pressed = false;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(frameId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [isActive]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />;
};
