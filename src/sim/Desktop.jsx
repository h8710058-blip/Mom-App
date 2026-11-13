import { forwardRef, useCallback, useEffect, useImperativeHandle, useReducer, useRef, useState } from 'react';
import Icon from './icons.jsx';
import { APP_LABEL, FOLDERS, FOLDER_LABEL, initialState, reduce, topApp } from './simReducer.js';
import './sim.css';

export const STAGE_W = 1100;
export const STAGE_H = 620;
const TASKBAR_H = 48;

const GEOM = {
  explorer: { x: 60, y: 40, w: 720, h: 440 },
  notepad: { x: 360, y: 70, w: 560, h: 340 },
  word: { x: 120, y: 16, w: 800, h: 500 },
  browser: { x: 80, y: 20, w: 860, h: 500 },
};
const TASKBAR_ORDER = ['explorer', 'notepad', 'word', 'browser'];
const START_APPS = ['word', 'notepad', 'explorer', 'browser'];

/**
 * The simulated Windows desktop.
 * Props:
 *   setup    lesson setup (which apps are open, which files exist)
 *   version  "10" | "11"
 *   onAction called with { action, target, payload } for every user/auto interaction
 *   guard    optional (targetId, eventType) => boolean. false blocks the event (Guided mode)
 *   onBlocked called when guard blocks something
 * Ref: { perform(action, target, payload) } used by Watch mode and "do it for me".
 */
const Desktop = forwardRef(function Desktop({ setup, version = '11', onAction, guard, onBlocked }, ref) {
  const [s, dispatch] = useReducer(reduce, setup, initialState);
  const areaRef = useRef(null);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const guardRef = useRef(guard);
  guardRef.current = guard;
  const blockedRef = useRef(onBlocked);
  blockedRef.current = onBlocked;
  const [now, setNow] = useState(() => new Date());

  const act = useCallback((action, target, payload = {}) => {
    dispatch({ action, target, payload });
    onActionRef.current?.({ action, target, payload });
  }, []);
  const focus = useCallback((app) => dispatch({ action: 'focus', target: app }), []);

  useImperativeHandle(ref, () => ({ perform: (action, target, payload) => act(action, target, payload) }), [act]);

  // Global keyboard shortcuts (Ctrl+A/C/V/Z/S, Alt+Tab). Real Alt+Tab is usually
  // grabbed by the operating system, so the lesson also offers a "press it for me" button.
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'z', 's'].includes(k)) {
        if (e.target?.tagName === 'INPUT') {
          if (k === 's') e.preventDefault();
          return;
        }
        e.preventDefault();
        act('key', 'ctrl+' + k);
      } else if (e.altKey && k === 'tab') {
        e.preventDefault();
        act('key', 'alt+tab');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!s.toast) return undefined;
    const t = setTimeout(() => dispatch({ action: 'clearToast' }), 3500);
    return () => clearTimeout(t);
  }, [s.toast]);

  // Guided mode: block any interaction that is not the highlighted target.
  const capture = (e) => {
    const g = guardRef.current;
    if (!g) return;
    const id = e.target.closest?.('[data-target]')?.getAttribute('data-target') ?? null;
    if (!g(id, e.type)) {
      e.stopPropagation();
      e.preventDefault();
      blockedRef.current?.(id);
    }
  };

  const onRootClick = (e) => {
    if (!e.target.closest('[data-keep]')) dispatch({ action: 'dismiss' });
  };

  const onDesktopContext = (e) => {
    e.preventDefault();
    const r = areaRef.current.getBoundingClientRect();
    const scale = r.width / areaRef.current.offsetWidth || 1;
    act('rightclick', 'desktop-area', { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale });
  };

  const top = topApp(s);
  const deskIcons = [
    { id: 'icon-documents', label: 'Documents', icon: 'folder' },
    { id: 'icon-recycle', label: 'Recycle Bin', icon: 'recycle' },
    ...s.files.desktop.map((f) => ({ id: `deskfile-${f.name}`, label: f.name, icon: f.kind })),
  ];

  return (
    <div
      className="sim"
      data-win={version}
      onClickCapture={capture}
      onDoubleClickCapture={capture}
      onContextMenuCapture={capture}
      onClick={onRootClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Wallpaper: right-click target */}
      <div
        className="sim-wallpaper"
        ref={areaRef}
        data-target="desktop-area"
        onContextMenu={onDesktopContext}
        onClick={() => dispatch({ action: 'deselect' })}
      >
        <div className="sim-spot" data-spot="desktop-area" />
      </div>

      {deskIcons.map((ic, i) => (
        <div
          key={ic.id}
          data-keep
          data-target={ic.id}
          className={`sim-icon ${s.selectedIcon === ic.id ? 'selected' : ''}`}
          style={{ left: 14, top: 14 + i * 92 }}
          onClick={() => act('click', ic.id)}
          onDoubleClick={() => act('dblclick', ic.id)}
        >
          <Icon name={ic.icon} size={44} />
          <span>{ic.label}</span>
        </div>
      ))}

      {/* App windows */}
      <Win app="explorer" s={s} act={act} focus={focus} title="File Explorer" icon="explorer">
        <ExplorerBody s={s} act={act} />
      </Win>
      <Win
        app="notepad"
        s={s}
        act={act}
        focus={focus}
        icon="notepad"
        title={`${s.docs.notepad.file?.name || 'Untitled'}${s.docs.notepad.dirty ? '*' : ''} - Notepad`}
      >
        <NotepadBody s={s} act={act} />
      </Win>
      <Win
        app="word"
        s={s}
        act={act}
        focus={focus}
        icon="word"
        title={`${s.docs.word.file?.name || 'Document1'} - Word`}
      >
        <WordBody s={s} act={act} />
      </Win>
      <Win app="browser" s={s} act={act} focus={focus} title="Recipe Collection - Browser" icon="browser">
        <BrowserBody s={s} act={act} />
      </Win>

      {/* Dialogs */}
      {s.dialog?.type === 'saveas' && <SaveAsDialog dlg={s.dialog} s={s} act={act} />}
      {s.dialog?.type === 'savechanges' && <SaveChangesDialog dlg={s.dialog} s={s} act={act} />}

      {/* Context menu */}
      {s.ctx && (
        <div
          className="sim-ctx"
          data-keep
          style={{ left: Math.min(s.ctx.x, STAGE_W - 220), top: Math.min(s.ctx.y, STAGE_H - TASKBAR_H - 210) }}
        >
          {['View', 'Sort by', 'Refresh', 'New', 'Display settings'].map((label) => (
            <div
              key={label}
              className="sim-ctx-item"
              data-target={`ctx-${label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => act('click', `ctx-${label.toLowerCase().replace(/\s+/g, '-')}`)}
            >
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Start menu */}
      {s.startOpen && (
        <div className="sim-start" data-keep>
          <div className="sim-start-search">Type here to search</div>
          <div className="sim-start-h">Pinned</div>
          <div className="sim-start-grid">
            {START_APPS.map((a) => (
              <div
                key={a}
                className="sim-start-app"
                data-target={`start-app-${a}`}
                onClick={() => act('click', `start-app-${a}`)}
              >
                <Icon name={a} size={36} />
                <span>{APP_LABEL[a]}</span>
              </div>
            ))}
          </div>
          <div className="sim-start-h">Recommended</div>
          <div className="sim-start-rec">Files you open will appear here.</div>
        </div>
      )}

      {/* Taskbar */}
      <div className="sim-taskbar" data-keep>
        <div className="sim-tb-center">
          <div
            className={`sim-tb-btn ${s.startOpen ? 'active' : ''}`}
            data-keep
            data-target="start-button"
            onClick={() => act('click', 'start-button')}
            title="Start"
          >
            <Icon name="start" size={26} />
          </div>
          {TASKBAR_ORDER.filter((a) => s.apps[a].open).map((a) => (
            <div
              key={a}
              className={`sim-tb-btn app ${top === a ? 'active' : ''}`}
              data-target={`taskbar-${a}`}
              onClick={() => act('click', `taskbar-${a}`)}
              title={APP_LABEL[a]}
            >
              <Icon name={a} size={26} />
              <i className="sim-tb-dot" />
            </div>
          ))}
        </div>
        <div className="sim-tb-clock">
          <div>{now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}</div>
          <div>{now.toLocaleDateString('en-AU')}</div>
        </div>
      </div>

      {s.toast && <div className="sim-toast">{s.toast}</div>}
    </div>
  );
});

export default Desktop;

/* ---------- Window frame ---------- */
function Win({ app, s, act, focus, title, icon, children }) {
  const a = s.apps[app];
  if (!a.open) return null;
  const g = GEOM[app];
  const box = a.max
    ? { left: 0, top: 0, width: STAGE_W, height: STAGE_H - TASKBAR_H }
    : { left: g.x, top: g.y, width: g.w, height: g.h };
  const zi = 10 + s.z.indexOf(app);
  const ctl = (what, label, glyph) => (
    <button
      className={`sim-ctl ${what}`}
      data-target={`${app}-${what}`}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        act('click', `${app}-${what}`);
      }}
    >
      {glyph}
    </button>
  );
  return (
    <div
      className={`sim-win ${topApp(s) === app ? 'active' : ''} ${a.max ? 'max' : ''}`}
      style={{ ...box, zIndex: zi, display: a.min ? 'none' : 'flex' }}
      onClick={() => focus(app)}
    >
      <div className="sim-titlebar">
        <Icon name={icon} size={16} />
        <span className="sim-title">{title}</span>
        <div className="sim-ctls">
          {ctl('minimize', 'Minimise', <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" /></svg>)}
          {ctl(
            'maximize',
            a.max ? 'Restore down' : 'Maximise',
            a.max ? (
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2.5 2.5h7v7h-7zM0.5 7.5v-7h7" fill="none" stroke="currentColor" /></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" /></svg>
            )
          )}
          {ctl('close', 'Close', <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" /></svg>)}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------- File Explorer ---------- */
function ExplorerBody({ s, act }) {
  const folder = s.explorer.folder;
  const files = s.files[folder];
  return (
    <div className="sim-explorer">
      <div className="sim-exp-bar">
        <span className="sim-exp-arrows">← → ↑</span>
        <div className="sim-exp-addr">This PC &nbsp;›&nbsp; {FOLDER_LABEL[folder]}</div>
      </div>
      <div className="sim-exp-main">
        <div className="sim-exp-nav">
          {FOLDERS.map((f) => (
            <div
              key={f}
              className={`sim-nav-item ${folder === f ? 'selected' : ''}`}
              data-target={`explorer-nav-${f}`}
              onClick={() => act('click', `explorer-nav-${f}`)}
            >
              <Icon name="folder" size={20} /> {FOLDER_LABEL[f]}
            </div>
          ))}
        </div>
        <div className="sim-exp-files">
          {files.length === 0 && <div className="sim-empty">This folder is empty.</div>}
          {files.map((f) => (
            <div
              key={f.name}
              className={`sim-file ${s.explorer.selected === f.name ? 'selected' : ''}`}
              data-target={`file-${f.name}`}
              onClick={() => act('click', `file-${f.name}`)}
              onDoubleClick={() => act('dblclick', `file-${f.name}`)}
            >
              <Icon name={f.kind} size={44} />
              <span>{f.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="sim-status">{files.length} item{files.length === 1 ? '' : 's'}</div>
    </div>
  );
}

/* ---------- Shared text editor bits ---------- */
function useSelectAll(ref, sel) {
  useEffect(() => {
    if (sel === 'all' && ref.current) {
      ref.current.focus({ preventScroll: true });
      ref.current.select();
    }
  }, [sel, ref]);
}

function FileMenu({ app, s, act, items }) {
  if (s.menu !== app) return null;
  return (
    <div className="sim-menu" data-keep>
      {items.map((it) =>
        it.target ? (
          <div key={it.label} className="sim-menu-item" data-target={it.target} onClick={() => act('click', it.target)}>
            <span>{it.label}</span>
            <em>{it.keys}</em>
          </div>
        ) : (
          <div key={it.label} className="sim-menu-item disabled">
            <span>{it.label}</span>
            <em>{it.keys}</em>
          </div>
        )
      )}
    </div>
  );
}

/* ---------- Notepad ---------- */
function NotepadBody({ s, act }) {
  const d = s.docs.notepad;
  const ref = useRef(null);
  useSelectAll(ref, d.sel);
  return (
    <div className="sim-notepad">
      <div className="sim-menubar">
        <span
          className={`sim-mb-item ${s.menu === 'notepad' ? 'open' : ''}`}
          data-keep
          data-target="notepad-menu-file"
          onClick={() => act('click', 'notepad-menu-file')}
        >
          File
        </span>
        <span className="sim-mb-item dim">Edit</span>
        <span className="sim-mb-item dim">View</span>
        <FileMenu
          app="notepad"
          s={s}
          act={act}
          items={[
            { label: 'New', keys: 'Ctrl+N' },
            { label: 'Open...', keys: 'Ctrl+O' },
            { label: 'Save', keys: 'Ctrl+S', target: 'menu-save' },
            { label: 'Save as...', keys: 'Ctrl+Shift+S', target: 'menu-saveas' },
          ]}
        />
      </div>
      <textarea
        ref={ref}
        className="sim-textarea"
        data-target="notepad-text"
        value={d.text}
        spellCheck={false}
        aria-label="Notepad text"
        onChange={(e) => act('type', 'notepad-text', { value: e.target.value })}
      />
      <div className="sim-status">Ln 1, Col 1 &nbsp;&nbsp; 100% &nbsp;&nbsp; Windows (CRLF) &nbsp;&nbsp; UTF-8</div>
    </div>
  );
}

/* ---------- Word ---------- */
function WordBody({ s, act }) {
  const d = s.docs.word;
  const ref = useRef(null);
  useSelectAll(ref, d.sel);
  return (
    <div className="sim-word">
      <div className="sim-word-tabs">
        <span
          className={`sim-wtab file ${s.menu === 'word' ? 'open' : ''}`}
          data-keep
          data-target="word-menu-file"
          onClick={() => act('click', 'word-menu-file')}
        >
          File
        </span>
        {['Home', 'Insert', 'Design', 'Layout', 'View'].map((t) => (
          <span key={t} className={`sim-wtab ${t === 'Home' ? 'on' : 'dim'}`}>
            {t}
          </span>
        ))}
        <FileMenu
          app="word"
          s={s}
          act={act}
          items={[
            { label: 'New', keys: 'Ctrl+N' },
            { label: 'Open', keys: 'Ctrl+O' },
            { label: 'Save', keys: 'Ctrl+S', target: 'menu-save' },
            { label: 'Save As', keys: 'F12', target: 'menu-saveas' },
          ]}
        />
      </div>
      <div className="sim-ribbon">
        <div className="sim-rb-group"><b>Paste</b><small>Clipboard</small></div>
        <div className="sim-rb-group"><span className="sim-rb-font">Calibri ▾</span><span className="sim-rb-font">11 ▾</span><b>B</b><i>I</i><u>U</u><small>Font</small></div>
        <div className="sim-rb-group"><span>≡ ≡ ≡ ≡</span><small>Paragraph</small></div>
      </div>
      <div className="sim-word-canvas">
        <div className="sim-page">
          <textarea
            ref={ref}
            className="sim-textarea word"
            data-target="word-text"
            value={d.text}
            spellCheck={false}
            aria-label="Word document text"
            placeholder="Start typing here..."
            onChange={(e) => act('type', 'word-text', { value: e.target.value })}
          />
        </div>
      </div>
      <div className="sim-status">Page 1 of 1</div>
    </div>
  );
}

/* ---------- Browser (a made-up local page, no real network) ---------- */
function BrowserBody({ s, act }) {
  return (
    <div className="sim-browser">
      <div className="sim-br-bar">
        <span className="sim-exp-arrows">← → ⟳</span>
        <div className="sim-br-addr">https://example.com/recipes</div>
      </div>
      <div className="sim-br-page">
        <h2>Grandma&apos;s Recipe Collection</h2>
        <p>Here is a free recipe card you can keep on your computer.</p>
        <button className="sim-dl-btn" data-target="browser-download-btn" onClick={() => act('click', 'browser-download-btn')}>
          Download recipe.pdf
        </button>
      </div>
      {s.browser.downloadBar && (
        <div className="sim-dlbar">
          <Icon name="pdf" size={30} />
          <div className="sim-dl-info">
            <b>recipe.pdf</b>
            <small>Done</small>
          </div>
          <button className="sim-dl-link" data-target="download-show-folder" onClick={() => act('click', 'download-show-folder')}>
            Show in folder
          </button>
          <button className="sim-dl-x" aria-label="Close" data-target="download-close" onClick={() => act('click', 'download-close')}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Dialogs ---------- */
function SaveAsDialog({ dlg, s, act }) {
  const files = s.files[dlg.folder];
  const type = dlg.app === 'word' ? 'Word Document (*.docx)' : 'Text Documents (*.txt)';
  return (
    <div className="sim-modal">
      <div className="sim-dialog saveas" role="dialog" aria-label="Save As">
        <div className="sim-dlg-title">Save As</div>
        <div className="sim-dlg-addr">This PC &nbsp;›&nbsp; {FOLDER_LABEL[dlg.folder]}</div>
        <div className="sim-dlg-body">
          <div className="sim-exp-nav">
            {FOLDERS.map((f) => (
              <div
                key={f}
                className={`sim-nav-item ${dlg.folder === f ? 'selected' : ''}`}
                data-target={`saveas-nav-${f}`}
                onClick={() => act('click', `saveas-nav-${f}`)}
              >
                <Icon name="folder" size={20} /> {FOLDER_LABEL[f]}
              </div>
            ))}
          </div>
          <div className="sim-dlg-files">
            {files.length === 0 && <div className="sim-empty">No items match your search.</div>}
            {files.map((f) => (
              <div key={f.name} className="sim-dlg-file">
                <Icon name={f.kind} size={20} /> {f.name}
              </div>
            ))}
          </div>
        </div>
        <div className="sim-dlg-form">
          <label>File name:</label>
          <input
            data-target="filename-input"
            value={dlg.name}
            autoFocus
            spellCheck={false}
            aria-label="File name"
            onChange={(e) => act('type', 'filename-input', { value: e.target.value })}
          />
          <label>Save as type:</label>
          <div className="sim-fake-select">{type}</div>
        </div>
        {dlg.error && <div className="sim-dlg-error">{dlg.error}</div>}
        <div className="sim-dlg-btns">
          <button className="sim-btn primary" data-target="saveas-save-btn" onClick={() => act('click', 'saveas-save-btn')}>
            Save
          </button>
          <button className="sim-btn" data-target="saveas-cancel-btn" onClick={() => act('click', 'saveas-cancel-btn')}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveChangesDialog({ dlg, s, act }) {
  const d = s.docs[dlg.app];
  const name = d.file?.name || (dlg.app === 'word' ? 'Document1' : 'Untitled');
  return (
    <div className="sim-modal">
      <div className="sim-dialog small" role="dialog" aria-label="Save changes">
        <div className="sim-dlg-title">{APP_LABEL[dlg.app]}</div>
        <p className="sim-dlg-msg">Do you want to save changes to {name}?</p>
        <div className="sim-dlg-btns">
          <button className="sim-btn primary" data-target="savechanges-save" onClick={() => act('click', 'savechanges-save')}>
            Save
          </button>
          <button className="sim-btn" data-target="savechanges-dontsave" onClick={() => act('click', 'savechanges-dontsave')}>
            Don&apos;t Save
          </button>
          <button className="sim-btn" data-target="savechanges-cancel" onClick={() => act('click', 'savechanges-cancel')}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
