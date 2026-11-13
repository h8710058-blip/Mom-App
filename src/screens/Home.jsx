import { canSpeak } from '../speech.js';

const MODE_KEYS = ['watch', 'guided', 'try'];

export default function Home({ lessons, progress, settings, onOpen, onToggleRead, onReplayWalkthrough }) {
  const stars = (id) => MODE_KEYS.filter((m) => progress.lessons[id]?.[m]).length;
  const total = lessons.reduce((n, l) => n + stars(l.id), 0);
  const firstOpen = lessons.find((l) => stars(l.id) < 3) || lessons[0];
  const anyStarted = total > 0;

  return (
    <section className="screen">
      <div className="hero">
        <h1>{anyStarted ? 'Welcome back!' : 'Welcome!'}</h1>
        <p className="lead">Learn Windows one small step at a time. There is no rush, and you cannot break anything here.</p>
        <button className="btn primary big" onClick={() => onOpen(firstOpen.id)}>
          {anyStarted ? `Continue: ${firstOpen.title}` : 'Start Lesson 1'}
        </button>
        <div className="hero-score">
          {total} of {lessons.length * 3} stars collected
        </div>
      </div>

      <h2 className="section-title">All lessons</h2>
      <ol className="lesson-list">
        {lessons.map((l, i) => {
          const s = stars(l.id);
          return (
            <li key={l.id}>
              <button className="lesson-card" onClick={() => onOpen(l.id)}>
                <span className="lesson-num">{s === 3 ? '✓' : i + 1}</span>
                <span className="lesson-text">
                  <strong>{l.title}</strong>
                  <span>{l.summary}</span>
                </span>
                <span className="lesson-stars" aria-label={`${s} of 3 stars`}>
                  {MODE_KEYS.map((m) => (
                    <span key={m} className={progress.lessons[l.id]?.[m] ? 'star on' : 'star'}>★</span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="card settings">
        <h2>Settings</h2>
        {canSpeak() && (
          <label className="switch">
            <input type="checkbox" checked={settings.autoRead} onChange={onToggleRead} />
            <span>Read each step aloud automatically</span>
          </label>
        )}
        <button className="btn" onClick={onReplayWalkthrough}>
          Replay the app tour
        </button>
      </div>
    </section>
  );
}
