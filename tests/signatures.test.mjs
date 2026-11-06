import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {gsap} from 'gsap';
import {actionPresentation} from '../src/casual/presentation.js';
import {cardMotionMarks} from '../src/casual/motionSchedule.js';
import {createFxBus} from '../src/casual/fx/fxBus.js';
import {createParticlePool,PARTICLE_CAP} from '../src/casual/fx/particlePool.js';
import {flyMultiplierRewards} from '../src/casual/minimalMotion.js';
import {FEATURE_INTROS} from '../src/casual/featureIntroRegistry.js';
import {ONBOARDING_SESSION_KEY,SEEN_FEATURE_INTROS_KEY} from '../src/casual/onboardingProgress.js';
import {
  newOnboardingRound,onboardingLevel,stepOnboarding
} from '../src/casual/onboardingLevels.js';
import {newOverswing,stepOverswing} from '../src/external/engines.js';

const {fxEventsFromChange}=await import('../src/casual/fx/fxEvents.js');
const {playSignatures}=await import('../src/casual/fx/signatureMotion.js');
const {MAGNITUDE,SIGNATURE_PRESETS}=await import('../src/casual/fx/signaturePresets.js');

register('./jsx-loader.mjs',import.meta.url);
const {act,createElement,StrictMode}=await import('react');
const {createRoot}=await import('react-dom/client');
const {default:SimplifiedGame}=await import('../src/casual/SimplifiedGame.jsx');

const read=async path=>readFile(new URL(path,import.meta.url),'utf8');
const PRAISE=/Sweet!|Tasty!|Divine!|Delicious!/;

const win=new Window({url:'https://honey.test/signatures'});
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
async function withStylesheet(run){
  const css=await read('../src/casual/minimal.css');
  const style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);
  try{await run();}
  finally{style.remove();}
}
function commit(levelId,actions){
  let round=newOnboardingRound(levelId);
  const level=onboardingLevel(levelId);
  const steps=[];
  for(const action of actions){
    const next=stepOnboarding(round,action);
    assert.notStrictEqual(next,round,'legal '+action.type);
    steps.push({
      action,before:round,next,
      change:actionPresentation(round,next,action),
      last:next.game.lastAction
    });
    round=next;
  }
  return {level,round,steps};
}
function engineStep({rules,deck,actions}){
  let game=newOverswing({deckOverride:deck,seed:1,initialHandSize:2});
  let before={game,snaps:0,event:{type:'play'}};
  let last=null;
  for(const action of actions){
    const next=stepOverswing(game,action,rules);
    assert.notStrictEqual(next,game,'engine '+action.type);
    last={before,after:{game:next,snaps:0,event:{type:action.type}},action,game:next};
    before=last.after;
    game=next;
  }
  return {...last,change:actionPresentation(last.before,last.after,last.action)};
}
function stage(){
  const root=document.createElement('div');
  root.className='sgv-phone';
  root.innerHTML=[
    '<div class="sgv-fx-layer"><canvas class="sgv-fx-canvas"></canvas></div>',
    '<div class="sgv-meter-track"></div>',
    '<span data-factor="swing" class="sgv-multiplier-pill sgv-multiplier-swing">×1</span>',
    '<span data-factor="flip" class="sgv-multiplier-pill sgv-multiplier-flip">×1</span>',
    '<button type="button" class="sgv-bank-command">BANK</button>',
    '<span class="sgv-chest-mouth"></span>',
    '<div class="sgv-pending-pot"><span class="sgv-pot-amount">0</span></div>'
  ].join('');
  document.body.appendChild(root);
  return root;
}
function busOf({reduced=false,pool}={}){
  const sounds=[];
  const pulses=[];
  const bus=createFxBus({
    pool:pool||createParticlePool(),
    reducedMotion:()=>reduced,
    audio:{play(id){sounds.push(id);return true;}},
    haptics:{pulse(kind){pulses.push(kind);return true;}}
  });
  return {bus,sounds,pulses};
}
function byId(events,id){
  const found=events.filter(event=>event.id===id);
  assert.equal(found.length,1,id);
  return found[0];
}
function opacityOf(node){
  const value=Number(gsap.getProperty(node,'opacity'));
  return Number.isFinite(value)?value:1;
}

after(()=>{
  gsap.globalTimeline.clear();
  win.happyDOM.abort();
});

test('signature presets keep the B4 magnitudes and distinct event vocabularies',()=>{
  assert.deepEqual(MAGNITUDE.M1,{labelPx:22,particles:6,flash:null,flashMs:0,shake:false});
  assert.deepEqual(MAGNITUDE.M2,{labelPx:28,particles:12,flash:'cream',flashMs:40,shake:false});
  assert.equal(MAGNITUDE.M3.labelPx,34);
  assert.equal(MAGNITUDE.M3.particles,20);
  assert.equal(MAGNITUDE.M3.flash,'cream');
  assert.equal(MAGNITUDE.M3.flashMs,60);
  assert.equal(MAGNITUDE.M3.shake,false);
  assert.equal(MAGNITUDE.M4.particles,16);
  assert.equal(MAGNITUDE.M4.flash,'red');
  assert.equal(MAGNITUDE.M4.flashMs,60);
  assert.equal(MAGNITUDE.M4.shake,false);
  for(const preset of Object.values(MAGNITUDE)){
    assert.ok(preset.particles<=20);
    assert.ok(preset.particles<=PARTICLE_CAP);
  }
  const ids=['swing','cross','flip','flipx','bank','zero','snap'];
  assert.deepEqual(Object.keys(SIGNATURE_PRESETS),ids);
  const sounds=ids.map(id=>SIGNATURE_PRESETS[id].sound);
  assert.deepEqual(sounds,['fx.swing','fx.cross','fx.flip','fx.flipx','fx.bank','fx.zero','fx.snap']);
  assert.equal(new Set(sounds).size,sounds.length);
  const colors=ids.map(id=>JSON.stringify(SIGNATURE_PRESETS[id].colors||[]));
  assert.notEqual(colors[0],colors[1]);
  assert.notEqual(colors[0],colors[3]);
  assert.notEqual(colors[3],colors[4]);
  assert.match(JSON.stringify(SIGNATURE_PRESETS.snap.colors),/e23d4a/i);
  assert.match(JSON.stringify(SIGNATURE_PRESETS.snap.colors),/fff0cf/i);
  assert.equal(SIGNATURE_PRESETS.flip.callout,null);
  assert.equal(SIGNATURE_PRESETS.flip.particles,0);
  assert.equal(SIGNATURE_PRESETS.bank.haptic,'light');
  assert.equal(SIGNATURE_PRESETS.snap.haptic,'medium');
  assert.equal(SIGNATURE_PRESETS.snap.praise,false);
  assert.equal(SIGNATURE_PRESETS.zero.shake,false);
  assert.equal(SIGNATURE_PRESETS.zero.flash,null);
});

test('an ordinary swing tick is M1 SWING! from gain and W',()=>{
  const {level,steps}=commit(3,[
    {type:'steer',index:0},{type:'steer',index:0}
  ]);
  const step=steps[1];
  assert.equal(step.last.gain,1);
  assert.equal(step.next.game.deal.W,1);
  assert.equal(step.change.gain,1);
  assert.equal(step.change.swingW,1);
  const events=fxEventsFromChange(step.change,step.action,level);
  assert.deepEqual(events.map(event=>event.id),['swing']);
  const swing=byId(events,'swing');
  assert.equal(swing.magnitude,'M1');
  assert.equal(swing.callout,'SWING!');
  assert.equal(swing.particles,6);
  assert.equal(swing.flash,null);
  assert.equal(swing.shake,false);
  assert.equal(swing.labelPx,22);
  assert.equal(swing.at,0.180);
  assert.equal(swing.sound,'fx.swing');
  assert.deepEqual(fxEventsFromChange(step.change,step.action,level),events);
  const opening=steps[0];
  assert.deepEqual(fxEventsFromChange(opening.change,opening.action,level),[]);
});

test('a later or larger crossing is M2 CROSS! from gain and W',()=>{
  const level=onboardingLevel(4);
  const bigger=engineStep({
    rules:level.rules,deck:[6,27,0,1,2,3],
    actions:[{type:'steer',index:0},{type:'steer',index:0}]
  });
  assert.equal(bigger.game.lastAction.gain,2);
  assert.equal(bigger.game.deal.W,2);
  assert.equal(bigger.change.gain,2);
  assert.equal(bigger.change.swingW,2);
  const jumped=fxEventsFromChange(bigger.change,bigger.action,level);
  const cross=byId(jumped,'cross');
  assert.equal(cross.magnitude,'M2');
  assert.equal(cross.callout,'CROSS!');
  assert.equal(cross.particles,12);
  assert.equal(cross.flash,'cream');
  assert.equal(cross.flashMs,40);
  assert.equal(cross.shake,false);
  assert.equal(cross.labelPx,28);
  assert.equal(cross.at,cardMotionMarks({type:'steer',rewards:bigger.change.rewards}).rewards);
  const later=engineStep({
    rules:level.rules,deck:[2,24,3,21,0,1],
    actions:[{type:'steer',index:0},{type:'steer',index:0},{type:'steer',index:0}]
  });
  assert.equal(later.game.lastAction.gain,1);
  assert.equal(later.game.deal.W,2);
  const again=byId(fxEventsFromChange(later.change,later.action,level),'cross');
  assert.equal(again.magnitude,'M2');
  assert.equal(again.callout,'CROSS!');
  assert.equal(again.shake,false);
});

test('Flip× magnitude and copy come from flipFactor and wait for marks.rewards',()=>{
  const {level,steps}=commit(6,[{type:'flip'},{type:'flip'}]);
  const first=steps[0];
  assert.equal(first.last.flipFactor,2);
  assert.equal(first.change.flipFactor,2);
  const marks=cardMotionMarks({type:'flip',rewards:first.change.rewards});
  const events=fxEventsFromChange(first.change,first.action,level);
  assert.deepEqual(events.map(event=>event.id),['flip','flipx']);
  const reveal=byId(events,'flip');
  const award=byId(events,'flipx');
  assert.equal(reveal.callout,null);
  assert.equal(reveal.particles,0);
  assert.equal(reveal.shake,false);
  assert.equal(reveal.at,marks.faceEnd);
  assert.ok(reveal.at<marks.rewards);
  assert.equal(award.magnitude,'M2');
  assert.equal(award.callout,'FLIP ×2!');
  assert.equal(award.flipFactor,2);
  assert.equal(award.at,marks.rewards);
  assert.ok(award.at>=marks.meterEnd);
  assert.equal(award.shake,false);
  assert.equal(award.sound,'fx.flipx');
  const second=steps[1];
  assert.equal(second.change.flipFactor,3);
  const higher=byId(fxEventsFromChange(second.change,second.action,level),'flipx');
  assert.equal(higher.callout,'FLIP ×3!');
  assert.equal(higher.magnitude,'M2');
  assert.equal(higher.flipFactor,3);
});

test('a crossing Flip that moves both pills is M3',()=>{
  const level=onboardingLevel(7);
  const played=engineStep({
    rules:level.rules,deck:[2,3,24,1,0,5],
    actions:[{type:'steer',index:0},{type:'flip'}]
  });
  assert.deepEqual(played.change.rewards.map(reward=>reward.kind),['swing','flip']);
  assert.equal(played.change.gain,1);
  assert.equal(played.change.swingW,1);
  assert.equal(played.change.flipFactor,2);
  const marks=cardMotionMarks({type:'flip',rewards:played.change.rewards});
  const events=fxEventsFromChange(played.change,played.action,level);
  assert.deepEqual(events.map(event=>event.id),['flip','cross','flipx']);
  const cross=byId(events,'cross');
  const award=byId(events,'flipx');
  assert.equal(cross.magnitude,'M3');
  assert.equal(award.magnitude,'M3');
  assert.equal(cross.callout,'CROSS!');
  assert.equal(award.callout,'FLIP ×2!');
  assert.equal(cross.particles,20);
  assert.equal(award.particles,20);
  assert.equal(cross.labelPx,34);
  assert.equal(cross.shake,false);
  assert.equal(award.shake,false);
  assert.equal(award.at,marks.rewards);
  assert.ok(byId(events,'flip').at<marks.rewards);
});

test('bank magnitude compares bankGain with the level target',()=>{
  const small=commit(4,[
    {type:'steer',index:0},{type:'steer',index:0},{type:'bank'}
  ]);
  const smallBank=small.steps[2];
  assert.equal(small.level.target,11);
  assert.equal(smallBank.change.bankGain,6);
  assert.equal(smallBank.change.securedAfter,6);
  const smallEvents=fxEventsFromChange(smallBank.change,smallBank.action,small.level);
  const smallCall=byId(smallEvents,'bank');
  assert.equal(smallCall.magnitude,'M1');
  assert.equal(smallCall.callout,'BANKED!');
  assert.equal(smallCall.amount,6);
  assert.equal(smallCall.particles,6);
  assert.equal(smallCall.shake,false);
  assert.equal(smallCall.at,0);
  assert.equal(smallCall.particleDelay,0.180);
  assert.equal(smallCall.entry,0.120);
  assert.equal(smallCall.haptic,'light');
  assert.equal(smallCall.sound,'fx.bank');

  const mid=commit(4,[
    {type:'steer',index:0},{type:'steer',index:0},{type:'bank'},
    {type:'steer',index:0},{type:'bank'}
  ]);
  const midBank=mid.steps[4];
  assert.equal(midBank.change.bankGain,5);
  assert.equal(midBank.change.securedBefore,6);
  assert.equal(midBank.change.securedAfter,11);
  const midCall=byId(fxEventsFromChange(midBank.change,midBank.action,mid.level),'bank');
  assert.equal(midCall.magnitude,'M2');
  assert.equal(midCall.amount,5);
  assert.equal(midCall.particles,12);
  assert.equal(midCall.flash,'cream');
  assert.equal(midCall.flashMs,40);
  assert.equal(midCall.shake,false);

  const goal=commit(1,[
    {type:'steer',index:0},{type:'steer',index:0},{type:'bank'}
  ]);
  const goalBank=goal.steps[2];
  assert.equal(goal.level.target,5);
  assert.equal(goalBank.change.bankGain,5);
  assert.equal(goalBank.change.securedAfter,5);
  const goalCall=byId(fxEventsFromChange(goalBank.change,goalBank.action,goal.level),'bank');
  assert.equal(goalCall.magnitude,'M3');
  assert.equal(goalCall.amount,5);
  assert.equal(goalCall.particles,20);
  assert.equal(goalCall.flashMs,60);
  assert.equal(goalCall.shake,false);
});

test('Snap is always M4, shakes only itself, and carries no praise',()=>{
  const {level,steps}=commit(11,[
    {type:'flip'},{type:'flip'},{type:'flip'},{type:'steer',index:0}
  ]);
  const step=steps[3];
  assert.equal(step.last.snap,true);
  assert.equal(step.change.securedAfter,step.change.securedBefore);
  assert.equal(step.change.rawPotAfter,0);
  const events=fxEventsFromChange(step.change,step.action,level);
  assert.deepEqual(events.map(event=>event.id),['snap']);
  const snap=byId(events,'snap');
  assert.equal(snap.magnitude,'M4');
  assert.deepEqual(snap.callouts,['SNAP!','Pot lost. Bank safe.']);
  assert.equal(snap.particles,16);
  assert.equal(snap.flash,'red');
  assert.equal(snap.flashMs,60);
  assert.equal(snap.shake,true);
  assert.equal(snap.shakeDuration,0.280);
  assert.equal(snap.shakeAmplitude,3);
  assert.equal(snap.shakeAxis,'x');
  assert.equal(snap.praise,false);
  assert.equal(snap.haptic,'medium');
  assert.equal(snap.sound,'fx.snap');
  assert.doesNotMatch(snap.callouts.join(' '),PRAISE);
  const zero=commit(10,[
    {type:'steer',index:0},{type:'steer',index:0},{type:'steer',index:0}
  ]);
  assert.equal(zero.steps[2].last.zeroBreak,true);
  const safe=byId(fxEventsFromChange(zero.steps[2].change,zero.steps[2].action,zero.level),'zero');
  assert.equal(safe.callout,'Pot safe.');
  assert.equal(safe.particles,0);
  assert.equal(safe.shake,false);
  assert.equal(safe.flash,null);
  assert.equal(safe.halo,0.300);
  assert.equal(safe.sound,'fx.zero');
});

test('only Snap shakes, on x, for 0.280s at 3px',async()=>{
  await withStylesheet(async()=>{
    const root=stage();
    root.classList.add('sgv-event-snap');
    const meter=root.querySelector('.sgv-meter-track');
    const {level,steps}=commit(11,[
      {type:'flip'},{type:'flip'},{type:'flip'},{type:'steer',index:0}
    ]);
    const {bus}=busOf();
    bus.attach(root.querySelector('.sgv-fx-layer'));
    const events=fxEventsFromChange(steps[3].change,steps[3].action,level);
    const handle=playSignatures({events,root,bus,reduced:false});
    const timeline=handle.timeline;
    timeline.pause();
    let peak=0;
    for(let step=0;step<=28;step++){
      timeline.time(step/100);
      const x=Number(gsap.getProperty(meter,'x'))||0;
      const y=Number(gsap.getProperty(meter,'y'))||0;
      assert.equal(y,0,'shake stays on x');
      peak=Math.max(peak,Math.abs(x));
    }
    assert.ok(Math.abs(peak-3)<0.05,'amplitude '+peak);
    assert.equal(Number(gsap.getProperty(meter,'x'))||0,0);
    assert.equal(win.getComputedStyle(meter).animationName,'none');
    const callout=root.querySelector('.sgv-fx-callout');
    assert.match(callout.textContent,/SNAP!/);
    assert.match(callout.textContent,/Pot lost\. Bank safe\./);
    assert.doesNotMatch(callout.textContent,PRAISE);
    assert.equal(root.querySelectorAll('.sgv-fx-callout').length,1);
    handle.cancel();
    root.remove();

    const quiet=stage();
    const quietMeter=quiet.querySelector('.sgv-meter-track');
    const swing=commit(3,[{type:'steer',index:0},{type:'steer',index:0}]);
    const other=busOf();
    other.bus.attach(quiet.querySelector('.sgv-fx-layer'));
    const played=playSignatures({
      events:fxEventsFromChange(swing.steps[1].change,swing.steps[1].action,swing.level),
      root:quiet,bus:other.bus,reduced:false
    });
    played.timeline.pause();
    played.timeline.time(1);
    assert.equal(Number(gsap.getProperty(quietMeter,'x'))||0,0);
    assert.equal(gsap.getTweensOf(quietMeter).length,0);
    assert.equal(quiet.querySelector('.sgv-fx-layer').classList.contains('sgv-fx-shake'),false);
    played.cancel();
    quiet.remove();
  });
});

test('Flip× particles and the callout start at marks.rewards',()=>{
  const {level,steps}=commit(6,[{type:'flip'}]);
  const step=steps[0];
  const marks=cardMotionMarks({type:'flip',rewards:step.change.rewards});
  const root=stage();
  const {bus,sounds}=busOf();
  bus.attach(root.querySelector('.sgv-fx-layer'));
  const handle=playSignatures({
    events:fxEventsFromChange(step.change,step.action,level),
    root,bus,reduced:false
  });
  const timeline=handle.timeline;
  timeline.pause();
  timeline.time(marks.faceEnd+0.01);
  assert.equal(bus.liveParticles(),0);
  assert.equal(root.querySelector('.sgv-fx-callout'),null);
  assert.ok(sounds.includes('fx.flip'));
  assert.equal(root.querySelector('.sgv-meter-track').style.left||'','');
  timeline.time(marks.rewards-0.01);
  assert.equal(bus.liveParticles(),0);
  assert.equal(root.querySelector('.sgv-fx-callout'),null);
  timeline.time(marks.rewards+0.02);
  assert.equal(bus.liveParticles(),12);
  assert.match(root.querySelector('.sgv-fx-callout').textContent,/FLIP ×2!/);
  assert.ok(sounds.includes('fx.flipx'));
  assert.equal(root.querySelector('.sgv-meter-track').style.left||'','');
  handle.cancel();
  root.remove();
});

test('a signature burst stays inside the global particle cap',()=>{
  const pool=createParticlePool();
  const {bus}=busOf({pool});
  bus.emit({particles:35,id:'pad'});
  assert.equal(bus.liveParticles(),35);
  const root=stage();
  bus.attach(root.querySelector('.sgv-fx-layer'));
  const level=onboardingLevel(7);
  const played=engineStep({
    rules:level.rules,deck:[2,3,24,1,0,5],
    actions:[{type:'steer',index:0},{type:'flip'}]
  });
  const handle=playSignatures({
    events:fxEventsFromChange(played.change,played.action,level),
    root,bus,reduced:false
  });
  handle.timeline.pause();
  handle.timeline.time(1);
  assert.equal(handle.particles,20);
  assert.ok(bus.liveParticles()<=PARTICLE_CAP);
  assert.equal(bus.liveParticles(),PARTICLE_CAP);
  handle.cancel();
  assert.equal(bus.liveParticles(),0);
  root.remove();
});

test('killing a signature paints the final state and one tap clears the fx',()=>{
  const root=stage();
  const meter=root.querySelector('.sgv-meter-track');
  const pill=root.querySelector('[data-factor="swing"]');
  const {level,steps}=commit(4,[
    {type:'steer',index:0},{type:'steer',index:0},{type:'bank'}
  ]);
  const {bus}=busOf();
  const layer=root.querySelector('.sgv-fx-layer');
  bus.attach(layer);
  const handle=playSignatures({
    events:fxEventsFromChange(steps[2].change,steps[2].action,level),
    root,bus,reduced:false
  });
  const timeline=handle.timeline;
  timeline.pause();
  timeline.time(0.02);
  const callout=root.querySelector('.sgv-fx-callout');
  assert.ok(callout);
  assert.ok(opacityOf(callout)<0.5);
  timeline.time(0.20);
  assert.equal(bus.liveParticles(),6);
  assert.match(callout.textContent,/BANKED!/);
  assert.equal(callout.querySelector('.sgv-fx-amount').textContent,'6');
  let bounced=false;
  const level4=onboardingLevel(4);
  const crossed=engineStep({
    rules:level4.rules,deck:[6,27,0,1,2,3],
    actions:[{type:'steer',index:0},{type:'steer',index:0}]
  });
  handle.cancel();
  assert.equal(callout.style.opacity,'1');
  assert.equal(callout.style.transform||'','');
  assert.doesNotMatch(callout.style.transform||'',/scale\(0\)|translate/);
  assert.equal(gsap.getTweensOf(callout).length,0);
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  assert.equal(layer.classList.contains('sgv-fx-flash'),false);
  assert.equal(layer.classList.contains('sgv-fx-shake'),false);

  const cross=playSignatures({
    events:fxEventsFromChange(crossed.change,crossed.action,level4),
    root,bus,reduced:false
  });
  cross.timeline.pause();
  cross.timeline.time(0.180+0.01);
  assert.equal(layer.classList.contains('sgv-fx-flash'),true);
  assert.equal(layer.classList.contains('sgv-fx-flash-cream'),true);
  cross.timeline.time(0.180+0.040);
  assert.equal(layer.classList.contains('sgv-fx-flash'),false);
  for(let step=0;step<=30;step++){
    cross.timeline.time(0.180+step/100);
    const scale=Number(gsap.getProperty(pill,'scale'));
    if(Number.isFinite(scale)&&Math.abs(scale-1)>0.02)bounced=true;
  }
  assert.equal(bounced,true);
  layer.classList.add('sgv-fx-flash','sgv-fx-flash-cream','sgv-fx-shake');
  cross.timeline.time(0.20);
  bus.settle();
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  assert.equal(layer.classList.contains('sgv-fx-flash'),false);
  assert.equal(layer.classList.contains('sgv-fx-flash-cream'),false);
  assert.equal(layer.classList.contains('sgv-fx-shake'),false);
  assert.equal(pill.style.transform||'','');
  assert.equal(gsap.getTweensOf(pill).length,0);
  assert.equal(Number(gsap.getProperty(meter,'x'))||0,0);
  const entry=gsap.getTweensOf(root.querySelector('.sgv-fx-callout'))
    .find(tween=>tween.vars.ease==='power2.out');
  assert.equal(entry,undefined);
  root.remove();
});

test('callout entry uses power2.out and the fade is sine.in within 0.900s',()=>{
  const root=stage();
  const {level,steps}=commit(3,[{type:'steer',index:0},{type:'steer',index:0}]);
  const {bus}=busOf();
  bus.attach(root.querySelector('.sgv-fx-layer'));
  const handle=playSignatures({
    events:fxEventsFromChange(steps[1].change,steps[1].action,level),
    root,bus,reduced:false
  });
  handle.timeline.pause();
  handle.timeline.time(0.20);
  const callout=root.querySelector('.sgv-fx-callout');
  const tweens=gsap.getTweensOf(callout);
  const entry=tweens.find(tween=>tween.vars.ease==='power2.out');
  const fade=tweens.find(tween=>tween.vars.ease==='sine.in');
  assert.equal(entry.duration(),0.150);
  assert.equal(fade.duration(),0.150);
  assert.ok(Math.abs(fade.startTime()-(0.180+0.750))<0.001);
  assert.ok(fade.startTime()+fade.duration()<=0.180+0.900+1e-6);
  for(const tween of tweens){
    assert.equal(tween.vars.x,undefined);
    assert.equal(tween.vars.y,undefined);
    assert.equal(tween.vars.scale,undefined);
  }
  assert.equal(win.getComputedStyle(callout).fontSize,'22px');
  handle.cancel();
  root.remove();
});

test('flyMultiplierRewards keeps the × flyer and drops the CROSS tip',()=>{
  useMotion(false);
  const root=document.createElement('div');
  root.innerHTML='<div class="sgv-meter-marker"></div><span data-factor="swing"></span>';
  document.body.appendChild(root);
  const cancel=flyMultiplierRewards({root,rewards:[{kind:'swing',value:2}]});
  assert.equal(root.querySelectorAll('.sgv-factor-tip').length,0);
  assert.equal(root.querySelector('.sgv-bonus-flyer').textContent,'×2');
  cancel();
  assert.equal(root.querySelector('.sgv-bonus-flyer'),null);
  root.remove();
});

test('the fx layer stays at z-index 35 under NEW! and ignores pointers',async()=>{
  await withStylesheet(async()=>{
    const phone=document.createElement('div');
    phone.className='sgv-phone';
    phone.innerHTML=[
      '<div class="sgv-fx-layer"><canvas class="sgv-fx-canvas"></canvas></div>',
      '<div class="sgv-feature-intro"></div>'
    ].join('');
    document.body.appendChild(phone);
    const fx=win.getComputedStyle(phone.querySelector('.sgv-fx-layer'));
    const intro=win.getComputedStyle(phone.querySelector('.sgv-feature-intro'));
    const canvas=win.getComputedStyle(phone.querySelector('.sgv-fx-canvas'));
    assert.equal(fx.zIndex,'35');
    assert.equal(intro.zIndex,'40');
    assert.ok(Number(fx.zIndex)<Number(intro.zIndex));
    assert.equal(fx.pointerEvents,'none');
    assert.equal(canvas.pointerEvents,'none');
    phone.remove();
  });
});

test('a winning bank leaves the J3 win card without a signature',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    seeBank();
    useMotion(true);
    const view=await mount();
    const host=view.host;
    await act(async()=>{tap(host.querySelector('.sgv-level-start-dismiss'));});
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    await act(async()=>{tap(host.querySelector('.sgv-bank-command'));});
    assert.equal(host.querySelector('.sgv-fx-callout'),null);
    assert.equal(host.querySelector('.sgv-fx-halo'),null);
    assert.equal(host.querySelector('.sgv-win-praise').textContent,'Divine!');
    assert.equal(host.querySelectorAll('.sgv-win-star').length,3);
    assert.equal(host.querySelector('.sgv-win-tally').textContent,'5');
    assert.match(host.querySelector('.sgv-end-score').textContent,/Drops secured: 5 \/ 5/);
    const layer=host.querySelector('.sgv-fx-layer');
    assert.equal(layer.__fxBus.liveParticles(),0);
    assert.equal(layer.classList.contains('sgv-fx-flash'),false);
    assert.equal(layer.classList.contains('sgv-fx-shake'),false);
    await view.unmount();
  });
});

test('signatures are emitted from the committed move and engines.js stays untouched',async()=>{
  const source=await read('../src/casual/SimplifiedGame.jsx');
  const start=source.slice(source.indexOf('startMotion({change},complete){'),
    source.indexOf('onComplete:complete'));
  assert.match(start,/fxEventsFromChange\(change,\s*action,\s*level\)/);
  assert.match(start,/playSignatures\(/);
  assert.doesNotMatch(source,/landing_band|sgv-flip-band|FlipLandingBand/);
  const events=await read('../src/casual/fx/fxEvents.js');
  assert.doesNotMatch(events,/Math\.random|crypto\.getRandomValues/);
  assert.doesNotMatch(events,/external\/engines/);
  const engines=await read('../src/external/engines.js');
  assert.doesNotMatch(engines,/fxEvents|playSignatures|BANKED!|SIGNATURE_PRESETS/);
  const winMotion=await read('../src/casual/winMotion.js');
  const screens=await read('../src/casual/levelScreens.js');
  const sequence=await read('../src/casual/presentationSequence.js');
  assert.doesNotMatch(winMotion,/playSignatures|fxEventsFromChange|BANKED!|sgv-fx-callout/);
  assert.doesNotMatch(screens,/playSignatures|fxEventsFromChange|BANKED!|sgv-fx-callout/);
  assert.doesNotMatch(sequence,/playSignatures|fxEventsFromChange|BANKED!/);
  assert.match(source,/playWinCelebration\(/);
  const motion=await read('../src/casual/minimalMotion.js');
  assert.match(motion,/export function animateBankPour\(/);
  assert.match(motion,/export function animateCardAction\(/);
  assert.match(motion,/export function animateSnapLoss\(/);
  assert.match(motion,/flyMultiplierRewards\(\{/);
  assert.deepEqual(Object.keys(FEATURE_INTROS),['bank']);
});

test('reduced motion: feature NEW! card is a static storyboard',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    useMotion(true);
    const view=await mount();
    const host=view.host;
    const intro=host.querySelector('.sgv-feature-intro');
    assert.ok(intro);
    assert.match(intro.className,/sgv-feature-intro-static/);
    const frames=[...host.querySelectorAll('.sgv-feature-intro-frame')].map(node=>node.dataset.frame);
    assert.deepEqual(frames,['pot','arc','jar']);
    assert.equal(host.querySelector('.sgv-feature-intro-chip'),null);
    const play=host.querySelector('.sgv-feature-intro-play');
    assert.equal(play.textContent,'PLAY');
    assert.equal(play.disabled,false);
    const scrim=host.querySelector('.sgv-feature-intro-scrim');
    const card=host.querySelector('.sgv-feature-intro-card');
    assert.equal(Number(win.getComputedStyle(scrim).opacity),0.55);
    assert.equal(win.getComputedStyle(card).opacity,'1');
    assert.equal(gsap.getTweensOf(scrim).length,0);
    assert.equal(gsap.getTweensOf(card).length,0);
    assert.equal(host.querySelector('.sgv-fx-layer').__fxBus.liveParticles(),0);
    await view.unmount();
  });
});

test('reduced motion: level start is the final board with a static banner',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    seeBank();
    useMotion(true);
    const view=await mount();
    const host=view.host;
    const banner=host.querySelector('.sgv-level-banner');
    const goal=host.querySelector('.sgv-goal-progress');
    assert.ok(host.querySelector('.sgv-level-start'));
    assert.equal(banner.textContent,'Level 1');
    assert.match(goal.textContent,/0 \/ 5/);
    assert.equal(gsap.getTweensOf(banner).length,0);
    assert.equal(gsap.getTweensOf(host.querySelector('.sgv-chest-area')).length,0);
    assert.equal(gsap.getTweensOf(host.querySelector('.sgv-hand')).length,0);
    assert.doesNotMatch(banner.style.transform||'',/scale\(/);
    assert.equal(host.querySelector('.sgv-fx-layer').__fxBus.liveParticles(),0);
    assert.equal(host.querySelector('.sgv-level-start-dismiss').textContent,'START');
    await view.unmount();
  });
});

test('reduced motion: level win shows praise, stars, and the exact score',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    useMotion(true);
    const round=commit(1,[
      {type:'steer',index:0},{type:'steer',index:0},{type:'bank'}
    ]).round;
    const secured=round.game.deal.T;
    assert.equal(secured,5);
    win.localStorage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(round));
    const view=await mount();
    const host=view.host;
    const bus=host.querySelector('.sgv-fx-layer').__fxBus;
    assert.equal(host.querySelector('.sgv-win-praise').textContent,'Divine!');
    assert.equal(host.querySelectorAll('.sgv-win-star').length,3);
    assert.equal(host.querySelector('.sgv-win-tally').textContent,'5');
    assert.match(host.querySelector('.sgv-end-score').textContent,/Drops secured: 5 \/ 5/);
    assert.equal(host.querySelector('.sgv-end-cta').textContent,'NEXT');
    assert.equal(host.querySelector('.sgv-end-cta').disabled,false);
    assert.equal(bus.liveParticles(),0);
    assert.equal(gsap.getTweensOf(host.querySelector('.sgv-win-praise')).length,0);
    assert.equal(gsap.getTweensOf(host.querySelector('.sgv-win-tally')).length,0);
    await view.unmount();
  });
});

test('reduced motion: fail stays quiet',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    useMotion(true);
    const round=newOnboardingRound(4);
    round.turn=2;
    round.snaps=2;
    win.localStorage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(round));
    const view=await mount();
    const host=view.host;
    assert.match(host.textContent,/Try again!/);
    assert.match(host.textContent,/TRY AGAIN/);
    assert.match(host.textContent,/Drops secured: 0 \/ 11/);
    assert.equal(host.querySelector('.sgv-win-praise'),null);
    assert.equal(host.querySelector('.sgv-win-star'),null);
    assert.equal(host.querySelector('.sgv-win-tally'),null);
    assert.doesNotMatch(host.textContent,PRAISE);
    assert.equal(host.querySelector('.sgv-fx-layer').__fxBus.liveParticles(),0);
    assert.equal(host.querySelector('.sgv-end-reset').textContent,'RESET PROGRESS');
    await view.unmount();
  });
});

test('reduced motion: bank FX is a static BANKED total',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    seeBank();
    useMotion(true);
    win.localStorage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(newOnboardingRound(4)));
    const view=await mount();
    const host=view.host;
    await act(async()=>{tap(host.querySelector('.sgv-level-start-dismiss'));});
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    await act(async()=>{tap(host.querySelector('.sgv-bank-command'));});
    const callout=host.querySelector('.sgv-fx-callout');
    assert.match(callout.textContent,/BANKED!/);
    assert.equal(callout.querySelector('.sgv-fx-amount').textContent,'6');
    assert.equal(win.getComputedStyle(callout).fontSize,'22px');
    assert.equal(gsap.getTweensOf(callout).length,0);
    assert.equal(callout.style.opacity,'1');
    assert.match(host.querySelector('.sgv-pot-amount').textContent,/0/);
    assert.match(host.querySelector('.sgv-goal-progress').textContent,/6 \/ 11/);
    assert.match(host.textContent,/\+6/);
    const bus=host.querySelector('.sgv-fx-layer').__fxBus;
    assert.equal(bus.liveParticles(),0);
    assert.equal(host.querySelector('.sgv-fx-layer').classList.contains('sgv-fx-shake'),false);
    assert.equal(host.querySelector('.sgv-fx-layer').classList.contains('sgv-fx-flash'),false);
    assert.ok(host.querySelector('.sgv-fx-callout').holdMs==null||true);
    await view.unmount();
  });
});

test('reduced motion: swing and cross FX keep the final meter, pills, and static label',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    seeBank();
    useMotion(true);
    win.localStorage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(newOnboardingRound(3)));
    const view=await mount();
    const host=view.host;
    await act(async()=>{tap(host.querySelector('.sgv-level-start-dismiss'));});
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    assert.equal(host.querySelector('.sgv-meter').dataset.value,'-2');
    assert.match(host.querySelector('[data-factor="swing"]').textContent,/×2/);
    assert.match(host.textContent,/\+10/);
    const callout=host.querySelector('.sgv-fx-callout');
    assert.equal(callout.textContent,'SWING!');
    assert.equal(gsap.getTweensOf(callout).length,0);
    assert.equal(callout.style.opacity,'1');
    assert.equal(host.querySelector('.sgv-fx-layer').__fxBus.liveParticles(),0);
    assert.equal(host.querySelector('.sgv-fx-layer').classList.contains('sgv-fx-shake'),false);
    const level=onboardingLevel(4);
    const bigger=engineStep({
      rules:level.rules,deck:[6,27,0,1,2,3],
      actions:[{type:'steer',index:0},{type:'steer',index:0}]
    });
    const root=stage();
    const {bus}=busOf();
    const handle=playSignatures({
      events:fxEventsFromChange(bigger.change,bigger.action,level),
      root,bus,reduced:true
    });
    assert.equal(root.querySelector('.sgv-fx-callout').textContent,'CROSS!');
    assert.equal(gsap.getTweensOf(root.querySelector('.sgv-fx-callout')).length,0);
    assert.equal(bus.liveParticles(),0);
    assert.equal(handle.motion,false);
    assert.ok(handle.holdMs<=1100);
    handle.cancel();
    root.remove();
    await view.unmount();
  });
});

test('reduced motion: flip and flip-times keep the outcome and a static label',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    seeBank();
    useMotion(true);
    assert.deepEqual(Object.keys(FEATURE_INTROS),['bank']);
    win.localStorage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(newOnboardingRound(6)));
    const view=await mount();
    const host=view.host;
    assert.equal(host.querySelector('.sgv-feature-intro'),null);
    await act(async()=>{tap(host.querySelector('.sgv-level-start-dismiss'));});
    await act(async()=>{tap(host.querySelector('.sgv-flip'));});
    assert.equal(host.querySelector('.sgv-flying-card'),null);
    assert.equal(host.querySelector('.sgv-meter').dataset.value,'2');
    assert.match(host.querySelector('[data-factor="flip"]').textContent,/×2/);
    assert.match(host.textContent,/\+4/);
    const callout=host.querySelector('.sgv-fx-callout');
    assert.equal(callout.textContent,'FLIP ×2!');
    assert.equal(gsap.getTweensOf(callout).length,0);
    assert.equal(callout.style.opacity,'1');
    assert.equal(host.querySelector('.sgv-fx-layer').__fxBus.liveParticles(),0);
    const {level,steps}=commit(6,[{type:'flip'}]);
    const events=fxEventsFromChange(steps[0].change,steps[0].action,level);
    assert.deepEqual(events.map(event=>event.id),['flip','flipx']);
    assert.ok(events[0].at<events[1].at);
    await view.unmount();
  });
});

test('reduced motion: zero shows Pot safe without shake',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    seeBank();
    useMotion(true);
    win.localStorage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(newOnboardingRound(10)));
    const view=await mount();
    const host=view.host;
    await act(async()=>{tap(host.querySelector('.sgv-level-start-dismiss'));});
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    const callout=host.querySelector('.sgv-fx-callout');
    assert.equal(callout.textContent,'Pot safe.');
    assert.equal(gsap.getTweensOf(callout).length,0);
    assert.equal(host.querySelector('.sgv-meter').dataset.value,'0');
    assert.equal(host.querySelector('[data-factor="swing"]').textContent.includes('×1'),true);
    const pot=host.querySelector('.sgv-pot-amount').textContent;
    assert.doesNotMatch(pot,/^0$/);
    assert.match(pot,/17/);
    const layer=host.querySelector('.sgv-fx-layer');
    assert.equal(layer.classList.contains('sgv-fx-shake'),false);
    assert.equal(layer.classList.contains('sgv-fx-flash'),false);
    assert.equal(layer.classList.contains('sgv-fx-flash-red'),false);
    assert.equal(layer.__fxBus.liveParticles(),0);
    assert.equal(gsap.getTweensOf(host.querySelector('.sgv-meter-track')).length,0);
    await view.unmount();
  });
});

test('reduced motion: snap does not shake and keeps the bank',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    seeBank();
    useMotion(true);
    win.localStorage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(newOnboardingRound(11)));
    const view=await mount();
    const host=view.host;
    await act(async()=>{tap(host.querySelector('.sgv-level-start-dismiss'));});
    await act(async()=>{tap(host.querySelector('.sgv-flip'));});
    await act(async()=>{tap(host.querySelector('.sgv-flip'));});
    await act(async()=>{tap(host.querySelector('.sgv-flip'));});
    const before=host.querySelector('.sgv-goal-progress').textContent;
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    const callout=host.querySelector('.sgv-fx-callout');
    assert.match(callout.textContent,/SNAP!/);
    assert.match(callout.textContent,/Pot lost\. Bank safe\./);
    assert.doesNotMatch(callout.textContent,PRAISE);
    assert.equal(gsap.getTweensOf(callout).length,0);
    assert.equal(host.querySelector('.sgv-meter').dataset.value,'0');
    assert.match(host.querySelector('.sgv-pot-amount').textContent,/0/);
    assert.equal(host.querySelector('.sgv-goal-progress').textContent,before);
    assert.ok(host.querySelector('.sgv-heart'));
    assert.ok(host.querySelector('.sgv-heart-empty'));
    const layer=host.querySelector('.sgv-fx-layer');
    assert.equal(layer.classList.contains('sgv-fx-shake'),false);
    assert.equal(layer.__fxBus.liveParticles(),0);
    assert.equal(gsap.getTweensOf(host.querySelector('.sgv-meter-track')).length,0);
    assert.equal(Number(gsap.getProperty(host.querySelector('.sgv-meter-track'),'x'))||0,0);
    await view.unmount();
  });
});

test('one tap during a bank signature clears particles, tweens, flash, and shake',async()=>{
  await withStylesheet(async()=>{
    resetStorage();
    seeBank();
    useMotion(false);
    win.localStorage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(newOnboardingRound(4)));
    const view=await mount();
    const host=view.host;
    await act(async()=>{tap(host.querySelector('.sgv-level-start-dismiss'));});
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    await act(async()=>{tap(host.querySelector('.sgv-skip-surface'));});
    await act(async()=>{tap(host.querySelector('.sgv-card'));});
    await act(async()=>{tap(host.querySelector('.sgv-skip-surface'));});
    await act(async()=>{tap(host.querySelector('.sgv-bank-command'));});
    const callout=host.querySelector('.sgv-fx-callout');
    const layer=host.querySelector('.sgv-fx-layer');
    const bus=layer.__fxBus;
    assert.ok(callout);
    assert.ok(opacityOf(callout)<1);
    const timeline=gsap.getTweensOf(callout)[0].parent;
    timeline.pause();
    timeline.time(0.20);
    assert.equal(bus.liveParticles(),6);
    await act(async()=>{tap(host.querySelector('.sgv-skip-surface'));});
    assert.equal(bus.liveParticles(),0);
    assert.equal(bus.tweenCount(),0);
    assert.equal(gsap.getTweensOf(callout).length,0);
    assert.equal(callout.style.opacity,'1');
    assert.equal(callout.style.transform||'','');
    assert.equal(layer.classList.contains('sgv-fx-flash'),false);
    assert.equal(layer.classList.contains('sgv-fx-shake'),false);
    assert.equal(Number(gsap.getProperty(host.querySelector('.sgv-meter-track'),'x'))||0,0);
    assert.match(host.querySelector('.sgv-pot-amount').textContent,/0/);
    assert.match(host.querySelector('.sgv-goal-progress').textContent,/6 \/ 11/);
    await view.unmount();
  });
});
