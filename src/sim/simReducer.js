// State machine for the simulated Windows desktop.
// Every interaction is an event: { action, target, payload }.
//   action: 'click' | 'dblclick' | 'rightclick' | 'type' | 'key'
//   target: a data-target id (for 'key' it is the combo, e.g. 'ctrl+s')
// Lessons and the sim speak the same vocabulary, so Watch mode can replay events.

export const APPS = ['explorer', 'notepad', 'word', 'browser'];
export const APP_LABEL = { explorer: 'File Explorer', notepad: 'Notepad', word: 'Word', browser: 'Browser' };
export const FOLDERS = ['desktop', 'documents', 'downloads'];
export const FOLDER_LABEL = { desktop: 'Desktop', documents: 'Documents', downloads: 'Downloads' };
const EXT = { notepad: 'txt', word: 'docx' };

const blankDoc = () => ({ text: '', file: null, dirty: false, sel: null, history: [] });

export function initialState(setup = {}) {
  const apps = {};
  APPS.forEach((a) => (apps[a] = { open: false, min: false, max: false }));
  const z = [];
  (setup.open || []).forEach((a) => {
    apps[a].open = true;
    z.push(a);
  });
  const copy = (list) => (list || []).map((f) => ({ ...f }));
  const docs = { notepad: blankDoc(), word: blankDoc() };
  if (setup.notepadText) {
    docs.notepad.text = setup.notepadText;
    docs.notepad.dirty = true;
  }
  return {
    apps,
    z,
    startOpen: false,
    ctx: null,
    selectedIcon: null,
    menu: null,
    dialog: null,
    files: {
      desktop: copy(setup.files?.desktop),
      documents: copy(setup.files?.documents),
      downloads: copy(setup.files?.downloads),
    },
    docs,
    explorer: { folder: setup.explorerFolder || 'documents', selected: null },
    browser: { downloadBar: false },
    clipboard: '',
    toast: null,
  };
}

export function topApp(s) {
  for (let i = s.z.length - 1; i >= 0; i--) {
    const a = s.z[i];
    if (s.apps[a].open && !s.apps[a].min) return a;
  }
  return null;
}

function bringTop(s, app) {
  s.z = s.z.filter((a) => a !== app);
  s.z.push(app);
  s.apps[app].min = false;
}

function openApp(s, app) {
  s.apps[app].open = true;
  bringTop(s, app);
  s.startOpen = false;
  s.ctx = null;
}

function closeApp(s, app) {
  s.apps[app] = { open: false, min: false, max: false };
  s.z = s.z.filter((a) => a !== app);
  if (EXT[app]) s.docs[app] = blankDoc();
  if (app === 'browser') s.browser.downloadBar = false;
}

function doSave(s, app, rawName, folder) {
  const ext = EXT[app];
  let base = rawName.replace(/[\\/:*?"<>|]/g, '').trim();
  if (!base) return false;
  if (!base.toLowerCase().endsWith('.' + ext)) base += '.' + ext;
  const d = s.docs[app];
  const list = s.files[folder];
  const file = { name: base, kind: ext, content: d.text };
  const i = list.findIndex((f) => f.name === base);
  if (i >= 0) list[i] = file;
  else list.push(file);
  d.file = { name: base, folder };
  d.dirty = false;
  return true;
}

function startSave(s, app, forceAs = false) {
  const d = s.docs[app];
  s.menu = null;
  if (d.file && !forceAs) {
    doSave(s, app, d.file.name, d.file.folder);
    return;
  }
  s.dialog = {
    type: 'saveas',
    app,
    name: d.file ? d.file.name.replace(/\.[^.]+$/, '') : '',
    folder: d.file?.folder || 'documents',
    error: null,
    closeAfter: false,
  };
}

function requestClose(s, app) {
  if (EXT[app] && s.docs[app].dirty) s.dialog = { type: 'savechanges', app };
  else closeApp(s, app);
}

function openFile(s, file, folder) {
  if (file.kind === 'txt' || file.kind === 'docx') {
    const app = file.kind === 'txt' ? 'notepad' : 'word';
    s.docs[app] = { text: file.content || '', file: { name: file.name, folder }, dirty: false, sel: null, history: [] };
    openApp(s, app);
  } else {
    s.toast = `${file.name} is a PDF. On a real computer it would open in your browser.`;
  }
}

function keyCombo(s, combo) {
  if (combo === 'alt+tab') {
    const visible = s.z.filter((a) => s.apps[a].open && !s.apps[a].min);
    if (visible.length >= 2) bringTop(s, visible[visible.length - 2]);
    return;
  }
  const app = topApp(s);
  if (!app || !EXT[app] || s.dialog) return;
  const d = s.docs[app];
  switch (combo) {
    case 'ctrl+a':
      d.sel = 'all';
      break;
    case 'ctrl+c':
      if (d.sel === 'all') s.clipboard = d.text;
      break;
    case 'ctrl+v':
      if (s.clipboard) {
        d.history.push(d.text);
        d.text = d.text + (d.text && !d.text.endsWith('\n') ? '\n' : '') + s.clipboard;
        d.dirty = true;
        d.sel = null;
      }
      break;
    case 'ctrl+z':
      if (d.history.length) {
        d.text = d.history.pop();
        d.dirty = true;
        d.sel = null;
      }
      break;
    case 'ctrl+s':
      startSave(s, app);
      break;
    default:
  }
}

function handleClick(s, target) {
  if (target === 'start-button') {
    s.startOpen = !s.startOpen;
    s.ctx = null;
    s.menu = null;
    return;
  }
  if (target.startsWith('start-app-')) return openApp(s, target.slice('start-app-'.length));
  if (target.startsWith('ctx-')) {
    s.ctx = null;
    return;
  }
  if (target.startsWith('icon-') || target.startsWith('deskfile-')) {
    s.selectedIcon = target;
    return;
  }
  const win = /^(explorer|notepad|word|browser)-(close|minimize|maximize)$/.exec(target);
  if (win) {
    const [, app, what] = win;
    if (what === 'close') requestClose(s, app);
    else if (what === 'minimize') s.apps[app].min = true;
    else {
      s.apps[app].max = !s.apps[app].max;
      bringTop(s, app);
    }
    return;
  }
  if (target.startsWith('taskbar-')) {
    const app = target.slice('taskbar-'.length);
    const a = s.apps[app];
    s.startOpen = false;
    if (!a?.open) return;
    if (a.min) bringTop(s, app);
    else if (topApp(s) === app) a.min = true;
    else bringTop(s, app);
    return;
  }
  if (target === 'notepad-menu-file' || target === 'word-menu-file') {
    const app = target.split('-')[0];
    s.menu = s.menu === app ? null : app;
    return;
  }
  if (target === 'menu-save' || target === 'menu-saveas') {
    const app = s.menu;
    if (app) startSave(s, app, target === 'menu-saveas');
    return;
  }
  if (target.startsWith('saveas-nav-') && s.dialog?.type === 'saveas') {
    s.dialog.folder = target.slice('saveas-nav-'.length);
    return;
  }
  if (target === 'saveas-save-btn' && s.dialog?.type === 'saveas') {
    const { app, name, folder, closeAfter } = s.dialog;
    if (!name.trim()) {
      s.dialog.error = 'Type a file name first.';
      return;
    }
    doSave(s, app, name, folder);
    s.dialog = null;
    if (closeAfter) closeApp(s, app);
    return;
  }
  if (target === 'saveas-cancel-btn') {
    s.dialog = null;
    return;
  }
  if (target.startsWith('savechanges-') && s.dialog?.type === 'savechanges') {
    const app = s.dialog.app;
    if (target === 'savechanges-cancel') s.dialog = null;
    else if (target === 'savechanges-dontsave') {
      s.dialog = null;
      closeApp(s, app);
    } else if (target === 'savechanges-save') {
      const d = s.docs[app];
      if (d.file) {
        doSave(s, app, d.file.name, d.file.folder);
        s.dialog = null;
        closeApp(s, app);
      } else {
        s.dialog = { type: 'saveas', app, name: '', folder: 'documents', error: null, closeAfter: true };
      }
    }
    return;
  }
  if (target.startsWith('explorer-nav-')) {
    s.explorer = { folder: target.slice('explorer-nav-'.length), selected: null };
    return;
  }
  if (target.startsWith('file-')) {
    s.explorer.selected = target.slice('file-'.length);
    return;
  }
  if (target === 'browser-download-btn') {
    s.browser.downloadBar = true;
    if (!s.files.downloads.some((f) => f.name === 'recipe.pdf')) {
      s.files.downloads.push({ name: 'recipe.pdf', kind: 'pdf', content: '' });
    }
    return;
  }
  if (target === 'download-show-folder') {
    s.browser.downloadBar = false;
    s.explorer = { folder: 'downloads', selected: 'recipe.pdf' };
    openApp(s, 'explorer');
    return;
  }
  if (target === 'download-close') s.browser.downloadBar = false;
}

function handleDouble(s, target) {
  if (target === 'icon-documents') {
    s.explorer = { folder: 'documents', selected: null };
    openApp(s, 'explorer');
  } else if (target === 'icon-recycle') {
    s.toast = 'The Recycle Bin is empty.';
  } else if (target.startsWith('deskfile-')) {
    const f = s.files.desktop.find((x) => x.name === target.slice('deskfile-'.length));
    if (f) openFile(s, f, 'desktop');
  } else if (target.startsWith('file-')) {
    const name = target.slice('file-'.length);
    const f = s.files[s.explorer.folder].find((x) => x.name === name);
    if (f) openFile(s, f, s.explorer.folder);
  }
}

export function reduce(prev, ev) {
  const s = structuredClone(prev);
  const { action, target = '', payload = {} } = ev;
  switch (action) {
    case 'dismiss':
      s.startOpen = false;
      s.ctx = null;
      s.menu = null;
      break;
    case 'deselect':
      s.selectedIcon = null;
      break;
    case 'focus':
      if (s.apps[target]?.open) bringTop(s, target);
      break;
    case 'clearToast':
      s.toast = null;
      break;
    case 'key':
      keyCombo(s, target);
      break;
    case 'type':
      if (target === 'notepad-text' || target === 'word-text') {
        const d = s.docs[target.split('-')[0]];
        d.text = payload.value ?? '';
        d.dirty = true;
        d.sel = null;
      } else if (target === 'filename-input' && s.dialog?.type === 'saveas') {
        s.dialog.name = payload.value ?? '';
        s.dialog.error = null;
      }
      break;
    case 'rightclick':
      if (target === 'desktop-area') {
        s.ctx = { x: payload.x ?? 560, y: payload.y ?? 300 };
        s.startOpen = false;
        s.menu = null;
      }
      break;
    case 'dblclick':
      handleDouble(s, target);
      break;
    case 'click':
      handleClick(s, target);
      break;
    default:
  }
  return s;
}
