import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const apps = ['explorer', 'notepad', 'word', 'browser'];
const folders = ['desktop', 'documents', 'downloads'];
const actions = ['click', 'dblclick', 'rightclick', 'type', 'key'];
const combos = ['ctrl+a', 'ctrl+c', 'ctrl+v', 'ctrl+z', 'ctrl+s', 'alt+tab'];
const fixed = ['desktop-area', 'icon-documents', 'icon-recycle', 'start-button', 'notepad-text', 'word-text', 'notepad-menu-file', 'word-menu-file', 'menu-save', 'menu-saveas', 'filename-input', 'saveas-save-btn', 'saveas-cancel-btn', 'savechanges-save', 'savechanges-dontsave', 'savechanges-cancel', 'browser-download-btn', 'download-show-folder', 'download-close', ...['view','sort-by','refresh','new','display-settings'].map(x=>`ctx-${x}`), ...apps.flatMap(a=>[`start-app-${a}`, `taskbar-${a}`, ...['close','minimize','maximize'].map(x=>`${a}-${x}`)]), ...folders.flatMap(f=>[`explorer-nav-${f}`,`saveas-nav-${f}`])];
export function validateLessons(lessons) {
  const errors = [];
  const ids = new Set();
  for (const l of lessons) {
    const fail = msg => errors.push(`${l.id}: ${msg}`);
    if(ids.has(l.id)) fail('duplicate lesson id');
    ids.add(l.id);
    const setup=l.setup || {};
    if ((setup.open || []).some(a=>!apps.includes(a))) fail('unknown setup app');
    if (setup.explorerFolder && !folders.includes(setup.explorerFolder)) fail('unknown setup folder');
    if (Object.keys(setup.files || {}).some(f=>!folders.includes(f))) fail('unknown files folder');
    const names = new Set(['recipe.pdf', ...Object.values(setup.files || {}).flat().map(f=>f.name)]);
    for(const st of l.steps) if(st.action==='type' && st.target==='filename-input' && typeof st.text==='string') {
      for(const ext of ['txt','docx']) names.add(st.text.toLowerCase().endsWith('.'+ext)?st.text:st.text+'.'+ext);
    }
    const targets = new Set([...fixed,...[...names].flatMap(n=>[`file-${n}`,`deskfile-${n}`])]);
    const stepIds = new Set();
    for (const original of l.steps) {
      if(stepIds.has(original.id)) fail('duplicate step id');
      stepIds.add(original.id);
      for(const st of [original,...Object.values(original.overrides || {}).map(o=>({...original,...o}))]) {
        if(!actions.includes(st.action)) fail('unknown action');
        if(st.action==='key') { if(!combos.includes(st.combo)) fail('missing or unknown combo'); }
        else if(!targets.has(st.target)) fail(`unknown target ${st.target}`);
        if(st.action==='type' && typeof st.text!=='string') fail('missing type text');
      }
    }
  }
  return errors;
}
export function readLessons() {
  return readdirSync(new URL('../src/lessons/',import.meta.url)).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(readFileSync(new URL('../src/lessons/'+f,import.meta.url),'utf8')));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const lessons=readLessons(); const errors=validateLessons(lessons);
  if(errors.length) { console.error(errors.join('\n')); process.exitCode=1; }
  else console.log(`Validated ${lessons.length} lessons.`);
}
