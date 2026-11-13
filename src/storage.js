const KEY = 'mom-app-v1';

const DEFAULT = {
  seenWalkthrough: false,
  lessons: {}, // { [lessonId]: { watch: true, guided: true, try: true } }
  settings: { autoRead: false },
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const data = JSON.parse(raw);
    return {
      ...DEFAULT,
      ...data,
      settings: { ...DEFAULT.settings, ...(data.settings || {}) },
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: progress simply won't persist */
  }
}
