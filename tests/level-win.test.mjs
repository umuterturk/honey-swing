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

test('praise and bursts follow the star tier and never change the engine score',()=>{
  assert.deepEqual(praiseFor(1),{tier:1,text:'Nectar!',sound:'praise.nectar'});
  assert.deepEqual(praiseFor(2),{tier:2,text:'Amber!',sound:'praise.amber'});
  assert.deepEqual(praiseFor(3),{tier:3,text:'Hiveful!',sound:'praise.hiveful'});
  assert.equal(praiseFor(0),null);
  assert.equal(burstParticles(0),0);
  assert.equal(burstParticles(1),16);
  assert.equal(burstParticles(2),20);
  assert.equal(burstParticles(3),24);
  assert.ok(burstParticles(3)<=24);
  let round=newOnboardingRound(1);
  round=stepOnboarding(round,{type:'steer',index:0});
  round=stepOnboarding(round,{type:'steer',index:0});
  round=stepOnboarding(round,{type:'bank'});
  const secured=round.game.deal.T;
  assert.ok(secured>=onboardingLevel(1).target);
  assert.equal(honeyTier(1,secured),3);
  assert.equal(praiseFor(honeyTier(1,secured)).text,'Hiveful!');
  assert.equal(round.game.deal.T,secured);
  const sweet=successPlan({victory:true,levelId:4,secured:11});
  assert.equal(sweet.tier,1);
  assert.equal(sweet.flight.size,16);
  assert.equal(sweet.praise.text,'Nectar!');
  assert.equal(sweet.burst.particles,16);
  assert.equal(sweet.count.to,11);
  const tasty=successPlan({victory:true,levelId:4,secured:18});
  assert.equal(tasty.tier,2);
  assert.equal(tasty.flight.size,18);
  assert.equal(tasty.praise.text,'Amber!');
  assert.equal(tasty.burst.particles,20);
  const divine=successPlan({victory:true,levelId:11,secured:32});
  assert.equal(divine.tier,3);
  assert.equal(divine.flight.size,20);
  assert.equal(divine.praise.text,'Hiveful!');
  assert.equal(divine.count.to,32);
  assert.equal(divine.burst.particles,24);
  assert.equal(divine.ctaAt,0);
  assert.equal(divine.scoreAt,0);
  const lost=successPlan({victory:false,levelId:11,secured:32,bank:true});
  assert.equal(lost.effects,false);
  assert.equal(lost.tier,0);
  assert.equal(lost.star,null);
  assert.equal(lost.praise,null);
  assert.equal(lost.particles,0);
  assert.equal(lost.burst,null);
  assert.equal(lost.count,null);
  const reduced=successPlan({victory:true,levelId:1,secured:8,reduced:true});
  assert.equal(reduced.motion,false);
  assert.equal(reduced.particles,0);
  assert.equal(reduced.tier,3);
  assert.equal(reduced.flight.count,0);
  assert.equal(reduced.praise.text,'Hiveful!');
  assert.equal(reduced.count.to,8);
});

test('the count-up duration follows the digit cap and ends on the engine integer',()=>{
  assert.equal(countUpDuration(5),0.45);
  assert.equal(countUpDuration(32),0.45);
  assert.equal(countUpDuration(100),0.45);
  assert.equal(displayedCount(0.5,5),2);
  for(const value of [1,5,6,7,8,9,11,13,17,24,30,32,41,56,87]){
    assert.equal(displayedCount(0,value),0);
    assert.equal(displayedCount(1,value),value);
    assert.equal(displayedCount(1.0000000002,value),value);
    for(let step=0;step<=20;step++){
      const shown=displayedCount(step/20,value);
      assert.equal(Number.isInteger(shown),true);
      assert.ok(shown>=0&&shown<=value);
    }
  }
});

test('skip and settle land on the exact secured score, a full jar, and 0 particles',()=>{
  const secured=32;
  const stage=makeStage();
  stage.praise.textContent='Hiveful!';
  const sounds=[];
  const bus=createFxBus({
    reducedMotion:()=>false,
    audio:{play(id){sounds.push(id);return true;}}
  });
  const handle=playWinCelebration({
    victory:true,secured,target:9,tier:3,praise:stage.praise,liquid:stage.liquid,
    scoreboard:stage.board,targetRow:stage.targetRow,tally:stage.tally,cta:stage.cta,card:stage.card,
    reduced:false,bus
  });
  assert.equal(handle.motion,true);
  assert.equal(handle.timeline.totalDuration(),2);
  handle.timeline.pause();
  handle.timeline.time(0);
  assert.equal(stage.tally.textContent,'0');
  handle.timeline.time(0.5);
  assert.equal(stage.tally.textContent,'0');
  const mid=Number.parseFloat(stage.liquid.style.height);
  assert.ok(mid>0&&mid<78,String(mid));
  handle.timeline.time(1.05);
  assert.equal(stage.liquid.style.height,'78%');
  handle.timeline.time(1.1);
  assert.ok(opacityOf(stage.praise)>0);
  assert.equal(bus.liveParticles(),0);
  assert.ok(sounds.includes('praise.hiveful'));
  assert.equal(sounds.includes('fx.confetti'),false);
  bus.settle();
  assert.equal(bus.tweenCount(),0);
  assert.equal(bus.liveParticles(),0);
  assert.equal(stage.tally.textContent,String(secured));
  assert.equal(stage.praise.style.opacity,'1');
  assert.equal(stage.liquid.style.height,'78%');
  assert.ok(stage.targetRow.classList.contains('is-met'));
  assert.equal(gsap.getTweensOf(stage.praise).length,0);
  assert.equal(stage.cta.disabled,false);
  stage.remove();
});

test('a killed tween at the hidden frame still shows the final card',()=>{
  const stage=makeStage();
  stage.praise.textContent='Hiveful!';
  const bus=createFxBus({reducedMotion:()=>false});
  const handle=playWinCelebration({
    victory:true,secured:8,target:5,tier:3,praise:stage.praise,liquid:stage.liquid,
    scoreboard:stage.board,targetRow:stage.targetRow,tally:stage.tally,cta:stage.cta,card:stage.card,reduced:false,bus
  });
  handle.timeline.pause();
  handle.timeline.time(0.05);
  assert.notEqual(stage.tally.textContent,'8');
  bus.settle();
  assert.equal(bus.tweenCount(),0);
  assert.equal(bus.liveParticles(),0);
  assert.equal(stage.tally.textContent,'8');
  assert.equal(stage.praise.style.opacity,'1');
  assert.equal(stage.liquid.style.height,'78%');
  assert.doesNotMatch(stage.praise.style.transform||'',/scale\(0/);
  stage.remove();
});

test('reduced motion shows the final card and emits 0 particles',()=>{
  const stage=makeStage();
  stage.praise.textContent='Amber!';
  const bus=createFxBus({reducedMotion:()=>false});
  const handle=playWinCelebration({
    victory:true,secured:18,target:11,tier:2,praise:stage.praise,liquid:stage.liquid,
    scoreboard:stage.board,targetRow:stage.targetRow,tally:stage.tally,cta:stage.cta,card:stage.card,reduced:true,bus
  });
  assert.equal(handle.motion,false);
  assert.equal(handle.timeline,null);
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  assert.equal(gsap.getTweensOf(stage.praise).length,0);
  assert.equal(stage.tally.textContent,'18');
  assert.equal(stage.praise.style.opacity,'1');
  assert.equal(stage.liquid.style.height,'78%');
  stage.remove();
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

test('the win card keeps the end screen, the reset, and the Bank pour',async()=>{
  const source=await read('../src/casual/SimplifiedGame.jsx');
  const motion=await read('../src/casual/winMotion.js');
  const css=await read('../src/casual/minimal.css');
  const engines=await read('../src/external/engines.js');
  assert.match(source,/<LevelEndScreen /);
  assert.match(source,/<LevelStartScreen /);
  assert.match(source,/className="sgv-reset-progress"/);
  assert.match(source,/animateBankPour\(/);
  assert.match(source,/playWinCelebration\(/);
  assert.match(source,/LOWER ORCHARD/);
  assert.match(source,/PLAY AGAIN/);
  assert.doesNotMatch(source,/landing_band|sgv-flip-band|FlipLandingBand/);
  assert.doesNotMatch(motion,/external\/engines|landing_band|sgv-flip-band/);
  assert.doesNotMatch(engines,/winStars|Sweet!|starThresholds/);
  assert.match(css,/\.sgv-end-card \.sgv-win-praise-1\{[^}]*color:var\(--honey-praise-h1\)/);
  assert.match(css,/\.sgv-end-card \.sgv-win-praise-2\{[^}]*color:var\(--honey-praise-h2\)/);
  assert.match(css,/\.sgv-end-card \.sgv-win-praise-3\{[^}]*color:var\(--honey-praise-h3\)/);
  assert.match(css,/\.sgv-end-card \.sgv-win-tally\{[^}]*tabular-nums/);
  assert.doesNotMatch(css,/\.sgv-win-star/);
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

test('a mounted settle mid-celebration leaves 0 tweens and a visible final card',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    const round=bankedLevel1();
    const secured=round.game.deal.T;
    assert.ok(secured>=5);
    assert.equal(honeyTier(1,secured),3);
    saveRound(round);
    const view=await mount();
    const host=view.host;
    const praise=host.querySelector('.sgv-win-praise');
    const liquid=host.querySelector('.sgv-honey-hero-art .sgv-fluid-fill');
    const tally=host.querySelector('.sgv-win-tally');
    const targetRow=host.querySelector('.sgv-honey-scoreboard-target');
    const cta=host.querySelector('.sgv-end-cta');
    const goal=host.querySelector('.sgv-goal-progress');
    const bus=host.querySelector('.sgv-fx-layer').__fxBus;
    assert.equal(host.querySelector('.sgv-win-star'),null);
    assert.ok(liquid);
    assert.equal(praise.textContent,'Hiveful!');
    assert.ok(host.querySelector('.sgv-honey-scoreboard-art'));
    assert.match(host.querySelector('.sgv-honey-scoreboard-label').textContent,/Honey Collected/);
    assert.match(targetRow.textContent,/Target:\s*5/);
    assert.equal(host.querySelector('.sgv-honey-subline'),null);
    assert.equal(cta.disabled,false);
    assert.equal(cta.textContent,'NEXT');
    const reset=host.querySelector('.sgv-honey-reset');
    const resetStyle=win.getComputedStyle(reset);
    assert.equal(resetStyle.height,'44px');
    assert.equal(reset.getAttribute('aria-label'),'Reset progress');
    assert.match(reset.textContent,/Reset/);
    assert.equal(resetStyle.borderTopWidth,'2px');
    assert.equal(resetStyle.fontSize,'15px');
    const timeline=timelineOf(praise);
    assert.ok(timeline,'the win card plays a celebration timeline');
    timeline.pause();
    timeline.time(0.90);
    assert.equal(tally.textContent,'0');
    const mid=Number.parseFloat(liquid.style.height);
    assert.ok(mid>0&&mid<=78,String(mid));
    assert.equal(bus.liveParticles(),0);
    assert.match(targetRow.textContent,/Target:\s*5/);
    const overlay=host.querySelector('.sgv-end-overlay');
    await act(async()=>{
      overlay.dispatchEvent(new win.PointerEvent('pointerdown',{
        bubbles:true,cancelable:true,pointerId:1
      }));
    });
    assert.ok(host.querySelector('.sgv-end-overlay'),'backdrop settles and stays on the card');
    assert.equal(host.querySelector('.sgv-win-tally').textContent,String(secured));
    assert.match(host.querySelector('.sgv-honey-scoreboard-target').textContent,/Target:\s*5/);
    assert.equal(host.querySelector('.sgv-win-praise').textContent,'Hiveful!');
    assert.equal(host.querySelector('.sgv-win-star'),null);
    assert.equal(host.querySelector('.sgv-honey-hero-art .sgv-fluid-fill').style.height,'78%');
    const shownPraise=host.querySelector('.sgv-win-praise');
    assert.equal(shownPraise.style.opacity,'1');
    assert.equal(win.getComputedStyle(shownPraise).opacity,'1');
    assert.doesNotMatch(shownPraise.style.transform||'',/scale\(0/);
    assert.equal(gsap.getTweensOf(shownPraise).length,0);
    assert.equal(bus.tweenCount(),0);
    assert.equal(bus.liveParticles(),0);
    assert.equal(host.querySelector('.sgv-end-cta').textContent,'NEXT');
    assert.equal(host.querySelector('.sgv-end-cta').disabled,false);
    assert.ok(host.querySelector('.sgv-honey-final'));
    assert.ok(host.querySelector('.sgv-success-settled'));
    assertComputedFill(host.querySelector('.sgv-honey-hero-art .sgv-fluid-fill'),'skip-settled');
    const expected=assertStylesheetTransform(goal);
    assert.match(String(expected),/-50%/);
    await view.unmount();
  });
});

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

test('the settled timeline keeps a computed full jar',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    saveRound(bankedLevel1());
    const view=await mount();
    const host=view.host;
    const timeline=timelineOf(host.querySelector('.sgv-win-praise'));
    assert.ok(timeline);
    await act(async()=>{timeline.time(1.75);});
    assert.ok(host.querySelector('.sgv-success-settled'));
    assertComputedFill(host.querySelector('.sgv-honey-hero-art .sgv-fluid-fill'),'settled');
    await view.unmount();
  });
});

test('reduced motion mounts the static final card with 0 particles',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    useMotion(true);
    const round=bankedLevel1();
    const secured=round.game.deal.T;
    saveRound(round);
    const view=await mount();
    const host=view.host;
    const bus=host.querySelector('.sgv-fx-layer').__fxBus;
    assert.equal(host.querySelector('.sgv-win-praise').textContent,'Hiveful!');
    assert.equal(host.querySelector('.sgv-win-star'),null);
    assert.equal(host.querySelector('.sgv-win-tally').textContent,String(secured));
    assert.match(host.querySelector('.sgv-honey-scoreboard-target').textContent,/Target:\s*5/);
    assert.match(host.querySelector('.sgv-honey-scoreboard-label').textContent,/Honey Collected/);
    assert.equal(host.querySelector('.sgv-honey-hero-art .sgv-fluid-fill').style.height,'78%');
    assert.ok(host.querySelector('.sgv-win-static'));
    assertComputedFill(host.querySelector('.sgv-honey-hero-art .sgv-fluid-fill'),'reduced-motion');
    assert.equal(bus.liveParticles(),0);
    assert.equal(bus.tweenCount(),0);
    assert.equal(gsap.getTweensOf(host.querySelector('.sgv-win-praise')).length,0);
    assert.equal(host.querySelector('.sgv-end-cta').textContent,'NEXT');
    await view.unmount();
  });
});

test('jar mouth origin stays laid out on 320, 430, and a safe-area phone',async()=>{
  await withStylesheet(async()=>{
    const cases=[
      {width:320,height:568,top:0,right:0,bottom:0,left:0},
      {width:430,height:932,top:0,right:0,bottom:0,left:0},
      {width:320,height:568,top:44,right:0,bottom:34,left:0}
    ];
    let zeroInsetOriginY=0;
    for(const box of cases){
      resetStorage();
      saveRound(bankedLevel1());
      const sizer=document.createElement('style');
      sizer.textContent=[
        '.sgv-phone{width:'+box.width+'px !important;height:'+box.height+'px !important;',
        '--safe-top:'+box.top+'px;--safe-right:'+box.right+'px;',
        '--safe-bottom:'+box.bottom+'px;--safe-left:'+box.left+'px}'
      ].join('');
      document.head.appendChild(sizer);
      const view=await mount();
      const host=view.host.querySelector('.sgv-phone');
      const layer=host.querySelector('.sgv-fx-layer');
      const mouth=host.querySelector('.sgv-honey-mouth');
      const timeline=timelineOf(host.querySelector('.sgv-win-praise'));
      assert.ok(timeline,box.width+' timeline');
      timeline.pause();
      timeline.time(1.05);
      assert.equal(layer.__fxBus.pool.live().some(entry=>entry.event==='win-burst'),false);
      assert.ok(host.querySelector('.sgv-honey-scoreboard'));
      const layerBox=layoutRect(layer);
      const lip=layoutRect(mouth);
      const origin={
        x:lip.left+lip.width/2-layerBox.left,
        y:lip.top+lip.height/2-layerBox.top
      };
      if(box.width===430)assert.ok(origin.x>200,'430 lip is not the 320 fallback');
      if(box.width===320&&box.top===0)zeroInsetOriginY=origin.y;
      if(box.top===44)assert.ok(origin.y>zeroInsetOriginY,'inset lip is below the zero-inset fallback');
      await view.unmount();
      sizer.remove();
    }
  });
});

test('win FX stacks above the end card, under NEW!, and the CTA still receives the tap',async()=>{
  await withStylesheet(async()=>{
    const phone=document.createElement('div');
    phone.className='sgv-phone';
    phone.innerHTML=[
      '<div class="sgv-fx-layer"><canvas class="sgv-fx-canvas"></canvas></div>',
      '<div class="sgv-end-overlay"><button class="sgv-end-cta" type="button">NEXT</button></div>',
      '<div class="sgv-feature-intro"></div>'
    ].join('');
    document.body.appendChild(phone);
    const fx=win.getComputedStyle(phone.querySelector('.sgv-fx-layer'));
    const end=win.getComputedStyle(phone.querySelector('.sgv-end-overlay'));
    const intro=win.getComputedStyle(phone.querySelector('.sgv-feature-intro'));
    const canvas=win.getComputedStyle(phone.querySelector('.sgv-fx-canvas'));
    assert.ok(Number(fx.zIndex)>Number(end.zIndex),
      'fx z-index '+fx.zIndex+' is not above the end overlay '+end.zIndex);
    assert.ok(Number(fx.zIndex)<Number(intro.zIndex),
      'fx z-index '+fx.zIndex+' covers the NEW! overlay '+intro.zIndex);
    assert.equal(fx.pointerEvents,'none');
    assert.equal(canvas.pointerEvents,'none');
    phone.remove();

    resetStorage();
    const round=bankedLevel1();
    saveRound(round);
    const view=await mount();
    const host=view.host;
    host.style.width='390px';
    host.style.height='844px';
    const timeline=timelineOf(host.querySelector('.sgv-win-praise'));
    assert.ok(timeline);
    timeline.pause();
    timeline.time(0.90);
    const bus=host.querySelector('.sgv-fx-layer').__fxBus;
    const fxLayer=host.querySelector('.sgv-fx-layer');
    const overlay=host.querySelector('.sgv-end-overlay');
    assert.equal(bus.liveParticles(),0);
    const liveFx=win.getComputedStyle(fxLayer);
    const liveEnd=win.getComputedStyle(overlay);
    assert.ok(Number(liveEnd.zIndex)>=Number(liveFx.zIndex),
      'honey overlay z-index '+liveEnd.zIndex+' must sit on or above FX '+liveFx.zIndex);
    assert.equal(liveFx.pointerEvents,'none');
    assert.equal(win.getComputedStyle(fxLayer.querySelector('canvas')).pointerEvents,'none');
    const cta=host.querySelector('.sgv-end-cta');
    const blockers=[...host.querySelector('.sgv-phone').children].filter(node=>{
      if(node===overlay||overlay.contains(node)||node.contains(cta))return false;
      const style=win.getComputedStyle(node);
      const covers=style.position==='absolute'&&style.inset==='0';
      const z=Number(style.zIndex);
      return covers&&style.pointerEvents!=='none'&&Number.isFinite(z)&&z>=Number(liveEnd.zIndex);
    });
    assert.deepEqual(blockers.map(node=>node.className),[],
      'a full-screen layer above the card must not take the CTA tap');
    await act(async()=>{tap(cta);});
    assert.equal(host.querySelector('.sgv-end-overlay'),null);
    assert.match(host.textContent,/Level 2/);
    await view.unmount();
  });
});
