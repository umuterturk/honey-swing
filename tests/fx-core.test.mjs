import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {gsap} from 'gsap';
import {createParticlePool,PARTICLE_CAP} from '../src/casual/fx/particlePool.js';
import {createFxBus,FX_TWEEN_CAP} from '../src/casual/fx/fxBus.js';
import {play} from '../src/casual/services/audio.js';

register('./jsx-loader.mjs',import.meta.url);
const {FxLayer}=await import('../src/casual/fx/FxLayer.jsx');
import {pulse} from '../src/casual/services/haptics.js';
import {createActionPresentation,runPresentedAction} from '../src/casual/actionPresentation.js';
import {newOnboardingRound,onboardingActions} from '../src/casual/onboardingLevels.js';

const read=async path=>readFile(new URL(path,import.meta.url),'utf8');

function fakeRoot(){
  const names=new Set();
  return {
    classList:{
      add(...items){for(const item of items)names.add(item);},
      remove(...items){for(const item of items)names.delete(item);},
      contains(item){return names.has(item);}
    }
  };
}

after(()=>{
  gsap.globalTimeline.clear();
});

test('the particle pool never exceeds 40 live particles',()=>{
  assert.equal(PARTICLE_CAP,40);
  const pool=createParticlePool();
  const spawned=[];
  for(let n=0;n<100;n++)spawned.push(pool.spawn({n}));
  assert.equal(pool.liveCount(),40);
  assert.ok(pool.liveCount()<=40);
  assert.equal(spawned[0].alive,false);
  assert.equal(spawned[59].alive,false);
  assert.equal(spawned[60].alive,true);
  assert.equal(spawned[99].alive,true);
  assert.deepEqual(pool.live().map(particle=>particle.n),[...Array(40)].map((_,index)=>index+60));
  pool.drain();
  assert.equal(pool.liveCount(),0);
  const bus=createFxBus({pool,reducedMotion:()=>false});
  bus.emit({particles:80});
  assert.equal(bus.liveParticles(),40);
  bus.emit({particles:25});
  assert.equal(bus.liveParticles(),40);
  bus.emit({particles:-4});
  bus.emit({particles:Number.NaN});
  assert.equal(bus.liveParticles(),40);
  bus.settle();
});

test('settle leaves 0 live particles and tweens',()=>{
  const bus=createFxBus({reducedMotion:()=>false});
  const root=fakeRoot();
  bus.attach(root);
  assert.equal(bus.emitDev({particles:9,tween:true}).emitted,false);
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  const first=bus.emit({particles:6,tween:true,flash:'cream',shake:true});
  const second=bus.emit({particles:4,tween:true});
  const externalTarget={p:0};
  const external=gsap.timeline();
  external.to(externalTarget,{p:1,duration:0.5});
  bus.register(external);
  assert.equal(bus.liveParticles(),10);
  assert.equal(bus.tweenCount(),3);
  assert.equal(bus.queued(),2);
  assert.equal(gsap.getTweensOf(first.target).length,1);
  assert.equal(gsap.getTweensOf(second.target).length,1);
  assert.equal(gsap.getTweensOf(externalTarget).length,1);
  assert.equal(root.classList.contains('sgv-fx-flash'),true);
  assert.equal(root.classList.contains('sgv-fx-flash-cream'),true);
  assert.equal(root.classList.contains('sgv-fx-shake'),true);
  bus.settle();
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  assert.equal(bus.queued(),0);
  assert.equal(gsap.getTweensOf(first.target).length,0);
  assert.equal(gsap.getTweensOf(second.target).length,0);
  assert.equal(gsap.getTweensOf(externalTarget).length,0);
  assert.equal(root.classList.contains('sgv-fx-flash'),false);
  assert.equal(root.classList.contains('sgv-fx-flash-cream'),false);
  assert.equal(root.classList.contains('sgv-fx-shake'),false);
  bus.settle();
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  const again=bus.emit({particles:3,tween:true});
  assert.equal(bus.liveParticles(),3);
  assert.equal(bus.tweenCount(),1);
  bus.settle();
  assert.equal(bus.liveParticles(),0);
  assert.equal(gsap.getTweensOf(again.target).length,0);
});

test('skip during a synthetic emit clears particles, tweens, and flash',()=>{
  const bus=createFxBus({reducedMotion:()=>false});
  const root=fakeRoot();
  bus.attach(root);
  const presentation=createActionPresentation({fx:bus});
  const round=newOnboardingRound(1);
  const action=onboardingActions(round).find(entry=>entry.type==='steer');
  let settled=0;
  const result=runPresentedAction(round,action,presentation,{
    onCommit(){
      bus.emit({
        particles:8,tween:true,flash:true,shake:true,sound:'fx.card',haptic:'light'
      });
    },
    onSettle(){settled++;},
    startMotion(){return ()=>{};}
  });
  assert.equal(result.status,'presenting');
  assert.equal(bus.liveParticles(),8);
  assert.equal(bus.tweenCount(),1);
  assert.equal(root.classList.contains('sgv-fx-flash'),true);
  assert.equal(root.classList.contains('sgv-fx-shake'),true);
  const emitted=bus.emit({particles:2,tween:true});
  assert.equal(presentation.acceptPointerDown(),'skip');
  assert.equal(settled,1);
  assert.equal(presentation.isPresenting(),false);
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  assert.equal(bus.queued(),0);
  assert.equal(gsap.getTweensOf(emitted.target).length,0);
  assert.equal(root.classList.contains('sgv-fx-flash'),false);
  assert.equal(root.classList.contains('sgv-fx-shake'),false);
  assert.equal(presentation.finishPresentation(),false);
  assert.equal(bus.liveParticles(),0);
});

test('abandon during a synthetic emit clears fx and does not install the action',()=>{
  const bus=createFxBus({reducedMotion:()=>false});
  const presentation=createActionPresentation({fx:bus});
  const round=newOnboardingRound(1);
  const action=onboardingActions(round).find(entry=>entry.type==='steer');
  let settled=0;
  runPresentedAction(round,action,presentation,{
    onCommit(){bus.emit({particles:5,tween:true,flash:true,shake:true});},
    onSettle(){settled++;},
    startMotion(){return ()=>{};}
  });
  assert.equal(presentation.abandon(),true);
  assert.equal(settled,0);
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  assert.equal(bus.queued(),0);
  bus.emit({particles:3,tween:true});
  assert.equal(presentation.abandon(),false);
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
});

test('a reduced-motion emit creates 0 particles',()=>{
  const root=fakeRoot();
  let played=0;
  let pulsed=0;
  const bus=createFxBus({
    reducedMotion:()=>true,
    audio:{play(){played++;return true;}},
    haptics:{pulse(){pulsed++;return true;}}
  });
  bus.attach(root);
  const result=bus.emit({
    particles:40,tween:true,flash:'cream',shake:true,sound:'fx.bank',haptic:'light'
  });
  assert.equal(result.emitted,false);
  assert.equal(result.particles,0);
  assert.equal(result.tween,null);
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  assert.equal(bus.queued(),0);
  assert.equal(played,0);
  assert.equal(pulsed,0);
  assert.equal(root.classList.contains('sgv-fx-flash'),false);
  assert.equal(root.classList.contains('sgv-fx-shake'),false);
  const target={p:0};
  const timeline=gsap.timeline();
  timeline.to(target,{p:1,duration:0.5});
  assert.equal(bus.register(timeline),null);
  assert.equal(gsap.getTweensOf(target).length,0);
  assert.equal(bus.tweenCount(),0);
  assert.equal(bus.emitDev({particles:12,tween:true}).emitted,false);
  assert.equal(bus.liveParticles(),0);
});

test('fx-owned tweens never exceed 24',()=>{
  assert.equal(FX_TWEEN_CAP,24);
  const bus=createFxBus({reducedMotion:()=>false});
  const emitted=[];
  for(let index=0;index<30;index++)emitted.push(bus.emit({tween:true,particles:0}));
  assert.equal(bus.tweenCount(),24);
  assert.equal(gsap.getTweensOf(emitted[0].target).length,0);
  assert.equal(gsap.getTweensOf(emitted[5].target).length,0);
  assert.equal(gsap.getTweensOf(emitted[6].target).length,1);
  assert.equal(gsap.getTweensOf(emitted[29].target).length,1);
  bus.settle();
  assert.equal(bus.tweenCount(),0);
  assert.equal(gsap.getTweensOf(emitted[29].target).length,0);
});

test('audio and haptics do nothing when unavailable and never block settle',()=>{
  assert.equal(play('fx.snap'),false);
  assert.equal(play(''),false);
  assert.equal(pulse('medium'),false);
  assert.equal(pulse(''),false);
  let calls=0;
  const bus=createFxBus({
    reducedMotion:()=>false,
    audio:{play(){calls++;throw new Error('no output');}},
    haptics:{pulse(){calls++;throw new Error('no vibrator');}}
  });
  assert.doesNotThrow(()=>bus.emit({
    particles:1,tween:true,sound:'fx.snap',haptic:'medium'
  }));
  assert.equal(calls,2);
  assert.equal(bus.liveParticles(),1);
  assert.doesNotThrow(()=>bus.settle());
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
});

test('the fx layer is a pointer-events none overlay beside the garden',async()=>{
  const html=renderToStaticMarkup(createElement(FxLayer,{bus:createFxBus()}));
  assert.match(html,/class="sgv-fx-layer"/);
  assert.match(html,/aria-hidden="true"/);
  assert.match(html,/<canvas[^>]*class="sgv-fx-canvas"/);
  const css=await read('../src/casual/minimal.css');
  assert.match(css,/\.sgv-fx-layer\{[^}]*pointer-events:none/);
  assert.match(css,/\.sgv-fx-canvas\{[^}]*pointer-events:none/);
  const source=await read('../src/casual/SimplifiedGame.jsx');
  assert.match(source,/<GardenScene\/>\s*<FxLayer bus=\{fxRef\.current\}\/>/);
  assert.doesNotMatch(source,/flipLandingBand|sgv-flip-band/);
});

test('finish, skip, abandon, startLevel, and level change settle the fx bus',async()=>{
  const presentation=await read('../src/casual/actionPresentation.js');
  const finish=presentation.slice(presentation.indexOf('function finishPresentation'),
    presentation.indexOf('function abandon'));
  const abandon=presentation.slice(presentation.indexOf('function abandon'),
    presentation.indexOf('function begin'));
  assert.match(finish,/fx\?\.settle\(\)/);
  assert.match(abandon,/fx\?\.settle\(\)/);
  assert.doesNotMatch(presentation,/engines\.js/);
  const source=await read('../src/casual/SimplifiedGame.jsx');
  assert.match(source,/createActionPresentation\(\{fx:fxRef\.current\}\)/);
  const start=source.slice(source.indexOf('function startLevel(id){'),
    source.indexOf('function resetProgress(){'));
  assert.match(start,/fxRef\.current\.settle\(\)/);
  assert.match(start,/presentationRef\.current\.abandon\(\)/);
  const finishPresentation=source.slice(source.indexOf('function finishPresentation(){'),
    source.indexOf('function play(action,source){'));
  assert.match(finishPresentation,/fxRef\.current\.settle\(\)/);
  assert.match(finishPresentation,/presentationRef\.current\.finishPresentation\(\)/);
  assert.match(source,/fxRef\.current\.settle\(\);\s*event\('level_start'/);
  const fx=await read('../src/casual/fx/fxBus.js');
  assert.doesNotMatch(fx,/engines\.js|createActionPresentation|setAnimating|presentation\.begin/);
  const dev=source.slice(source.indexOf('import.meta.env.DEV'),
    source.indexOf('import.meta.env.DEV')+400);
  assert.match(dev,/__swingFxEmit/);
  const header=source.slice(source.indexOf('<header className="sgv-hud sgv-tutorial-hud">'),
    source.indexOf('</header>'));
  assert.doesNotMatch(header,/import\.meta\.env\.DEV/);
  assert.match(header,/className="sgv-reset-progress"/);
});
