import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {Window} from 'happy-dom';

const win=new Window({url:'https://honey.test/'});
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
win.matchMedia=query=>({
  matches:false,media:query,onchange:null,
  addListener(){},removeListener(){},
  addEventListener(){},removeEventListener(){},
  dispatchEvent(){return false;}
});
globalThis.matchMedia=win.matchMedia;
win.localStorage.clear();

register('./jsx-loader.mjs',import.meta.url);
const {act,createElement,StrictMode}=await import('react');
const {createRoot}=await import('react-dom/client');
const {gsap}=await import('gsap');
const {default:SimplifiedGame}=await import('../src/casual/SimplifiedGame.jsx');
const {createFxBus}=await import('../src/casual/fx/fxBus.js');
const {playFeatureIntroEnter}=await import('../src/casual/featureIntroMotion.js');

function tap(node){
  node.dispatchEvent(new win.PointerEvent('pointerdown',{
    bubbles:true,cancelable:true,pointerId:1
  }));
  node.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true}));
}

function entryTweens(card){
  return gsap.getTweensOf(card).filter(tween=>tween.parent);
}

after(()=>{
  gsap.globalTimeline.clear();
  win.happyDOM.abort();
});

test('a fresh Level 1 shows a visible Bank card after mount and settle',async()=>{
  win.localStorage.clear();
  const host=document.createElement('div');
  document.body.appendChild(host);
  const root=createRoot(host);
  await act(async()=>{
    root.render(createElement(StrictMode,null,createElement(SimplifiedGame)));
  });
  const phone=host.querySelector('.sgv-phone');
  const card=host.querySelector('.sgv-feature-intro-card');
  const scrim=host.querySelector('.sgv-feature-intro-scrim');
  assert.ok(phone);
  assert.equal(phone.getAttribute('data-intro-gate'),'true');
  assert.ok(card);
  assert.ok(scrim);
  const live=entryTweens(card);
  assert.ok(live.length>0,'the level-change settle must finish before the intro entry tween');
  live[0].parent.progress(1);
  assert.equal(card.style.opacity,'1');
  assert.equal(scrim.style.opacity,'0.55');
  assert.match(card.style.transform,/translate\(0,\s*0\)|scale\(1|none/);
  const hand=host.querySelector('.sgv-card');
  assert.equal(hand.disabled,true);
  await act(async()=>{tap(hand);});
  assert.ok(host.querySelector('.sgv-feature-intro'));
  assert.equal(host.querySelector('.sgv-phone').getAttribute('data-intro-gate'),'true');
  assert.equal(host.querySelector('.sgv-skip-surface'),null);
  await act(async()=>{tap(host.querySelector('.sgv-feature-intro-play'));});
  assert.equal(host.querySelector('.sgv-feature-intro'),null);
  assert.equal(host.querySelector('.sgv-phone').getAttribute('data-intro-gate'),null);
  assert.equal(host.querySelector('.sgv-card').disabled,false);
  assert.ok(host.querySelector('.sgv-level-start'));
  await act(async()=>{tap(host.querySelector('.sgv-card'));});
  assert.equal(host.querySelector('.sgv-feature-intro'),null);
  assert.equal(host.querySelector('.sgv-level-start'),null);
  await act(async()=>{root.unmount();});
  host.remove();
});

test('a settle during the entry tween leaves the card fully visible',()=>{
  const bus=createFxBus({reducedMotion:()=>false});
  const scrim=document.createElement('div');
  const card=document.createElement('div');
  document.body.append(scrim,card);
  const handle=playFeatureIntroEnter({scrim,card,reduced:false,bus});
  handle.timeline.progress(0.35);
  assert.notEqual(card.style.opacity,'1');
  assert.match(card.style.transform,/scale\(0\./);
  bus.settle();
  assert.equal(card.style.opacity,'1');
  assert.equal(scrim.style.opacity,'0.55');
  assert.match(card.style.transform,/translate\(0,\s*0\)|scale\(1|none/);
  assert.equal(bus.tweenCount(),0);
  scrim.remove();
  card.remove();
});
