import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Desktop, { STAGE_H, STAGE_W } from '../sim/Desktop.jsx';
import Overlay from '../engine/Overlay.jsx';
import Keycaps from '../engine/Keycaps.jsx';
import { resolveSteps } from '../lessons/index.js';
import { canSpeak, speak, stopSpeaking } from '../speech.js';
import { config } from '../config.js';

const MODES = {
  watch: { label: 'Watch me', blurb: 'Sit back. I will show you every step.', icon: '👀' },
  guided: { label: 'Do it with me', blurb: 'You click. I will point to the right place.', icon: '👆' },
  try: { label: 'Try it yourself', blurb: 'No pointing. Ask for a hint if you get stuck.', icon: '⭐' },
};
const MODE_ORDER = ['watch', 'guided', 'try'];
const ACTION_WORD = {
  click: 'a single click',
  dblclick: 'a double-click (two quick clicks)',
  rightclick: 'a right-click (the right-hand button)',
};

const norm = (t = '') => t.toLowerCase().replace(/\s+/g, ' ').trim();

export default function LessonPlayer({ lesson, lessons, progress, settings, onExit, onOpenLesson, onComplete }) {
  const steps = useMemo(() => resolveSteps(lesson, config.windowsVersion), [lesson]);
  const [mode, setMode] = useState(null);
  const [runId, setRunId] = useState(0);
  const [idx, setIdx] = useState(0);
  const [hint, setHint] = useState(false);
  const [nudge, setNudge] = useState('');
  const [paused, setPaused] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [lit, setLit] = useState(false);
  const [cursorTarget, setCursorTarget] = useState(null);
  const [scale, setScale] = useState(1);

  const waits = useRef(new Set());
  const sleep = useCallback((ms) => new Promise((resolve) => {
    const timer = setTimeout(() => { waits.current.delete(timer); resolve(); }, ms);
    waits.current.add(timer);
  }), []);
  const cancelWaits = () => {
    waits.current.forEach(clearTimeout);
    waits.current.clear();
  };
  useEffect(() => cancelWaits, []);
  const simRef = useRef(null);
  const wrapRef = useRef(null);
  const idxRef = useRef(0);
  const modeRef = useRef(null);
  const performed = useRef(0);
  const advancing = useRef(false);
  const nudgeTimer = useRef(null);
  const advanceTimer = useRef(null);
  const clearTimers = () => {
    clearTimeout(nudgeTimer.current);
    clearTimeout(advanceTimer.current);
  };
  useEffect(() => clearTimers, []);
  useEffect(() => {
    if (mode === null) clearTimers();
  }, [mode]);
  const completedRef = useRef(false);
  idxRef.current = idx;
  modeRef.current = mode;

  const finished = mode !== null && idx >= steps.length;
  const step = !finished && mode ? steps[idx] : null;

  /* Scale the 1100x620 desktop to the available width. */
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setScale(Math.min(1.25, el.clientWidth / STAGE_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, finished]);

  const start = useCallback((m) => {
    clearTimers();
    stopSpeaking();
    setMode(m);
    setIdx(0);
    setHint(false);
    setNudge('');
    setPaused(false);
    setLit(false);
    setCursorTarget(null);
    performed.current = 0;
    advancing.current = false;
    completedRef.current = false;
    setRunId((r) => r + 1);
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  /* Completion */
  useEffect(() => {
    if (finished && !completedRef.current) {
      completedRef.current = true;
      onComplete(lesson.id, mode);
    }
  }, [finished, lesson.id, mode, onComplete]);

  /* Read steps aloud if the setting is on */
  useEffect(() => {
    if (settings.autoRead && step) speak(step.say);
  }, [step, settings.autoRead]);

  const showNudge = useCallback((text) => {
    setNudge(text);
    clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudge(''), 3500);
  }, []);

  const advance = useCallback((st) => {
    if (advancing.current) return;
    advancing.current = true;
    setNudge('');
    setHint(false);
    advanceTimer.current = setTimeout(() => {
      advancing.current = false;
      setIdx((i) => i + 1);
    }, st.action === 'type' ? 900 : 600);
  }, []);

  /* Events coming from the simulated desktop (Guided and Try modes) */
  const onAction = useCallback(
    (ev) => {
      const m = modeRef.current;
      if (m !== 'guided' && m !== 'try') return;
      const st = steps[idxRef.current];
      if (!st || advancing.current) return;
      const want = st.action === 'key' ? st.combo : st.target;
      if (ev.action === st.action && ev.target === want) {
        if (st.action === 'type' && norm(ev.payload?.value) !== norm(st.text)) return;
        advance(st);
      } else if (
        m === 'guided' &&
        st.action !== 'type' &&
        st.action !== 'key' &&
        ev.target === st.target &&
        ev.action !== st.action &&
        !(ev.action === 'click' && st.action === 'dblclick')
      ) {
        showNudge(`Nearly! This step needs ${ACTION_WORD[st.action]}.`);
      }
    },
    [steps, advance, showNudge]
  );

  /* Guided mode only lets her touch the highlighted thing */
  const guard = useCallback(
    (id, eventType) => {
      if (modeRef.current !== 'guided') return true;
      const st = steps[idxRef.current];
      if (!st || advancing.current) return false;
      const action = ({ doubleclick: 'dblclick', contextmenu: 'rightclick', change: 'type' })[eventType] || eventType;
      if (st.action === 'key') return action === 'key' && id === st.combo;
      if (id !== st.target) return false;
      return action === st.action || (action === 'click' && ['dblclick', 'type'].includes(st.action));
    },
    [steps]
  );
  const onBlocked = useCallback(
    () => showNudge(steps[idxRef.current]?.action === 'key' ? 'Use the keyboard for this one.' : 'Not that one. Click the glowing spot.'),
    [steps, showNudge]
  );

  const runStep = useCallback(async (st, typing, isCancelled) => {
    const sim = simRef.current;
    if (!sim) return;
    if (st.action === 'key') {
      sim.perform('key', st.combo);
      performed.current = idxRef.current + 1;
    }
    else if (st.action === 'type') {
      if (typing) {
        const value = document.querySelector(`[data-target="${st.target}"]`)?.value || '';
        const offset = st.text.startsWith(value) ? value.length : 0;
        for (let k = offset + 1; k <= st.text.length; k++) {
          if (isCancelled()) return;
          sim.perform('type', st.target, { value: st.text.slice(0, k) });
          await sleep(85);
        }
      } else sim.perform('type', st.target, { value: st.text });
      if (!isCancelled()) performed.current = idxRef.current + 1;
    } else {
      sim.perform(st.action, st.target);
      performed.current = idxRef.current + 1;
    }
  }, [sleep]);

  /* Watch mode: the lesson plays itself */
  useEffect(() => {
    if (mode !== 'watch' || paused) return undefined;
    let cancelled = false;
    const isCancelled = () => cancelled;
    (async () => {
      let i = performed.current;
      while (!cancelled && i < steps.length) {
        const st = steps[i];
        setIdx(i);
        idxRef.current = i;
        await sleep(1000);
        if (cancelled) return;
        if (st.action === 'key') {
          setLit(true);
          await sleep(1300);
          if (cancelled) return;
          await runStep(st, true, isCancelled);
          setLit(false);
        } else {
          setCursorTarget(st.target);
          await sleep(1500);
          if (cancelled) return;
          setPulse((p) => p + 1);
          await sleep(300);
          if (cancelled) return;
          await runStep(st, true, isCancelled);
        }
        if (cancelled) return;
        performed.current = i + 1;
        await sleep(1100);
        i += 1;
      }
      if (!cancelled) setIdx(steps.length);
    })();
    return () => {
      cancelled = true;
      cancelWaits();
    };
  }, [mode, paused, runId, steps, runStep, sleep]);

  const doItForMe = () => step && runStep(step, false, () => false);

  /* ---------- Intro ---------- */
  if (!mode) {
    const done = progress.lessons[lesson.id] || {};
    const nextMode = MODE_ORDER.find((m) => !done[m]) || 'watch';
    return (
      <section className="screen">
        <button className="btn ghost back" onClick={onExit}>
          ← All lessons
        </button>
        <div className="card intro">
          <h1>{lesson.title}</h1>
          <p className="lead">{lesson.summary}</p>
          <h2>In this lesson you will</h2>
          <ul className="learn">
            {lesson.learn.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <h2>Choose how to learn</h2>
          <div className="mode-grid">
            {MODE_ORDER.map((m, i) => (
              <button key={m} className={`mode-card ${m === nextMode ? 'recommended' : ''}`} onClick={() => start(m)}>
                <span className="mode-num">{done[m] ? '✓' : i + 1}</span>
                <span className="mode-icon" aria-hidden="true">{MODES[m].icon}</span>
                <strong>{MODES[m].label}</strong>
                <span>{MODES[m].blurb}</span>
                {m === nextMode && <em className="tag">Start here</em>}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ---------- Finished ---------- */
  if (finished) {
    const done = progress.lessons[lesson.id] || {};
    const stars = MODE_ORDER.filter((m) => done[m]).length;
    const nextMode =
      MODE_ORDER.slice(MODE_ORDER.indexOf(mode) + 1).find((m) => !done[m]) || MODE_ORDER.find((m) => !done[m]);
    const li = lessons.findIndex((l) => l.id === lesson.id);
    const nextLesson = lessons[li + 1];
    return (
      <section className="screen">
        <div className="card finish">
          <div className="finish-stars" aria-label={`${stars} of 3 stars`}>
            {MODE_ORDER.map((m) => (
              <span key={m} className={done[m] ? 'star on' : 'star'}>★</span>
            ))}
          </div>
          <h1>Well done!</h1>
          <p className="lead">You finished “{lesson.title}” ({MODES[mode].label}).</p>
          <div className="finish-actions">
            {nextMode && (
              <button className="btn primary" onClick={() => start(nextMode)}>
                Next: {MODES[nextMode].label}
              </button>
            )}
            {!nextMode && nextLesson && (
              <button className="btn primary" onClick={() => onOpenLesson(nextLesson.id)}>
                Next lesson: {nextLesson.title}
              </button>
            )}
            <button className="btn" onClick={() => start(mode)}>
              Do this one again
            </button>
            <button className="btn ghost" onClick={onExit}>
              All lessons
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ---------- Playing ---------- */
  const showRing = step && step.action !== 'key' && (mode === 'watch' || mode === 'guided' || (mode === 'try' && hint));
  return (
    <section className="screen player">
      <div className="player-top">
        <button className="btn ghost" onClick={() => { stopSpeaking(); onExit(); }}>
          ← All lessons
        </button>
        <div className="player-title">{lesson.title}</div>
        <div className="pill">
          {MODES[mode].label} · Step {idx + 1} of {steps.length}
        </div>
      </div>
      <div className="bar" aria-hidden="true">
        <div style={{ width: `${(idx / steps.length) * 100}%` }} />
      </div>

      <div className="instruction" role="status" aria-live="polite">
        <div className="instr-main">
          <div className="instr-text">{step.say}</div>
          {canSpeak() && (
            <button className="btn speak" onClick={() => speak(step.say)} aria-label="Read this step aloud">
              🔊 Read to me
            </button>
          )}
        </div>
        {step.detail && <div className="instr-detail">{step.detail}</div>}
        {mode === 'try' && hint && step.hint && <div className="instr-detail hintline">Hint: {step.hint}</div>}
        {step.action === 'key' && (
          <Keycaps
            combo={step.combo}
            forceLit={mode === 'watch' && lit}
            onPressForMe={mode !== 'watch' ? () => simRef.current?.perform('key', step.combo) : null}
          />
        )}
        {nudge && <div className="nudge">{nudge}</div>}
      </div>

      <div className="stage-wrap" ref={wrapRef} style={{ height: STAGE_H * scale }}>
        <div className="stage-scaler" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
          <Desktop
            key={runId}
            ref={simRef}
            setup={lesson.setup}
            version={config.windowsVersion}
            onAction={onAction}
            guard={mode === 'guided' ? guard : undefined}
            onBlocked={onBlocked}
          />
        </div>
        <Overlay
          wrapRef={wrapRef}
          target={showRing ? step.target : null}
          showRing={showRing}
          cursorTarget={cursorTarget}
          showCursor={mode === 'watch'}
          pulse={pulse}
        />
      </div>

      <div className="controls">
        {mode === 'watch' && (
          <button className="btn primary" onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ Play' : '⏸ Pause'}
          </button>
        )}
        {mode === 'guided' && (
          <button className="btn" onClick={doItForMe}>
            Do this step for me
          </button>
        )}
        {mode === 'try' && (
          <button className="btn" onClick={() => setHint(true)}>
            Show me a hint
          </button>
        )}
        <button className="btn ghost" onClick={() => start(mode)}>
          Start over
        </button>
        <button className="btn ghost" onClick={() => { stopSpeaking(); setMode(null); }}>
          Change how I learn
        </button>
      </div>
    </section>
  );
}
