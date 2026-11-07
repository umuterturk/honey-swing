import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {LEVEL_START,levelStartPlan,startTap} from '../src/casual/presentationSequence.js';
import {createFxBus} from '../src/casual/fx/fxBus.js';
import {
  ONBOARDING_SESSION_KEY,SEEN_FEATURE_INTROS_KEY
} from '../src/casual/onboardingProgress.js';
import {
  newOnboardingRound,onboardingActions,stepOnboarding
} from '../src/casual/onboardingLevels.js';

const win=new Window({url:'https://honey.test/level-start'});
function expose(name,value){
  try{Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});}
  catch{/* Node already exposes a read-only global such as navigator. */}
}
expose('window',win);
expose('document',win.document);
expose('navigator',win.navigator);
expose('HTMLElement',win.HTMLElement);
expose('SVGElement',win.SVGElement);
expose('Element',win.Element);
expose('Node',win.Node);
expose('MutationObserver',win.MutationObserver);
expose('DocumentFragment',win.DocumentFragment);
expose('localStorage',win.localStorage);
expose('CustomEvent',win.CustomEvent);
expose('Event',win.Event);
expose('MouseEvent',win.MouseEvent);
expose('PointerEvent',win.PointerEvent);
expose('KeyboardEvent',win.KeyboardEvent);
expose('getComputedStyle',win.getComputedStyle.bind(win));
expose('requestAnimationFrame',win.requestAnimationFrame.bind(win));
expose('cancelAnimationFrame',win.cancelAnimationFrame.bind(win));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;

function media(matches){
  return query=>({
    matches:typeof matches==='function'?matches(query):!!matches,
    media:query,onchange:null,
    addListener(){},removeListener(){},
    addEventListener(){},removeEventListener(){},
    dispatchEvent(){return false;}
  });
}
function useMotion(reduced){
  win.matchMedia=media(query=>reduced&&String(query).includes('reduce'));
  globalThis.matchMedia=win.matchMedia;
}
useMotion(false);
win.localStorage.clear();

register('./jsx-loader.mjs',import.meta.url);
const {act,createElement,StrictMode}=await import('react');
const {createRoot}=await import('react-dom/client');
const {gsap}=await import('gsap');
const {default:SimplifiedGame}=await import('../src/casual/SimplifiedGame.jsx');

const read=async path=>readFile(new URL(path,import.meta.url),'utf8');

function tap(node){
  node.dispatchEvent(new win.PointerEvent('pointerdown',{
    bubbles:true,cancelable:true,pointerId:1
  }));
  node.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true}));
}

function resetStorage(){
  win.localStorage.clear();
  useMotion(false);
}

function seeBank(){
  win.localStorage.setItem(SEEN_FEATURE_INTROS_KEY,JSON.stringify(['bank']));
}

function arrivalTimeline(node){
  const tween=gsap.getTweensOf(node).find(entry=>entry.parent&&entry.parent.duration);
  return tween?tween.parent:null;
}

function opacityOf(node){
  const value=Number(gsap.getProperty(node,'opacity'));
  return Number.isFinite(value)?value:1;
}
function scaleOf(node){
  const value=Number(gsap.getProperty(node,'scale'));
  return Number.isFinite(value)&&value!==0?value:1;
}
function yOf(node){
  const value=Number(gsap.getProperty(node,'y'));
  return Number.isFinite(value)?value:0;
}

async function mount(){
  const host=document.createElement('div');
  document.body.appendChild(host);
  const root=createRoot(host);
  await act(async()=>{
    root.render(createElement(StrictMode,null,createElement(SimplifiedGame)));
  });
  let gone=false;
  return {host,root,async unmount(){
    if(gone)return;
    gone=true;
    await act(async()=>{root.unmount();});
    host.remove();
  }};
}

function spyTimeouts(){
  const delays=[];
  const original=globalThis.setTimeout;
  globalThis.setTimeout=function(fn,delay,...args){
    delays.push(Number(delay)||0);
    return original.call(this,fn,delay,...args);
  };
  return {delays,restore(){globalThis.setTimeout=original;}};
}

after(()=>{
  gsap.globalTimeline.clear();
  win.happyDOM.abort();
});

test('a fresh level plays arrival within 2.5s and the start screen stays until a tap',async()=>{
  resetStorage();
  seeBank();
  const view=await mount();
  const jar=view.host.querySelector('.sgv-chest-area');
  const hand=view.host.querySelector('.sgv-hand');
  const timeline=arrivalTimeline(jar);
  assert.ok(view.host.querySelector('.sgv-level-start'));
  assert.ok(view.host.querySelector('.sgv-level-banner'));
  assert.ok(timeline,'the jar hero is a live FX tween after the level settle');
  assert.ok(timeline.totalDuration()<=2.5);
  assert.ok(timeline.totalDuration()>=0.880);
  timeline.pause();
  await act(async()=>{timeline.progress(1);});
  assert.ok(view.host.querySelector('.sgv-level-start'),
    'arrival ending must not dismiss the tap-to-start screen');
  assert.equal(view.host.querySelector('.sgv-level-banner'),null);
  assert.ok(Math.abs(opacityOf(hand)-1)<0.05);
  const card=view.host.querySelector('.sgv-card');
  await act(async()=>{tap(view.host.querySelector('.sgv-level-start-dismiss'));});
  assert.equal(view.host.querySelector('.sgv-level-start'),null);
  assert.equal(view.host.querySelector('.sgv-skip-surface'),null);
  assert.equal(card.disabled,false);
  const pointer=new win.PointerEvent('pointerdown',{
    bubbles:true,cancelable:true,pointerId:1
  });
  await act(async()=>{card.dispatchEvent(pointer);});
  assert.equal(pointer.defaultPrevented,false);
  await view.unmount();
});

test('skip during arrival settles and a legal control tap still passes',async()=>{
  assert.deepEqual(startTap({arrival:true}),{consume:false,finishArrival:true,pass:true});
  assert.deepEqual(startTap({action:true,arrival:true}),{consume:true,finishArrival:false,pass:false});
  resetStorage();
  seeBank();
  const view=await mount();
  const phone=view.host.querySelector('.sgv-phone');
  const timeline=arrivalTimeline(view.host.querySelector('.sgv-hand'));
  assert.ok(timeline);
  timeline.pause();
  timeline.time(0.2);
  await act(async()=>{
    phone.dispatchEvent(new win.KeyboardEvent('keydown',{
      key:'Escape',bubbles:true,cancelable:true
    }));
  });
  assert.equal(view.host.querySelector('.sgv-level-start'),null);
  assert.equal(gsap.getTweensOf(view.host.querySelector('.sgv-chest-area')).length,0);
  assert.ok(Math.abs(opacityOf(view.host.querySelector('.sgv-hand'))-1)<0.001);
  const card=view.host.querySelector('.sgv-card');
  const pointer=new win.PointerEvent('pointerdown',{
    bubbles:true,cancelable:true,pointerId:1
  });
  await act(async()=>{card.dispatchEvent(pointer);});
  assert.equal(pointer.defaultPrevented,false);
  await view.unmount();
});

test('a mid-level restore replays neither the arrival nor the start screen',async()=>{
  resetStorage();
  seeBank();
  const start=newOnboardingRound(1);
  const mid=stepOnboarding(start,onboardingActions(start)[0]);
  assert.ok(mid.turn>0);
  win.localStorage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(mid));
  const view=await mount();
  const phone=view.host.querySelector('.sgv-phone');
  assert.equal(view.host.querySelector('.sgv-level-start'),null);
  assert.equal(view.host.querySelector('.sgv-feature-intro'),null);
  assert.equal(view.host.querySelector('.sgv-level-banner'),null);
  assert.equal(gsap.getTweensOf(view.host.querySelector('.sgv-chest-area')).length,0);
  assert.equal(gsap.getTweensOf(view.host.querySelector('.sgv-hand')).length,0);
  assert.doesNotMatch(phone.className,/sgv-level-arrival|sgv-arrive/);
  await view.unmount();
});

test('reduced motion mounts the static final state with the start screen still waiting',async()=>{
  resetStorage();
  seeBank();
  useMotion(true);
  const view=await mount();
  const jar=view.host.querySelector('.sgv-chest-area');
  const hand=view.host.querySelector('.sgv-hand');
  const banner=view.host.querySelector('.sgv-level-banner');
  assert.ok(view.host.querySelector('.sgv-level-start'));
  assert.ok(banner);
  assert.equal(gsap.getTweensOf(jar).length,0);
  assert.equal(gsap.getTweensOf(hand).length,0);
  assert.equal(gsap.getTweensOf(banner).length,0);
  assert.doesNotMatch(banner.style.transform||'',/scale\(/);
  assert.ok(Math.abs(opacityOf(jar)-1)<0.001);
  assert.ok(Math.abs(opacityOf(hand)-1)<0.001);
  assert.doesNotMatch(view.host.querySelector('.sgv-phone').className,/sgv-level-arrival|sgv-arrive/);
  await view.unmount();
});

test('the idle hint timer starts only after the start screen is dismissed',async()=>{
  resetStorage();
  const spy=spyTimeouts();
  try{
    const view=await mount();
    assert.ok(view.host.querySelector('.sgv-feature-intro'));
    assert.equal(view.host.querySelector('.sgv-level-start'),null);
    assert.equal(spy.delays.includes(3000),false);
    await act(async()=>{tap(view.host.querySelector('.sgv-feature-intro-play'));});
    assert.equal(view.host.querySelector('.sgv-feature-intro'),null);
    assert.ok(view.host.querySelector('.sgv-level-start'));
    assert.equal(spy.delays.includes(3000),false,
      'the hint must wait until the start screen is dismissed');
    await act(async()=>{tap(view.host.querySelector('.sgv-level-start-dismiss'));});
    assert.equal(view.host.querySelector('.sgv-level-start'),null);
    assert.equal(spy.delays.includes(3000),true);
    await view.unmount();
  }finally{
    spy.restore();
  }
});

