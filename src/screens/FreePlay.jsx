import { useLayoutEffect, useRef, useState } from 'react';
import Desktop, { STAGE_H, STAGE_W } from '../sim/Desktop.jsx';
import { config } from '../config.js';

export default function FreePlay({ onExit }) {
  const [run, setRun] = useState(0);
  const [scale, setScale] = useState(1);
  const wrapRef = useRef(null);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    const update = () => setScale(Math.min(1.25, el.clientWidth / STAGE_W));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <section className="screen">
      <button className="btn" onClick={onExit}>Back</button>
      <button className="btn" onClick={() => setRun((n) => n + 1)}>Reset</button>
      <div className="stage-wrap" ref={wrapRef} style={{ height: STAGE_H * scale }}>
        <div className="stage-scaler" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
          <Desktop key={run} setup={{ open: [] }} version={config.windowsVersion} />
        </div>
      </div>
    </section>
  );
}
