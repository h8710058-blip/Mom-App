import React, { createRef } from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Desktop from '../src/sim/Desktop.jsx';
import { lessons, resolveSteps } from '../src/lessons/index.js';
import { topApp } from '../src/sim/simReducer.js';

export function replay(container, st) {
  if(st.action==='key') {
    const [mod,key]=st.combo.split('+');
    fireEvent.keyDown(window,{key: key==='tab'?'Tab':key,ctrlKey:mod==='ctrl',altKey:mod==='alt'});
    return;
  }
  const el=[...container.querySelectorAll('[data-target]')].find(el=>el.dataset.target===st.target);
  expect(el,st.target).toBeTruthy();
  expect(el.closest('.sim-win')?.style.display).not.toBe('none');
  if(st.action==='type') fireEvent.change(el,{target:{value:st.text}});
  else if(st.action==='dblclick') { fireEvent.click(el); fireEvent.click(el); fireEvent.doubleClick(el); }
  else fireEvent[st.action==='rightclick'?'contextMenu':'click'](el);
}
function check(st,before,s) {
  const target=st.target;
  if(st.action==='type') expect(target==='filename-input'?s.dialog.name:s.docs[target.split('-')[0]].text).toBe(st.text);
  if(st.action==='rightclick') expect(s.ctx).toBeTruthy();
  if(st.action==='key') {
    const app=topApp(before), doc=before.docs[app];
    if(st.combo==='ctrl+a') expect(s.docs[app].sel).toBe('all');
    if(st.combo==='ctrl+c') expect(s.clipboard).toBe(doc.text);
    if(st.combo==='ctrl+v') expect(s.docs[app].text).toBe(doc.text+'\n'+before.clipboard);
    if(st.combo==='ctrl+z') expect(s.docs[app].text).toBe(doc.history.at(-1));
    if(st.combo==='ctrl+s') { if(!doc.file) expect(s.dialog.type).toBe('saveas'); else expect(s.files[doc.file.folder].find(f=>f.name===doc.file.name).content).toBe(doc.text); }
    if(st.combo==='alt+tab') expect(topApp(s)).toBe(before.z.filter(a=>before.apps[a].open&&!before.apps[a].min).at(-2));
  }
  if(st.action==='dblclick') {
    if(target==='icon-recycle') expect(s.toast).toBe('The Recycle Bin is empty.');
    else if(target==='icon-documents') expect(s.apps.explorer.open).toBe(true);
    else { const name=target.replace(/^(deskfile|file)-/,''); const folder=target.startsWith('deskfile-')?'desktop':before.explorer.folder; const f=before.files[folder].find(f=>f.name===name); expect(s.docs[f.kind==='docx'?'word':'notepad'].text).toBe(f.content); }
  }
  if(st.action==='click') {
    if(target==='start-button') expect(s.startOpen).toBe(!before.startOpen);
    if(target.startsWith('start-app-')) expect(s.apps[target.slice(10)].open).toBe(true);
    if(target.startsWith('ctx-')) expect(s.ctx).toBeNull();
    if(target.startsWith('icon-')) expect(s.selectedIcon).toBe(target);
    if(target.startsWith('file-')) expect(s.explorer.selected).toBe(target.slice(5));
    if(target.startsWith('explorer-nav-')) expect(s.explorer.folder).toBe(target.slice(13));
    if(target.startsWith('saveas-nav-')) expect(s.dialog.folder).toBe(target.slice(11));
    if(target.endsWith('-menu-file')) expect(s.menu).toBe(target.split('-')[0]);
    if(['menu-save','menu-saveas'].includes(target)) expect(s.dialog.type).toBe('saveas');
    if(target==='saveas-save-btn') { const dlg=before.dialog; expect(s.dialog).toBeNull(); expect(s.files[dlg.folder].find(f=>f.name.startsWith(dlg.name)).content).toBe(before.docs[dlg.app].text); if(dlg.closeAfter) expect(s.apps[dlg.app].open).toBe(false); }
    if(target==='saveas-cancel-btn') expect(s.dialog).toBeNull();
    if(target==='savechanges-save') expect(s.dialog.closeAfter).toBe(true);
    if(target==='savechanges-dontsave') expect(s.apps[before.dialog.app].open).toBe(false);
    const win=/^(notepad|word|explorer|browser)-(close|minimize|maximize)$/.exec(target);
    if(win) { const [,app,op]=win; if(op==='close') { if(before.docs[app]?.dirty) expect(s.dialog.type).toBe('savechanges'); else expect(s.apps[app].open).toBe(false); } else if(op==='minimize') expect(s.apps[app].min).toBe(true); else expect(s.apps[app].max).toBe(!before.apps[app].max); }
    if(target.startsWith('taskbar-')) expect(topApp(s)).toBe(target.slice(8));
    if(target==='browser-download-btn') { expect(s.browser.downloadBar).toBe(true); expect(s.files.downloads[0].name).toBe('recipe.pdf'); }
    if(target==='download-show-folder') { expect(s.explorer.folder).toBe('downloads'); expect(s.explorer.selected).toBe('recipe.pdf'); }
  }
}
describe.each(['11','10'])('all lessons in Windows %s',version=>{
  it.each(lessons)('$id replays real DOM events',lesson=>{
    const ref=createRef(); const {container}=render(<Desktop ref={ref} setup={lesson.setup} version={version}/>);
    for(const st of resolveSteps(lesson,version)) { const before=ref.current.getState(); replay(container,st); check(st,before,ref.current.getState()); }
  });
});
