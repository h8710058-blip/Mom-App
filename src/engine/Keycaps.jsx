import { useEffect, useState } from 'react';

const LABEL = { ctrl: 'Ctrl', alt: 'Alt', tab: 'Tab' };

// On-screen keys. They light up when the real keys are pressed (or in Watch mode).
export default function Keycaps({ combo, forceLit = false, onPressForMe }) {
  const parts = combo.split('+');
  const [down, setDown] = useState(() => new Set());

  useEffect(() => {
    const name = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'control') return 'ctrl';
      return k;
    };
    const onDown = (e) => setDown((prev) => new Set(prev).add(name(e)));
    const onUp = (e) =>
      setDown((prev) => {
        const n = new Set(prev);
        n.delete(name(e));
        return n;
      });
    const clear = () => setDown(new Set());
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', clear);
    };
  }, []);

  return (
    <div className="keys-row">
      <div className="keys" aria-label={`Keys: ${parts.map((p) => LABEL[p] || p.toUpperCase()).join(' plus ')}`}>
        {parts.map((p, i) => (
          <span key={p} className="keys-part">
            {i > 0 && <span className="keys-plus">+</span>}
            <kbd className={`key ${forceLit || down.has(p) ? 'lit' : ''}`}>{LABEL[p] || p.toUpperCase()}</kbd>
          </span>
        ))}
      </div>
      {onPressForMe && (
        <button className="btn" onClick={onPressForMe}>
          Press the keys for me
        </button>
      )}
    </div>
  );
}
