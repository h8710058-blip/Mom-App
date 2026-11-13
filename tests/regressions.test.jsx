import React, { createRef } from 'react';
import { it, expect, vi } from 'vitest';
import { act, render, fireEvent, screen } from '@testing-library/react';
import Desktop from '../src/sim/Desktop.jsx';
import LessonPlayer from '../src/screens/LessonPlayer.jsx';
import App from '../src/App.jsx';
import { lessons } from '../src/lessons/index.js';
import { load, save } from '../src/storage.js';
import { validateLessons } from '../scripts/check-lessons.js';

const target = id => document.querySelector(`[data-target="${id}"]`);
const click = id => fireEvent.click(target(id));
const type = (id,value) => fireEvent.change(target(id),{target:{value}});
const key = (key,extra={}) => fireEvent.keyDown(window,{key,ctrlKey:true,...extra});
const tick = async ms => act(async()=>{await vi.advanceTimersByTimeAsync(ms);});
function player(lesson, mode='guided') {
  const onComplete=vi.fn();
  const view=render(<LessonPlayer lesson={lesson} lessons={lessons} progress={{lessons:{}}} settings={{autoRead:false}} onComplete={onComplete}/>);
  fireEvent.click(screen.getByText(mode==='guided'?'Do it with me':mode==='watch'?'Watch me':'Try it yourself'));
  return {...view,onComplete};
}
it('typing creates undo history and identical input does not add an undo entry',()=>{
  const ref=createRef();render(<Desktop ref={ref} setup={{open:['notepad'],notepadText:'before'}}/>);
  type('notepad-text','after');type('notepad-text','after');key('z');
  expect(target('notepad-text').value).toBe('before');expect(ref.current.getState().docs.notepad.history).toEqual([]);
});
it('invalid Save As name stays open; saving a copy preserves the original and Ctrl+S updates the copy',()=>{
  const ref=createRef();render(<Desktop ref={ref} setup={{open:['explorer'],files:{documents:[{name:'first.txt',kind:'txt',content:'original'}]}}}/>);
  fireEvent.doubleClick(target('file-first.txt'));type('notepad-text','changed');click('notepad-menu-file');click('menu-saveas');
  type('filename-input','///');click('saveas-save-btn');expect(screen.getByRole('dialog')).toBeTruthy();expect(screen.getByText(/Please use letters/)).toBeTruthy();
  type('filename-input','copy');click('saveas-save-btn');type('notepad-text','last');key('s');
  expect(ref.current.getState().files.documents).toEqual([{name:'first.txt',kind:'txt',content:'original'},{name:'copy.txt',kind:'txt',content:'last'}]);
});
it('case-insensitive save replaces the same Windows file',()=>{
  const ref=createRef();render(<Desktop ref={ref} setup={{open:['notepad'],notepadText:'new',files:{documents:[{name:'NOTE.txt',kind:'txt',content:'old'}]}}}/>);
  key('s');type('filename-input','note');click('saveas-save-btn');expect(ref.current.getState().files.documents).toEqual([{name:'note.txt',kind:'txt',content:'new'}]);
});
it('a modal blocks background closing, typing, and Alt+Tab without reporting an action',()=>{
  const ref=createRef(),onAction=vi.fn();render(<Desktop ref={ref} onAction={onAction} setup={{open:['word','notepad'],notepadText:'keep'}}/>);
  key('s');const before=ref.current.getState();onAction.mockClear();click('notepad-close');click('word-close');type('notepad-text','lost');key('Tab',{ctrlKey:false,altKey:true});
  expect(ref.current.getState()).toEqual(before);expect(onAction).not.toHaveBeenCalled();click('saveas-cancel-btn');expect(screen.queryByRole('dialog')).toBeNull();
});
it('shortcuts ignore controls outside the simulator and repeated keys',()=>{
  render(<><button>Outside</button><Desktop setup={{open:['notepad'],notepadText:'hello'}}/></>);
  fireEvent.keyDown(screen.getByText('Outside'),{key:'s',ctrlKey:true});key('s',{repeat:true});expect(screen.queryByRole('dialog')).toBeNull();
  key('s');expect(screen.getByRole('dialog')).toBeTruthy();key('a');expect(target('filename-input').value).toBe('');
});
it('Guided blocks wrong targets, wrong event kinds, typing, and keyboard shortcuts with a nudge',()=>{
  player(lessons[0]);fireEvent.doubleClick(target('icon-documents'));expect(target('explorer-close')).toBeNull();
  click('start-button');expect(target('start-app-notepad')).toBeNull();expect(screen.getByText(/Not that one/)).toBeTruthy();
});
it('Guided prevents mutation during the advance delay and never double advances',async()=>{
  vi.useFakeTimers();player(lessons[0]);click('icon-documents');click('icon-documents');click('start-button');
  await tick(600);expect(screen.getByText(/Now double-click it/)).toBeTruthy();expect(target('start-app-notepad')).toBeNull();
});
it('Guided allows only the requested shortcut and typing target',async()=>{
  vi.useFakeTimers();player({...lessons[6],steps:[lessons[6].steps[0],{id:'type',action:'type',target:'notepad-text',text:'new',say:'Type new'}]});
  type('notepad-text','wrong');key('s');expect(screen.queryByRole('dialog')).toBeNull();expect(target('notepad-text').value).toBe(lessons[6].setup.notepadText);
  key('a');await tick(600);type('notepad-text','new');await tick(900);expect(screen.getByText('Well done!')).toBeTruthy();
});
it.each(['guided','try'])('%s advances only when the complete requested text is entered',async mode=>{
  vi.useFakeTimers();const lesson={...lessons[1],setup:{open:['notepad'],notepadText:'Hello'},steps:[{id:'type',action:'type',target:'notepad-text',text:'Hello there',say:'Type Hello there'}]};
  const {onComplete}=player(lesson,mode);type('notepad-text','Hello there extra');await tick(1000);expect(onComplete).not.toHaveBeenCalled();type('notepad-text','Hello there');await tick(900);expect(onComplete).toHaveBeenCalledExactlyOnceWith(lesson.id,mode);
});
it('Start over cancels pending advance and nudge timers',async()=>{
  vi.useFakeTimers();player(lessons[0]);click('start-button');click('icon-documents');fireEvent.click(screen.getByText('Start over'));await tick(4000);
  expect(screen.getByText('Click once on the Documents folder.')).toBeTruthy();expect(target('icon-documents').className).not.toContain('selected');
});
it('unmount cancels scheduled advances and Watch delays',async()=>{
  vi.useFakeTimers();const view=player(lessons[0]);click('icon-documents');view.unmount();expect(vi.getTimerCount()).toBe(0);
  const watch=player(lessons[0],'watch');watch.unmount();expect(vi.getTimerCount()).toBe(0);
});
it('Watch pause/resume does not repeat completed clicks and restart cancels the old run',async()=>{
  vi.useFakeTimers();const lesson={...lessons[0],steps:[{id:'start',action:'click',target:'start-button',say:'Open Start'},{id:'open',action:'click',target:'start-app-notepad',say:'Open Notepad'}]};
  player(lesson,'watch');await tick(2800);expect(target('start-app-notepad')).toBeTruthy();fireEvent.click(screen.getByText(/Pause/));await tick(5000);expect(target('start-app-notepad')).toBeTruthy();fireEvent.click(screen.getByText(/Play/));await tick(2800);expect(target('notepad-text')).toBeTruthy();
  fireEvent.click(screen.getByText('Start over'));await tick(1000);expect(target('notepad-text')).toBeNull();expect(target('start-app-notepad')).toBeNull();
});
it('Watch resumes partial typing without erasing the prefix or skipping the next step',async()=>{
  vi.useFakeTimers();const lesson={...lessons[1],setup:{open:['notepad']},steps:[{id:'type',action:'type',target:'notepad-text',text:'abcd',say:'Type abcd'},{id:'close',action:'click',target:'notepad-close',say:'Close'}]};
  player(lesson,'watch');await tick(2885);expect(target('notepad-text').value).toBe('ab');fireEvent.click(screen.getByText(/Pause/));await tick(2000);expect(target('notepad-text').value).toBe('ab');fireEvent.click(screen.getByText(/Play/));await tick(3200);expect(target('notepad-text').value).toBe('abcd');await tick(4000);expect(screen.getByRole('dialog',{name:'Save changes'})).toBeTruthy();
});
it('completion persists through App to localStorage and survives reload',async()=>{
  vi.useFakeTimers();save({...load(),seenWalkthrough:true});const view=render(<App/>);fireEvent.click(screen.getByText('Start Lesson 1'));fireEvent.click(screen.getByText('Try it yourself'));
  click('icon-documents');await tick(600);fireEvent.doubleClick(target('icon-documents'));await tick(600);click('explorer-close');await tick(600);fireEvent.contextMenu(target('desktop-area'));await tick(600);click('ctx-refresh');await tick(600);
  expect(load().lessons['mouse-basics'].try).toBe(true);view.unmount();render(<App/>);expect(screen.getByText('1 of 42 stars collected')).toBeTruthy();
});
it('Free Play opens from Home, accepts unrestricted actions, resets and returns',()=>{
  save({...load(),seenWalkthrough:true});render(<App/>);fireEvent.click(screen.getByText('Free Play'));click('start-button');click('start-app-notepad');type('notepad-text','practice');expect(target('notepad-text').value).toBe('practice');fireEvent.click(screen.getByText('Reset'));expect(target('notepad-text')).toBeNull();fireEvent.click(screen.getByText('Back'));expect(screen.getByText('All lessons')).toBeTruthy();
});
it.each([
  l=>l.steps[0].action='drag',l=>l.steps[0].target='file-typo.txt',l=>l.steps[0]={id:'one',action:'key'},l=>l.steps[0]={id:'one',action:'type',target:'notepad-text'},l=>l.steps.push({...l.steps[0]}),l=>l.setup={open:['unknown']},l=>l.setup={explorerFolder:'unknown'},l=>l.setup={files:{unknown:[]}}
])('validator rejects invalid lesson metadata (%#)',mutate=>{
  const l=structuredClone(lessons[0]);mutate(l);expect(validateLessons([l]).length).toBeGreaterThan(0);
});
it.each(['guided','try'])('every lesson completes through %s with DOM events',async mode=>{
  vi.useFakeTimers();
  for(const lesson of lessons) {
    const view=player(lesson,mode);
    for(const st of lesson.steps) {
      if(st.action==='key') { const [mod,k]=st.combo.split('+');key(k==='tab'?'Tab':k,{ctrlKey:mod==='ctrl',altKey:mod==='alt'}); }
      else {
        expect(target(st.target),`${lesson.id}: ${st.id}`).toBeTruthy();
        if(st.action==='type') type(st.target,st.text);
        else if(st.action==='dblclick') {click(st.target);click(st.target);fireEvent.doubleClick(target(st.target));}
        else if(st.action==='rightclick') fireEvent.contextMenu(target(st.target));
        else click(st.target);
      }
      await tick(st.action==='type'?900:600);
    }
    expect(view.onComplete).toHaveBeenCalledExactlyOnceWith(lesson.id,mode);
    view.unmount();
  }
});
it('shortcuts in an editor act on that editor rather than a different top window',()=>{
  const ref=createRef();render(<Desktop ref={ref} setup={{open:['notepad','word'],notepadText:'hello'}}/>);
  fireEvent.keyDown(target('notepad-text'),{key:'a',ctrlKey:true});
  expect(ref.current.getState().docs.notepad.sel).toBe('all');expect(ref.current.getState().docs.word.sel).toBeNull();
});
it('changing learning mode cancels a pending advance',async()=>{
  vi.useFakeTimers();player(lessons[0]);click('icon-documents');fireEvent.click(screen.getByText('Change how I learn'));await tick(1000);fireEvent.click(screen.getByText('Try it yourself'));expect(screen.getByText('Click once on the Documents folder.')).toBeTruthy();
});
it('a blocked Guided shortcut cannot bring a background editor forward',()=>{
  const ref=createRef();render(<Desktop ref={ref} guard={()=>false} setup={{open:['notepad','word']}}/>);
  const before=ref.current.getState();fireEvent.keyDown(target('notepad-text'),{key:'s',ctrlKey:true});expect(ref.current.getState()).toEqual(before);
});
