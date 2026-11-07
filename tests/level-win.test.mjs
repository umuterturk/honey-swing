import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Window} from 'happy-dom';
import {LevelEndScreen} from '../src/casual/levelScreens.js';
import {successPlan} from '../src/casual/presentationSequence.js';
import {
  STAR_THRESHOLDS,burstParticles,countUpDuration,displayedCount,flightDropletSize,flightDroplets,honeyTier,praiseFor
} from '../src/casual/starThresholds.js';
import {createFxBus} from '../src/casual/fx/fxBus.js';
import {
  ONBOARDING_SESSION_KEY
} from '../src/casual/onboardingProgress.js';
import {
  newOnboardingRound,onboardingLevel,stepOnboarding
} from '../src/casual/onboardingLevels.js';

// Appendix A / B. These numbers are the expected contract, not a re-export.
const EXPECTED=[
  {level:1,target:5,star2:5,star3:5,auto3:true},
  {level:2,target:6,star2:6,star3:6,auto3:true},
  {level:3,target:8,star2:11,star3:13,auto3:false},
  {level:4,target:11,star2:18,star3:24,auto3:false},
  {level:5,target:6,star2:6,star3:6,auto3:true},
  {level:6,target:13,star2:18,star3:22,auto3:false},
  {level:7,target:10,star2:22,star3:34,auto3:false},
  {level:8,target:17,star2:28,star3:38,auto3:false},
  {level:9,target:11,star2:17,star3:17,auto3:false},
  {level:10,target:10,star2:14,star3:18,auto3:false},
  {level:11,target:9,star2:21,star3:32,auto3:false},
  {level:12,target:24,star2:33,star3:41,auto3:false},
  {level:13,target:16,star2:27,star3:38,auto3:false},
  {level:14,target:20,star2:38,star3:56,auto3:false},
  {level:15,target:30,star2:36,star3:41,auto3:false},
  {level:16,target:11,star2:17,star3:17,auto3:false},
  {level:17,target:10,star2:14,star3:18,auto3:false},
  {level:18,target:9,star2:20,star3:30,auto3:false},
  {level:19,target:24,star2:33,star3:41,auto3:false},
  {level:20,target:6,star2:7,star3:7,auto3:false}
];

const win=new Window({url:'https://honey.test/level-win'});
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
const {act,StrictMode}=await import('react');
const {createRoot}=await import('react-dom/client');
const {gsap}=await import('gsap');
const {default:SimplifiedGame}=await import('../src/casual/SimplifiedGame.jsx');
const {playWinCelebration}=await import('../src/casual/winMotion.js');

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

function bankedLevel1(){
  let round=newOnboardingRound(1);
  round=stepOnboarding(round,{type:'steer',index:0});
  round=stepOnboarding(round,{type:'steer',index:0});
  round=stepOnboarding(round,{type:'bank'});
  return round;
}

function lostLevel(){
  const round=newOnboardingRound(4);
  return {...round,turn:2,snaps:2};
}

function saveRound(round){
  win.localStorage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(round));
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

function timelineOf(node){
  const tween=gsap.getTweensOf(node).find(entry=>entry.parent&&entry.parent.duration);
  return tween?tween.parent:null;
}

function assertComputedFill(node,label){
  node.style.height='';
  node.style.opacity='';
  const computed=win.getComputedStyle(node);
  const height=String(computed.height);
  const pixels=parseFloat(height);
  assert.equal(computed.opacity,'1',label+' opacity');
  assert.notEqual(height,'0%',label+' height');
  assert.notEqual(height,'0px',label+' height');
  assert.ok(height==='78%'||pixels>0,label+' computed height '+height);
}

function parseLen(value,base){
  if(!value||value==='auto'||value==='none')return null;
  if(String(value).endsWith('%'))return parseFloat(value)/100*(base||0);
  const number=parseFloat(value);
  return Number.isFinite(number)?number:null;
}
function layoutRect(node,seen=new Set()){
  if(!node||seen.has(node))return {left:0,top:0,width:0,height:0};
  seen.add(node);
  const style=win.getComputedStyle(node);
  const parent=node.offsetParent||node.parentElement;
  const parentRect=parent&&parent!==document.body&&parent!==document.documentElement
    ?layoutRect(parent,seen):{left:0,top:0,width:0,height:0};
  const width=parseLen(style.width,parentRect.width)||0;
  const height=parseLen(style.height,parentRect.height)||0;
  const positioned=style.position==='absolute'||style.position==='fixed'||style.position==='relative';
  let left=parseLen(style.left,parentRect.width);
  let top=parseLen(style.top,parentRect.height);
  if(left==null)left=0;
  if(top==null)top=0;
  const shift=String(style.transform||'').match(/translateX\((-?[\d.]+)%\)/);
  if(shift)left+=parseFloat(shift[1])/100*width;
  const originLeft=positioned?parentRect.left:0;
  const originTop=positioned?parentRect.top:0;
  return {
    left:originLeft+left,top:originTop+top,width,height,
    right:originLeft+left+width,bottom:originTop+top+height,
    x:originLeft+left,y:originTop+top
  };
}
win.HTMLElement.prototype.getBoundingClientRect=function(){return layoutRect(this);};

function opacityOf(node){
  const value=Number(gsap.getProperty(node,'opacity'));
  return Number.isFinite(value)?value:1;
}

function makeStage(){
  const card=document.createElement('div');
  card.className='sgv-honey-win';
  const praise=document.createElement('p');
  const liquid=document.createElement('div');
  const board=document.createElement('div');
  board.className='sgv-honey-scoreboard';
  const tally=document.createElement('p');
  tally.className='sgv-win-tally';
  const targetRow=document.createElement('p');
  targetRow.className='sgv-honey-scoreboard-target';
  board.append(tally,targetRow);
  const cta=document.createElement('button');
  cta.type='button';
  cta.textContent='NEXT';
  card.append(praise,liquid,board,cta);
  document.body.append(card);
  return {card,praise,liquid,board,tally,targetRow,cta,remove(){card.remove();}};
}

after(()=>{
  gsap.globalTimeline.clear();
  win.happyDOM.abort();
});

test('star thresholds match Appendix A for all 20 levels',()=>{
  assert.equal(EXPECTED.length,20);
  assert.equal(Object.keys(STAR_THRESHOLDS).length,20);
  for(const row of EXPECTED){
    const stored=STAR_THRESHOLDS[row.level];
    assert.equal(stored.target,row.target,'L'+row.level+' target');
    assert.equal(stored.star2,row.star2,'L'+row.level+' star2');
    assert.equal(stored.star3,row.star3,'L'+row.level+' star3');
    assert.equal(stored.auto3,row.auto3,'L'+row.level+' auto3');
    assert.equal(honeyTier(row.level,row.target-1),0,'below target is not a win');
    const atTarget=honeyTier(row.level,row.target);
    if(row.auto3||row.target>=row.star3)assert.equal(atTarget,3,'L'+row.level+' target tier');
    else if(row.target>=row.star2)assert.equal(atTarget,2,'L'+row.level+' target tier');
    else assert.equal(atTarget,1,'L'+row.level+' target tier');
    if(row.star2>row.target&&row.star2<row.star3){
      assert.equal(honeyTier(row.level,row.star2-1),1);
      assert.equal(honeyTier(row.level,row.star2),2);
      assert.equal(honeyTier(row.level,row.star3-1),2);
    }
    if(row.star2===row.star3){
      const below=row.star3-1;
      const expected=below>=row.target?(row.auto3?3:1):0;
      assert.equal(honeyTier(row.level,below),expected,'equal thresholds skip 2★');
      assert.notEqual(honeyTier(row.level,row.star2),2);
    }
    assert.equal(honeyTier(row.level,row.star3),3);
    assert.equal(honeyTier(row.level,row.star3+25),3);
  }
  assert.equal(STAR_THRESHOLDS[11].star2,21);
  assert.equal(STAR_THRESHOLDS[11].star3,32);
  assert.equal(STAR_THRESHOLDS[18].star2,20);
  assert.equal(STAR_THRESHOLDS[18].star3,30);
  assert.equal(honeyTier(1,5),3);
  assert.equal(honeyTier(1,8),3);
  assert.equal(honeyTier(2,6),3);
  assert.equal(honeyTier(5,6),3);
  assert.equal(honeyTier(11,20),1);
  assert.equal(honeyTier(11,21),2);
  assert.equal(honeyTier(11,31),2);
  assert.equal(honeyTier(11,32),3);
  assert.equal(honeyTier(11,87),3);
  assert.equal(honeyTier(18,19),1);
  assert.equal(honeyTier(18,20),2);
  assert.equal(honeyTier(18,30),3);
  assert.equal(honeyTier(20,6),1);
  assert.equal(honeyTier(20,7),3);
  assert.equal(honeyTier(9,16),1);
  assert.equal(honeyTier(9,17),3);
});

test('a fail plays no praise, stars, count-up, or particles',()=>{
  const stage=makeStage(3);
  const bus=createFxBus({reducedMotion:()=>false});
  const handle=playWinCelebration({
    victory:false,secured:21,target:11,tier:2,praise:stage.praise,liquid:stage.liquid,
    tally:stage.tally,cta:stage.cta,reduced:false,bus
  });
  assert.equal(handle.motion,false);
  assert.equal(handle.timeline,null);
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  assert.equal(bus.queued(),0);
  assert.equal(gsap.getTweensOf(stage.praise).length,0);
  assert.equal(gsap.getTweensOf(stage.tally).length,0);
  stage.remove();
  const lose=renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:false,score:2,target:8,label:'TRY AGAIN'
  }));
  assert.match(lose,/Try again!/);
  assert.match(lose,/>TRY AGAIN</);
  assert.match(lose,/Drops secured: 2 \/ 8/);
  assert.doesNotMatch(lose,/sgv-win-praise|sgv-win-star|sgv-win-tally|Sweet!|Tasty!|Divine!/);
  const card=renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:true,score:32,target:9,label:'NEXT',
    praise:{tier:3,text:'Hiveful!'}
  }));
  assert.match(card,/Hiveful!/);
  assert.doesNotMatch(card,/Sweet!|Tasty!|Divine!/);
  assert.match(card,/Honey Collected/);
  assert.match(card,/Target:\s*9/);
  assert.match(card,/score-board\.png/);
  assert.match(card,/>NEXT</);
  assert.equal((card.match(/sgv-win-star|data-star|★/g)||[]).length,0);
  assert.match(card,/empty-complete-jar\.png/);
  assert.match(card,/sgv-jar-mask/);
  assert.match(card,/sgv-fluid-surface/);
  assert.match(card,/sgv-win-tally/);
});

function assertStylesheetTransform(node){
  const probe=document.createElement('div');
  probe.className=node.className;
  node.parentElement.appendChild(probe);
  const expected=win.getComputedStyle(probe).transform;
  const actual=win.getComputedStyle(node).transform;
  probe.remove();
  assert.equal(node.style.transform||'','',node.className+' keeps the stylesheet transform');
  assert.equal(actual,expected,node.className+' computed transform');
  return expected;
}

async function withStylesheet(run){
  const css=await read('../src/casual/minimal.css');
  const style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);
  try{await run();}
  finally{style.remove();}
}

test('the CTA advances during the celebration',async()=>{
  resetStorage();
  const round=bankedLevel1();
  saveRound(round);
  const view=await mount();
  const cta=view.host.querySelector('.sgv-end-cta');
  const timeline=timelineOf(view.host.querySelector('.sgv-win-praise'));
  assert.ok(timeline);
  timeline.pause();
  timeline.time(0.10);
  assert.equal(cta.disabled,false);
  assert.notEqual(view.host.querySelector('.sgv-win-tally').textContent,
    String(round.game.deal.T));
  await act(async()=>{tap(cta);});
  assert.equal(view.host.querySelector('.sgv-end-overlay'),null);
  assert.match(view.host.textContent,/Level 2/);
  assert.equal(view.host.querySelector('.sgv-win-praise'),null);
  await view.unmount();
});

test('a mounted loss shows the quiet end card',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    const round=lostLevel();
    assert.equal(round.game.deal.T,0);
    saveRound(round);
    const view=await mount();
    const host=view.host;
    assert.match(host.textContent,/Try again!/);
    assert.match(host.textContent,/TRY AGAIN/);
    assert.match(host.textContent,/Drops secured: 0 \/ 11/);
    assert.equal(host.querySelector('.sgv-win-praise'),null);
    assert.equal(host.querySelector('.sgv-win-star'),null);
    assert.equal(host.querySelector('.sgv-win-tally'),null);
    assert.doesNotMatch(host.textContent,/Sweet!|Tasty!|Divine!/);
    const resetStyle=win.getComputedStyle(host.querySelector('.sgv-end-reset'));
    assert.equal(resetStyle.minWidth,'65%');
    assert.equal(resetStyle.paddingTop,'10px');
    assert.equal(resetStyle.marginTop,'13px');
    const bus=host.querySelector('.sgv-fx-layer').__fxBus;
    assert.equal(bus.liveParticles(),0);
    assert.equal(bus.tweenCount(),0);
    assert.equal(gsap.getTweensOf(host.querySelector('.sgv-end-card')).length,0);
    await view.unmount();
  });
});

