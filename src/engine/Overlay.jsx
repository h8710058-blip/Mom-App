import { useEffect, useState } from 'react';

const esc = (id) => id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

// A target can have an invisible "spot" (e.g. empty desktop) to draw the ring around.
function locate(root, id) {
  if (!id) return null;
  const el = root.querySelector(`[data-spot="${esc(id)}"]`) || root.querySelector(`[data-target="${esc(id)}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  const base = root.getBoundingClientRect();
  return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
}

const same = (a, b) =>
  a === b || (a && b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5);

/**
 * Draws the amber spotlight ring (dims everything else) and the animated cursor.
 * It follows the target element every frame, so it keeps up with windows moving.
 */
export default function Overlay({ wrapRef, target, showRing, cursorTarget, showCursor, pulse }) {
  const [ring, setRing] = useState(null);
  const [cursor, setCursor] = useState({ x: 70, y: 340 });

  useEffect(() => {
    let raf;
    const tick = () => {
      const root = wrapRef.current;
      if (root) {
        const nextRing = locate(root, target);
        setRing((prev) => (same(prev, nextRing) ? prev : nextRing));
        const c = locate(root, cursorTarget);
        if (c) {
          const nx = c.x + c.w / 2;
          const ny = c.y + c.h / 2;
          setCursor((prev) => (Math.abs(prev.x - nx) < 0.5 && Math.abs(prev.y - ny) < 0.5 ? prev : { x: nx, y: ny }));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wrapRef, target, cursorTarget]);

  return (
    <div className="overlay" aria-hidden="true">
      {showRing && ring && (
        <div className="ring" style={{ left: ring.x - 7, top: ring.y - 7, width: ring.w + 14, height: ring.h + 14 }} />
      )}
      {showCursor && (
        <div className="cursor" style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}>
          {pulse > 0 && <span key={pulse} className="ripple" />}
          <svg width="30" height="34" viewBox="0 0 30 34">
            <path d="M3 2l22 16-10 2 6 11-5 3-6-11-7 7z" fill="#fff" stroke="#1F2933" strokeWidth="2.2" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
