import l1 from './01-mouse-basics.json';
import l2 from './02-start-notepad.json';
import l3 from './03-save-file.json';
import l4 from './04-word-doc.json';
import l5 from './05-find-file.json';
import l6 from './06-download.json';
import l7 from './07-shortcuts.json';
import l8 from './08-windows.json';

export const lessons = [l1, l2, l3, l4, l5, l6, l7, l8];

// A step may carry `overrides: { "10": { ... } }` to change fields for another Windows version.
export function resolveSteps(lesson, version) {
  return lesson.steps.map((st) => ({ ...st, ...(st.overrides?.[version] || {}) }));
}
