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
import {
  ONBOARDING_SESSION_KEY,prepareOnboardingJump
} from '../src/casual/onboardingProgress.js';
import {derivedFeatureUnlocks} from '../src/casual/featureIntroRegistry.js';
import {ONBOARDING_COUNT} from '../src/casual/onboardingLevels.js';

function tap(node){
  node.dispatchEvent(new win.PointerEvent('pointerdown',{
    bubbles:true,cancelable:true,pointerId:1
  }));
  node.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true}));
}

async function mountAtLevel(levelId){
  win.localStorage.clear();
  prepareOnboardingJump(win.localStorage,levelId,{
    levelCount:ONBOARDING_COUNT,
    introUnlocks:derivedFeatureUnlocks()
  });
  const host=document.createElement('div');
  document.body.appendChild(host);
  const root=createRoot(host);
  await act(async()=>{
    root.render(createElement(StrictMode,null,createElement(SimplifiedGame)));
  });
  // Fresh jump has no session → level-start may show; tap the dismiss button so no card plays.
  if(host.querySelector('.sgv-level-start')){
    await act(async()=>{tap(host.querySelector('.sgv-level-start-dismiss')||host.querySelector('.sgv-level-start'));});
  }
  assert.equal(host.querySelector('.sgv-feature-intro:not(.sgv-factor-info)'),null);
  return {host,root};
}

after(()=>{
  gsap.globalTimeline.clear();
  win.happyDOM.abort();
});

test('tapping Swing and Flip pills opens matching info; Got it and scrim dismiss',async()=>{
  const {host}=await mountAtLevel(16);
  const flowerPill=host.querySelector('.sgv-multiplier-pill[data-factor="swing"]');
  const beePill=host.querySelector('.sgv-multiplier-pill[data-factor="flip"]');
  assert.ok(flowerPill);
  assert.ok(beePill);
  assert.equal(flowerPill.tagName,'BUTTON');
  assert.equal(beePill.tagName,'BUTTON');
  const jackpot=host.querySelector('.sgv-multiplier-pill[data-factor="jackpot"]');
  if(jackpot)assert.equal(jackpot.tagName,'SPAN');

  await act(async()=>{tap(flowerPill);});
  const phone=host.querySelector('.sgv-phone');
  assert.equal(phone.getAttribute('data-factor-info'),'true');
  assert.ok(host.querySelector('.sgv-factor-info'));
  assert.match(host.querySelector('#sgv-factor-info-title').textContent,/More Flower/);
  assert.match(host.querySelector('.sgv-factor-info .sgv-feature-intro-copy').textContent,
    /Cross 0 for more flowers/);
  assert.ok(host.querySelector('.sgv-factor-info img.sgv-feature-intro-icon[src="/celebration/daisy-2.png"]'));

  await act(async()=>{tap(beePill);});
  assert.match(host.querySelector('#sgv-factor-info-title').textContent,/More Bee/);
  assert.match(host.querySelector('.sgv-factor-info .sgv-feature-intro-copy').textContent,
    /Flip for more bees/);

  await act(async()=>{tap(host.querySelector('.sgv-factor-info .sgv-feature-intro-play'));});
  assert.equal(host.querySelector('.sgv-factor-info'),null);
  assert.equal(phone.getAttribute('data-factor-info'),null);

  await act(async()=>{tap(flowerPill);});
  await act(async()=>{tap(host.querySelector('.sgv-factor-info .sgv-feature-intro-scrim'));});
  assert.equal(host.querySelector('.sgv-factor-info'),null);
});

test('factor info pills stay disabled during intro gate',async()=>{
  win.localStorage.clear();
  const host=document.createElement('div');
  document.body.appendChild(host);
  const root=createRoot(host);
  await act(async()=>{
    root.render(createElement(StrictMode,null,createElement(SimplifiedGame)));
  });
  assert.equal(host.querySelector('.sgv-phone').getAttribute('data-intro-gate'),'true');
  // Level 1 has no swing pill; assert Save intro is up and no factor-info dialog exists.
  assert.ok(host.querySelector('.sgv-feature-intro'));
  assert.equal(host.querySelector('.sgv-factor-info'),null);
});

test('pill is disabled before level-start is dismissed and tapping does not open factor-info',async()=>{
  win.localStorage.clear();
  prepareOnboardingJump(win.localStorage,16,{
    levelCount:ONBOARDING_COUNT,
    introUnlocks:derivedFeatureUnlocks()
  });
  const host=document.createElement('div');
  document.body.appendChild(host);
  const root=createRoot(host);
  await act(async()=>{
    root.render(createElement(StrictMode,null,createElement(SimplifiedGame)));
  });
  // Do NOT dismiss level-start — pills should be disabled.
  const swingPill=host.querySelector('.sgv-multiplier-pill[data-factor="swing"]');
  assert.ok(swingPill,'Swing pill exists at Level 16');
  assert.equal(swingPill.disabled,true,'Swing pill is disabled before level-start dismiss');
  await act(async()=>{tap(swingPill);});
  assert.equal(host.querySelector('.sgv-factor-info'),null,'Factor info must not open while pill is disabled');
});
