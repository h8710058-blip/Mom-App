import { useState } from 'react';

function Visual({ kind }) {
  switch (kind) {
    case 'welcome':
      return (
        <svg className="wt-visual" viewBox="0 0 320 200" role="img" aria-label="A computer screen with a mouse pointer">
          <rect x="40" y="16" width="240" height="140" rx="14" fill="#1F2933" />
          <rect x="52" y="28" width="216" height="116" rx="6" fill="#1D5FD1" />
          <rect x="52" y="124" width="216" height="20" fill="#E6EEFB" />
          <rect x="148" y="128" width="12" height="12" rx="2" fill="#1D5FD1" />
          <rect x="140" y="156" width="40" height="14" fill="#52606D" />
          <rect x="112" y="170" width="96" height="10" rx="5" fill="#52606D" />
          <path d="M190 70l36 26-16 3 10 18-9 5-10-18-12 12z" fill="#fff" stroke="#1F2933" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      );
    case 'nextback':
      return (
        <div className="wt-visual wt-buttons">
          <span className="btn ghost">← Back</span>
          <span className="btn primary">Next →</span>
        </div>
      );
    case 'ring':
      return (
        <div className="wt-visual wt-ring-demo">
          <div className="wt-target">
            <span className="wt-ring" />
            <span className="wt-fake-btn">Start</span>
          </div>
        </div>
      );
    case 'modes':
      return (
        <div className="wt-visual wt-modes">
          <div><span>👀</span>Watch me</div>
          <div><span>👆</span>Do it with me</div>
          <div><span>⭐</span>Try it yourself</div>
        </div>
      );
    default:
      return (
        <div className="wt-visual wt-stars">
          <span className="star on">★</span>
          <span className="star on">★</span>
          <span className="star on">★</span>
        </div>
      );
  }
}

const PAGES = [
  {
    kind: 'welcome',
    title: 'Welcome to Mom App',
    body: 'This app teaches you the basics of Windows: opening programs, saving files, downloading and using shortcuts. Everything happens on a practice computer, so nothing you do here can break anything.',
  },
  {
    kind: 'nextback',
    title: 'Moving around',
    body: 'Use the big Next and Back buttons to move through this tour. You can come back and replay it any time from the Home screen.',
  },
  {
    kind: 'ring',
    title: 'Look for the glowing ring',
    body: 'In each lesson, a glowing amber ring shows you exactly where to click. The rest of the screen goes a little darker so the right spot stands out.',
  },
  {
    kind: 'modes',
    title: 'Three ways to learn',
    body: 'Every lesson has three steps. First, Watch me: sit back and see it done. Then, Do it with me: you click while the ring guides you. Finally, Try it yourself: no ring, but a hint is always there.',
  },
  {
    kind: 'stars',
    title: 'Collect your stars',
    body: 'You earn a star each time you finish a lesson in one of the three ways. Take your time. Tap Read to me if you would like the words spoken aloud.',
  },
];

export default function Walkthrough({ onFinish }) {
  const [i, setI] = useState(0);
  const page = PAGES[i];
  const last = i === PAGES.length - 1;
  return (
    <section className="screen walkthrough">
      <div className="wt-top">
        <div className="wt-dots" aria-label={`Page ${i + 1} of ${PAGES.length}`}>
          {PAGES.map((p, n) => (
            <span key={p.kind} className={n === i ? 'dot on' : 'dot'} />
          ))}
        </div>
        <button className="btn ghost" onClick={onFinish}>
          Skip the tour
        </button>
      </div>
      <div className="card wt-card">
        <Visual kind={page.kind} />
        <h1>{page.title}</h1>
        <p className="lead">{page.body}</p>
      </div>
      <div className="wt-nav">
        <button className="btn ghost" onClick={() => setI(i - 1)} disabled={i === 0}>
          ← Back
        </button>
        {last ? (
          <button className="btn primary" onClick={onFinish}>
            Let&apos;s begin
          </button>
        ) : (
          <button className="btn primary" onClick={() => setI(i + 1)}>
            Next →
          </button>
        )}
      </div>
    </section>
  );
}
