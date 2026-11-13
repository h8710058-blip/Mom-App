# Mom App: guide for AI agents (Claude, Codex, others)

A React + Vite app that teaches one person (a mum) the basics of Windows using a **simulated Windows desktop**. It must work **fully offline** with **no API calls, no credits, no image files**: every visual is HTML/CSS/inline SVG.

## Commands
- `npm install`, `npm run dev` (local), `npm run build` (must pass before every PR), `npm run preview`

## Git workflow
- `main` is the working version. Do not push to it directly.
- Claude works on `claude/*` branches; Codex works on `codex/*` branches. Merge through pull requests.
- Read this file first. Do not change the lesson JSON schema or `tokens.css` names without updating this file.

## Who owns what
| Area | Owner | Files |
| --- | --- | --- |
| App shell, walkthrough, lesson engine, layout | Claude | `src/App.jsx`, `src/screens/*`, `src/engine/*` |
| Backend/bug fixes, simulator visuals, lesson content | Codex | `src/sim/*`, `src/lessons/*` |

## Folder map
```
src/
  config.js          windowsVersion ("11" default, "10" basic variant), speech language
  tokens.css         ALL colour/spacing/type tokens (single source of truth)
  styles.css         app UI styles (not the simulated Windows)
  storage.js         localStorage progress + settings
  speech.js          browser text-to-speech (free, offline)
  lessons/           one JSON file per lesson + index.js
  sim/               simulated Windows: Desktop.jsx (UI), simReducer.js (logic), sim.css, icons.jsx
  engine/            Overlay.jsx (amber ring + cursor), Keycaps.jsx
  screens/           Walkthrough, Home, LessonPlayer (Watch / Guided / Try engine)
```

## How a lesson works
The simulator is a state machine driven by events `{ action, target, payload }`:
- `action`: `click` | `dblclick` | `rightclick` | `type` | `key`
- `target`: a `data-target` id on a DOM element. For `key` events it is the combo, e.g. `ctrl+s`.

The lesson player reads steps, spotlights the element with `data-target=<step.target>`, and advances when the matching event happens.
- **Watch**: the engine performs each step itself (animated cursor + typing).
- **Guided**: the user acts; anything except the highlighted target is blocked with a gentle nudge.
- **Try**: no ring; a Hint button reveals it.

### Lesson JSON schema (frozen)
```json
{
  "id": "save-file",
  "title": "Saving a file",
  "summary": "one line for the lesson list",
  "learn": ["bullet", "bullet", "bullet"],
  "setup": {
    "open": ["notepad"],
    "notepadText": "text already in Notepad (unsaved)",
    "explorerFolder": "desktop | documents | downloads",
    "files": { "documents": [{ "name": "a.txt", "kind": "txt|docx|pdf", "content": "..." }] }
  },
  "steps": [
    {
      "id": "unique-in-lesson",
      "action": "click | dblclick | rightclick | type | key",
      "target": "data-target id (not used for key)",
      "combo": "ctrl+s (key steps only)",
      "text": "text to type (type steps only)",
      "say": "the big instruction (short, plain words)",
      "detail": "optional smaller explanation",
      "hint": "optional text shown by the Try-mode hint",
      "overrides": { "10": { "say": "Windows 10 wording" } }
    }
  ]
}
```

### Available `data-target` ids
- Desktop: `desktop-area` (right-click), `icon-documents`, `icon-recycle`, `deskfile-<name>`, `ctx-refresh` (also `ctx-view`, `ctx-sort-by`, `ctx-new`, `ctx-display-settings`)
- Taskbar/Start: `start-button`, `start-app-{word|notepad|explorer|browser}`, `taskbar-{explorer|notepad|word|browser}`
- Windows: `{explorer|notepad|word|browser}-{close|minimize|maximize}`
- Explorer: `explorer-nav-{desktop|documents|downloads}`, `file-<file name>`
- Notepad/Word: `notepad-text`, `word-text`, `notepad-menu-file`, `word-menu-file`, `menu-save`, `menu-saveas`
- Dialogs: `filename-input`, `saveas-nav-{desktop|documents|downloads}`, `saveas-save-btn`, `saveas-cancel-btn`, `savechanges-{save|dontsave|cancel}`
- Browser: `browser-download-btn`, `download-show-folder`, `download-close`
- Key combos handled: `ctrl+a`, `ctrl+c`, `ctrl+v`, `ctrl+z`, `ctrl+s`, `alt+tab`

To add a target: add `data-target` in `Desktop.jsx`, handle the event in `simReducer.js`, list it here.

## Design rules (for an older, non-technical learner)
- Colours/spacing only from `tokens.css`. Background `#FAF7F2`, text `#1F2933`, primary `#1D5FD1`, spotlight amber `#FFB020` (never use amber inside the simulated Windows), success `#2E8B57`, gentle error `#D9622B` (never harsh red).
- Body 20px, instruction 24px, headings 32px+. Click targets at least 56px with 16px gaps. Buttons use words, not icon-only.
- One instruction per screen, plain language, no jargon without explaining it.
- Nothing may require the network. No `fetch`, no CDN fonts, no external images.

## Windows version
`config.windowsVersion` switches the simulated look (`data-win` on `.sim`). Windows 11 is complete. Windows 10 is a basic variant (left-aligned taskbar, square windows); Start menu and Explorer visuals still need a pass.
