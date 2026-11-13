import l14 from './14-three-windows.json';
import l13 from './13-recycle-bin.json';
import l12 from './12-save-on-close.json';
import l11 from './11-edit-saved-note.json';
import l10 from './10-desktop-note.json';
import l9 from './09-save-copy.json';
import l1 from './01-mouse-basics.json';
import l2 from './02-start-notepad.json';
import l3 from './03-save-file.json';
import l4 from './04-word-doc.json';
import l5 from './05-find-file.json';
import l6 from './06-download.json';
import l7 from './07-shortcuts.json';
import l8 from './08-windows.json';

export const lessons = [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14];

// A step may carry `overrides: { "10": { ... } }` to change fields for another Windows version.
export function resolveSteps(lesson, version) {
  return lesson.steps.map((st) => ({ ...st, ...(st.overrides?.[version] || {}) }));
}
