import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LevelEndScreen} from '../src/casual/levelScreens.js';
import {successPlan} from '../src/casual/presentationSequence.js';
import {
  STAR_THRESHOLDS,burstParticles,countUpDuration,displayedCount,
  flightDropletSize,flightDroplets,honeyTier,praiseFor
} from '../src/casual/starThresholds.js';
import {
  HONEY_MOTION,HONEY_TOKENS,SCOREBOARD_ART_ASPECT,applyHoneyLayout,burstDiameter,burstOffset,compositeBacking,
  contrastRatio,countFrame,fillFrame,flightEmitTime,flightOpacity,flightPosition,
  honeyLayout,honeyParticles,overflowMarks,power2Out
} from '../src/casual/honeyWin.js';
import {createFxBus} from '../src/casual/fx/fxBus.js';
import {PARTICLE_CAP} from '../src/casual/fx/particlePool.js';

const read=async path=>readFile(new URL(path,import.meta.url),'utf8');
const win=new Window({url:'https://honey.test/honey-win'});
function expose(name,value){
  try{Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});}
  catch{/* Node already exposes a read-only global such as navigator. */}
}
expose('window',win);
expose('document',win.document);
expose('navigator',win.navigator);
expose('HTMLElement',win.HTMLElement);
expose('Element',win.Element);
expose('Node',win.Node);
expose('Event',win.Event);
expose('getComputedStyle',win.getComputedStyle.bind(win));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;

const {gsap}=await import('gsap');
const {playWinCelebration}=await import('../src/casual/winMotion.js');

function rectsOverlap(a,b){
  return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}

after(()=>{
  gsap.globalTimeline.clear();
  win.happyDOM.abort();
});

test('honey intensity keeps Appendix A and praise is Nectar, Amber, Hiveful',()=>{
  assert.equal(Object.keys(STAR_THRESHOLDS).length,20);
  assert.equal(STAR_THRESHOLDS[11].target,9);
  assert.equal(STAR_THRESHOLDS[11].star2,21);
  assert.equal(STAR_THRESHOLDS[11].star3,32);
  assert.equal(STAR_THRESHOLDS[18].target,9);
  assert.equal(STAR_THRESHOLDS[18].star2,20);
  assert.equal(STAR_THRESHOLDS[18].star3,30);
  assert.notEqual(STAR_THRESHOLDS[11].star3,40);
  assert.notEqual(STAR_THRESHOLDS[18].star3,40);
  assert.equal(honeyTier(1,5),3);
  assert.equal(honeyTier(1,8),3);
  assert.equal(honeyTier(2,6),3);
  assert.equal(honeyTier(5,6),3);
  assert.equal(honeyTier(11,20),1);
  assert.equal(honeyTier(11,21),2);
  assert.equal(honeyTier(11,31),2);
  assert.equal(honeyTier(11,32),3);
  assert.equal(honeyTier(18,19),1);
  assert.equal(honeyTier(18,20),2);
  assert.equal(honeyTier(18,29),2);
  assert.equal(honeyTier(18,30),3);
  assert.equal(honeyTier(9,16),1);
  assert.equal(honeyTier(9,17),3);
  assert.equal(honeyTier(16,16),1);
  assert.equal(honeyTier(16,17),3);
  assert.equal(honeyTier(20,6),1);
  assert.equal(honeyTier(20,7),3);
  assert.notEqual(honeyTier(9,17),2);
  assert.deepEqual(praiseFor(1),{tier:1,text:'Nectar!',sound:'praise.nectar'});
  assert.deepEqual(praiseFor(2),{tier:2,text:'Amber!',sound:'praise.amber'});
  assert.deepEqual(praiseFor(3),{tier:3,text:'Hiveful!',sound:'praise.hiveful'});
  assert.equal(praiseFor(0),null);
  assert.deepEqual([flightDroplets(1),flightDroplets(2),flightDroplets(3)],[8,12,16]);
  assert.deepEqual([flightDropletSize(1),flightDropletSize(2),flightDropletSize(3)],[16,18,20]);
  assert.deepEqual([burstParticles(1),burstParticles(2),burstParticles(3)],[16,20,24]);
  assert.ok(burstParticles(3)<=24);
  assert.equal(overflowMarks(3,5,5).length,0);
  assert.equal(overflowMarks(3,6,5).length,0);
  assert.equal(overflowMarks(1,9,8).length,0);
  assert.equal(overflowMarks(2,12,8).length,0);
});

test('celebration beats are fill-first 2.0s with a 0.5s score count',()=>{
  assert.equal(HONEY_MOTION.cap,2);
  assert.equal(HONEY_MOTION.settled,1.75);
  assert.equal(HONEY_MOTION.scrim.end,0.15);
  assert.equal(HONEY_MOTION.jarEntrance.start,0.15);
  assert.equal(HONEY_MOTION.jarEntrance.end,0.35);
  assert.equal(HONEY_MOTION.fill.start,0.35);
  assert.equal(HONEY_MOTION.fill.end,1.05);
  assert.equal(HONEY_MOTION.fill.ease,'power2.out');
  assert.equal(HONEY_MOTION.praise.start,1);
  assert.equal(HONEY_MOTION.praise.underlineAt,1.08);
  assert.equal(HONEY_MOTION.count.start,1.3);
  assert.equal(HONEY_MOTION.count.duration,0.45);
  assert.equal(HONEY_MOTION.count.end,1.75);
  assert.equal(countUpDuration(),0.45);
  assert.equal(HONEY_MOTION.cta.start,1.75);
  assert.equal(HONEY_MOTION.cta.end,2);
  assert.equal(power2Out(0.5),0.875);
  assert.equal(displayedCount(0,32),0);
  assert.equal(displayedCount(0.5,5),2);
  assert.equal(displayedCount(1,32),32);
});

test('fillFrame drives the jar; countFrame drives the score and never overflows',()=>{
  assert.equal(fillFrame(0.35,32,9).percent,0);
  assert.equal(fillFrame(1.05,32,9).percent,78);
  assert.ok(fillFrame(0.7,32,9).percent>0&&fillFrame(0.7,32,9).percent<78);
  assert.equal(countFrame(1.3,32,9).shown,0);
  assert.equal(countFrame(1.75,32,9).shown,32);
  assert.equal(countFrame(1.75,32,9).overflow,0);
  assert.equal(countFrame(1.75,32,9).targetMet,true);
  assert.equal(countFrame(1.4,1500,2000).targetMet,false);
  assert.equal(overflowMarks(3,6,5).length,0);
  assert.equal(overflowMarks(1,9,8).length,0);
  for(const value of [5,32,100]){
    assert.equal(countFrame(1.3,value,value).shown,0);
    assert.ok(countFrame(1.4,value,value).shown<value);
    assert.equal(countFrame(1.75,value,value).shown,value);
    for(let step=0;step<=12;step++){
      const frame=countFrame(1.3+0.45*step/12,value,value);
      assert.equal(Number.isInteger(frame.shown),true);
      assert.ok(frame.shown>=0&&frame.shown<=value);
    }
  }
});

test('layout centers the jar and keeps scoreboard between jar and CTA',()=>{
  const small=honeyLayout(320,568,{top:0,right:0,bottom:0,left:0});
  assert.ok(Math.abs(small.jar.w-179.2)<1e-9);
  assert.ok(small.jar.h>=110);
  assert.ok(small.praise.y>=12);
  assert.ok(small.praise.y+small.praise.h<=small.jar.y);
  assert.equal(small.scoreboard.y,small.jar.y+small.jar.h+14);
  assert.ok(Math.abs(small.scoreboard.w/small.scoreboard.h-SCOREBOARD_ART_ASPECT)<1e-6);
  assert.ok(small.scoreboard.w>0);
  assert.equal(small.reset.x,260);
  assert.equal(small.reset.y,16);
  const mid=honeyLayout(390,844,{top:0,right:0,bottom:0,left:0});
  const midJarCenter=mid.jar.y+mid.jar.h/2;
  assert.ok(midJarCenter>mid.safeH*0.36&&midJarCenter<mid.safeH*0.58);
  assert.ok(mid.scoreboard.y>=mid.jar.y+mid.jar.h);
  assert.ok(mid.scoreboard.y+mid.scoreboard.h<=mid.cta.y);
  assert.ok(Math.abs(mid.scoreboard.w/mid.scoreboard.h-SCOREBOARD_ART_ASPECT)<1e-6);
  const large=honeyLayout(430,932,{top:0,right:0,bottom:0,left:0});
  assert.equal(large.jar.w,220);
  assert.equal(large.jar.h,275);
  assert.equal(large.praise.font,48);
  assert.equal(large.reset.x,370);
  assert.ok(large.praise.y>=12);
  assert.ok(large.scoreboard.y>=large.jar.y+large.jar.h);
  assert.ok(large.scoreboard.y+large.scoreboard.h<=large.cta.y);
  assert.ok(Math.abs(large.scoreboard.w/large.scoreboard.h-SCOREBOARD_ART_ASPECT)<1e-6);
  const tight=honeyLayout(320,568,{top:44,right:0,bottom:34,left:0});
  assert.equal(tight.safeH,490);
  assert.equal(tight.short,true);
  assert.ok(tight.praise.y>=44+12);
  assert.ok(tight.jar.h>=110);
  assert.ok(Math.abs(tight.scoreboard.w/tight.scoreboard.h-SCOREBOARD_ART_ASPECT)<1e-6);
  const notched=honeyLayout(390,844,{top:59,right:0,bottom:62,left:0});
  assert.ok(notched.reset.y>=59+16);
  assert.ok(notched.praise.y>=59+12);
  assert.ok(notched.scoreboard.y+notched.scoreboard.h<=notched.cta.y);
  for(const box of [small,mid,large,tight,notched]){
    const zones=[box.praise,box.jar,box.scoreboard,box.cta,box.reset];
    for(let i=0;i<zones.length;i++){
      for(let j=i+1;j<zones.length;j++){
        assert.equal(rectsOverlap(zones[i],zones[j]),false,i+' overlaps '+j);
      }
    }
    assert.ok(box.scoreboard.y+box.scoreboard.h<=box.cta.y);
    assert.ok(box.cta.h>=70);
  assert.ok(box.cta.w<=box.safeW*0.55);
  }
  const host=win.document.createElement('div');
  const applied=applyHoneyLayout(host,390,844,{top:0,right:0,bottom:0,left:0});
  assert.ok(applied);
  assert.equal(host.style.getPropertyValue('--honey-scoreboard-top'),applied.scoreboard.y+'px');
  assert.equal(host.style.getPropertyValue('--honey-scoreboard-left'),applied.scoreboard.x+'px');
  assert.equal(host.style.getPropertyValue('--honey-scoreboard-width'),applied.scoreboard.w+'px');
  assert.equal(host.style.getPropertyValue('--honey-scoreboard-height'),applied.scoreboard.h+'px');
  assert.ok(host.style.getPropertyValue('--honey-jar-width'));
});

test('praise and count contrast clear 4.5:1 on the composited backing',()=>{
  const backing=compositeBacking();
  for(const hex of ['#fff0cf','#f0c14a','#ffe08a']){
    assert.ok(contrastRatio(hex,backing)>=4.5,hex+' '+contrastRatio(hex,backing));
  }
  assert.ok(contrastRatio(HONEY_TOKENS.glassRim,backing.scrim)>=3);
  assert.equal(HONEY_TOKENS.scrimOpacity,1);
  assert.equal(HONEY_TOKENS.backingOpacity,0);
});

test('flight and lip burst follow the honey paths and droplet sizes',()=>{
  assert.equal(flightEmitTime(0,8),0.1);
  assert.equal(flightEmitTime(7,8),0.16);
  assert.equal(flightOpacity(0.02),0.5);
  assert.equal(flightOpacity(0.1),1);
  assert.ok(Math.abs(flightOpacity(0.28)-0.5)<1e-9);
  const source={x:40,y:100};
  const mouth={x:160,y:220};
  const start=flightPosition(0,source,mouth);
  const end=flightPosition(1,source,mouth);
  assert.equal(start.x,source.x);
  assert.equal(start.y,source.y);
  assert.equal(end.x,mouth.x);
  assert.equal(end.y,mouth.y);
  assert.equal(start.control.y,52);
  const lifted=0.25*source.y+0.5*start.control.y+0.25*mouth.y;
  assert.ok(lifted<(source.y+mouth.y)/2);
  const burst=burstOffset(0,12,1,48);
  const theta=Math.PI*0.5/12;
  assert.ok(Math.abs(burst.x-Math.cos(theta)*48)<1e-9);
  assert.ok(Math.abs(burst.y-24)<1e-9);
  assert.equal(burst.opacity,0);
  assert.equal(burstOffset(1,12,0.25,64).opacity,1);
  assert.deepEqual([burstDiameter(0),burstDiameter(1),burstDiameter(2),burstDiameter(3)],[22,28,34,22]);
  const flying=honeyParticles({t:0.2,tier:3,scale:1,source,mouth});
  assert.equal(flying.length,16);
  assert.equal(flying[0].diameter,20);
  assert.equal(flying.every(particle=>particle.event==='honey-flight'),true);
  assert.equal(honeyParticles({t:0.5,tier:3,scale:1,source,mouth}).length,0);
  const lip=honeyParticles({t:1.15,tier:1,scale:1,source,mouth});
  assert.equal(lip.length,16);
  assert.equal(lip[0].diameter,22);
  const places=lip.map(particle=>particle.x.toFixed(3)+','+particle.y.toFixed(3));
  const velocities=lip.map(particle=>particle.vx.toFixed(4)+','+particle.vy.toFixed(4));
  assert.equal(new Set(places).size,lip.length);
  assert.equal(new Set(velocities).size,lip.length);
  for(const particle of lip){
    assert.ok(Math.hypot(particle.vx,particle.vy)>0);
    assert.ok(Math.hypot(particle.x-mouth.x,particle.y-mouth.y)>1);
  }
  assert.equal(honeyParticles({t:1.15,tier:3,scale:0.5,source,mouth}).length,12);
  assert.equal(honeyParticles({t:0.2,tier:3,scale:0,source,mouth}).length,0);
  assert.equal(honeyParticles({t:1.8,tier:3,scale:1,source,mouth}).length,0);
});

test('the win plan times match the honey overrides and a loss stays quiet',()=>{
  const winPlan=successPlan({victory:true,levelId:4,secured:11,bank:true});
  assert.equal(winPlan.star,null);
  assert.equal(winPlan.tier,1);
  assert.equal(winPlan.praise.text,'Nectar!');
  assert.equal(winPlan.flight.count,8);
  assert.equal(winPlan.flight.size,16);
  assert.equal(winPlan.burst.particles,16);
  assert.equal(winPlan.burst.start,1.05);
  assert.equal(winPlan.count.duration,0.45);
  assert.equal(winPlan.count.ease,'power2.out');
  assert.equal(winPlan.count.start,1.3);
  assert.equal(winPlan.count.end,1.75);
  assert.equal(winPlan.settled,1.75);
  assert.equal(winPlan.ctaEmphasis.end,2);
  assert.equal(winPlan.cap,2);
  assert.equal(HONEY_MOTION.scrim.end,0.15);
  assert.equal(HONEY_MOTION.foliage.end,0.25);
  assert.equal(HONEY_MOTION.foliage.fromY,12);
  assert.equal(winPlan.ctaAt,0);
  assert.equal(winPlan.pour.end,0.65);
  assert.equal(winPlan.orchard,null);
  const chapter=successPlan({victory:true,levelId:12,secured:41});
  assert.equal(chapter.cta,'LOWER ORCHARD');
  assert.equal(chapter.tier,3);
  assert.equal(chapter.flight.size,20);
  const lost=successPlan({victory:false,levelId:11,secured:32,bank:true});
  assert.equal(lost.effects,false);
  assert.equal(lost.tier,0);
  assert.equal(lost.praise,null);
  assert.equal(lost.particles,0);
  assert.equal(lost.flight,null);
  assert.equal(lost.star,null);
  const reduced=successPlan({victory:true,levelId:1,secured:8,reduced:true});
  assert.equal(reduced.motion,false);
  assert.equal(reduced.particles,0);
  assert.equal(reduced.flight.count,0);
  assert.equal(reduced.tier,3);
  assert.equal(reduced.settled,0);
});

function stage({score=32,target=9}={}){
  const overlay=document.createElement('div');
  overlay.className='sgv-end-overlay sgv-honey-win';
  const scrim=document.createElement('div');
  scrim.className='sgv-honey-scrim';
  const praise=document.createElement('p');
  praise.className='sgv-win-praise';
  praise.textContent='Hiveful!';
  const hero=document.createElement('div');
  hero.className='sgv-chest-art sgv-honey-hero-art';
  const liquid=document.createElement('div');
  liquid.className='sgv-fluid-fill';
  const surface=document.createElement('span');
  surface.className='sgv-fluid-surface';
  const gleam=document.createElement('span');
  gleam.className='sgv-honey-gleam-sweep';
  liquid.append(surface);
  hero.append(liquid,gleam);
  const board=document.createElement('div');
  board.className='sgv-honey-scoreboard';
  const tally=document.createElement('p');
  tally.className='sgv-win-tally';
  const targetRow=document.createElement('p');
  targetRow.className='sgv-honey-scoreboard-target';
  targetRow.textContent='Target: '+target;
  board.append(tally,targetRow);
  const cta=document.createElement('button');
  cta.type='button';
  cta.className='sgv-end-cta';
  cta.textContent='NEXT';
  overlay.append(scrim,praise,hero,board,cta);
  return {
    overlay,scrim,praise,hero,liquid,surface,gleam,board,tally,targetRow,cta,score,target,
    overflow:null,subline:null,remove(){overlay.remove();}
  };
}

function play(stageNodes,{secured=32,target=9,tier=3,reduced=false,bus,schedule,doc}={}){
  return playWinCelebration({
    victory:true,secured,target,tier,
    praise:stageNodes.praise,tally:stageNodes.tally,
    scoreboard:stageNodes.board,targetRow:stageNodes.targetRow,
    liquid:stageNodes.liquid,scrim:stageNodes.scrim,
    cta:stageNodes.cta,card:stageNodes.overlay,reduced,bus,schedule,doc,
    sourcePoint:{x:20,y:40},mouthPoint:{x:120,y:180}
  });
}

function assertFinal(nodes,secured){
  assert.equal(nodes.tally.textContent,String(secured));
  assert.equal(nodes.praise.style.opacity,'1');
  assert.equal(nodes.praise.textContent,'Hiveful!');
  assert.doesNotMatch(nodes.praise.style.transform||'',/scale\(0/);
  assert.equal(nodes.liquid.style.height,'78%');
  if(nodes.hero)assert.equal(nodes.hero.style.transform,'none');
  if(nodes.gleam)assert.equal(nodes.gleam.style.opacity,'0');
  assert.equal(nodes.scrim.style.opacity,'1');
  assert.equal(nodes.cta.disabled,false);
  assert.ok(nodes.targetRow.classList.contains('is-met'));
  assert.equal(nodes.overlay.classList.contains('sgv-honey-final'),true);
}

test('droplet and burst origins are layer-local CSS pixels',()=>{
  const layer=document.createElement('div');
  layer.className='sgv-fx-layer';
  const source=document.createElement('div');
  const mouth=document.createElement('div');
  const box=(left,top,width,height)=>({
    left,top,x:left,y:top,width,height,right:left+width,bottom:top+height
  });
  layer.getBoundingClientRect=()=>box(35,60,320,568);
  source.getBoundingClientRect=()=>box(135,80,40,20);
  mouth.getBoundingClientRect=()=>box(175,260,10,10);
  const mouthOrigin={x:180-35,y:265-60};
  const nodes=stage();
  const bus=createFxBus({reducedMotion:()=>false});
  const handle=playWinCelebration({
    victory:true,secured:32,target:9,tier:1,
    praise:nodes.praise,tally:nodes.tally,
    scoreboard:nodes.board,targetRow:nodes.targetRow,
    liquid:nodes.liquid,cta:nodes.cta,card:nodes.overlay,
    source,mouth,layer,reduced:false,bus
  });
  handle.timeline.pause();
  handle.timeline.time(0.1);
  assert.equal(bus.pool.live().some(particle=>particle.event==='honey-flight'),false);
  handle.timeline.time(0.5);
  const mid=Number.parseFloat(nodes.liquid.style.height);
  assert.ok(mid>0&&mid<78,String(mid));
  handle.timeline.time(1.05);
  assert.equal(nodes.liquid.style.height,'78%');
  handle.timeline.time(1.2);
  assert.equal(bus.pool.live().some(particle=>particle.event==='win-burst'),false);
  handle.cancel();
  nodes.remove();
});

test('a skipped or killed celebration paints the final jar, praise, and score',()=>{
  const nodes=stage();
  const bus=createFxBus({reducedMotion:()=>false});
  const handle=play(nodes,{bus});
  assert.equal(handle.motion,true);
  assert.equal(handle.timeline.totalDuration(),2);
  handle.timeline.pause();
  handle.timeline.time(0.05);
  assert.notEqual(nodes.tally.textContent,'32');
  assert.notEqual(nodes.praise.style.opacity,'1');
  bus.settle();
  assertFinal(nodes,32);
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  assert.equal(gsap.getTweensOf(nodes.praise).length,0);
  handle.cancel();
  assertFinal(nodes,32);
  nodes.remove();
});

test('fill leads, then Hiveful, then score count, with NEXT at 1.75s',()=>{
  const nodes=stage();
  const sounds=[];
  const bus=createFxBus({
    reducedMotion:()=>false,
    audio:{play(id){sounds.push(id);return false;}}
  });
  let settled=false;
  const handle=playWinCelebration({
    victory:true,secured:32,target:9,tier:3,
    praise:nodes.praise,tally:nodes.tally,
    scoreboard:nodes.board,targetRow:nodes.targetRow,
    liquid:nodes.liquid,scrim:nodes.scrim,cta:nodes.cta,card:nodes.overlay,
    reduced:false,bus,sourcePoint:{x:20,y:40},mouthPoint:{x:120,y:180},
    onSettled(){settled=true;}
  });
  handle.timeline.pause();
  handle.timeline.time(0);
  assert.equal(nodes.tally.textContent,'0');
  assert.equal(nodes.liquid.style.height,'0%');
  handle.timeline.time(0.5);
  assert.equal(nodes.tally.textContent,'0');
  const midFill=Number.parseFloat(nodes.liquid.style.height);
  assert.ok(midFill>0&&midFill<78,String(midFill));
  handle.timeline.time(1.05);
  assert.equal(nodes.liquid.style.height,'78%');
  assert.equal(nodes.tally.textContent,'0');
  handle.timeline.time(1.5);
  const midScore=Number(nodes.tally.textContent);
  assert.ok(midScore>0&&midScore<32,String(midScore));
  handle.timeline.time(1.75);
  assert.equal(nodes.tally.textContent,'32');
  assert.ok(nodes.targetRow.classList.contains('is-met'));
  assert.equal(nodes.cta.disabled,false);
  assert.equal(settled,true);
  assert.equal(bus.liveParticles(),0);
  assert.ok(bus.liveParticles()<=PARTICLE_CAP);
  let peak=0;
  handle.timeline.time(0);
  for(let step=100;step<=122;step++){
    handle.timeline.time(step/100);
    peak=Math.max(peak,Number(gsap.getProperty(nodes.praise,'scale'))||0);
  }
  assert.ok(peak<=1.14+1e-6);
  assert.ok(sounds.includes('praise.hiveful'));
  assert.equal(sounds.includes('fx.confetti'),false);
  nodes.remove();
});

test('reduced motion is the static final card with 0 particles',()=>{
  const nodes=stage({score:18,target:11});
  nodes.praise.textContent='Amber!';
  let scheduled=0;
  const bus=createFxBus({reducedMotion:()=>false});
  const handle=play(nodes,{
    secured:18,target:11,tier:2,reduced:true,bus,
    schedule(){scheduled+=1;return 0;}
  });
  assert.equal(handle.motion,false);
  assert.equal(handle.timeline,null);
  assert.equal(scheduled,0);
  assert.equal(bus.liveParticles(),0);
  assert.equal(bus.tweenCount(),0);
  assert.equal(nodes.tally.textContent,'18');
  assert.equal(nodes.praise.style.opacity,'1');
  assert.equal(nodes.liquid.style.height,'78%');
  assert.ok(nodes.targetRow.classList.contains('is-met'));
  assert.equal(gsap.getTweensOf(nodes.praise).length,0);
  nodes.remove();
});

test('a fail plays no praise, jar, count-up, or particles',()=>{
  const nodes=stage();
  nodes.tally.textContent='untouched';
  const bus=createFxBus({reducedMotion:()=>false});
  const handle=playWinCelebration({
    victory:false,secured:21,target:11,tier:2,
    praise:nodes.praise,tally:nodes.tally,liquid:nodes.liquid,bus
  });
  assert.equal(handle.motion,false);
  assert.equal(handle.timeline,null);
  assert.equal(bus.liveParticles(),0);
  assert.equal(nodes.tally.textContent,'untouched');
  assert.equal(nodes.liquid.style.transform||'','');
  nodes.remove();
});

test('degrade, overlap, hidden tab, and the hard cap keep the final card',()=>{
  const nodes=stage();
  const bus=createFxBus({reducedMotion:()=>false});
  for(let n=0;n<20;n++)bus.pool.spawn({event:'action',owner:'action'});
  const handle=play(nodes,{bus,tier:3,secured:100,target:30});
  handle.timeline.pause();
  for(let n=0;n<8;n++)bus.budget.sample(21);
  assert.equal(bus.budget.scale(),0.5);
  handle.timeline.time(0.9);
  assert.ok(bus.liveParticles()<=PARTICLE_CAP);
  assert.ok(bus.liveParticles()<=20+12);
  for(let n=0;n<8;n++)bus.budget.sample(21);
  assert.equal(bus.budget.scale(),0);
  handle.timeline.time(0.91);
  const honey=bus.pool.live().filter(particle=>particle.owner==='honey-win');
  assert.equal(honey.length,0);
  assert.equal(nodes.praise.textContent,'Hiveful!');
  assert.equal(nodes.cta.disabled,false);
  const doc={
    visibilityState:'visible',
    addEventListener(type,fn){this.fn=fn;},
    removeEventListener(){this.fn=null;}
  };
  const hidden=stage();
  hidden.praise.textContent='Hiveful!';
  const hiddenBus=createFxBus({reducedMotion:()=>false});
  const hiddenHandle=play(hidden,{bus:hiddenBus,doc});
  hiddenHandle.timeline.pause();
  hiddenHandle.timeline.time(0.05);
  doc.visibilityState='hidden';
  doc.fn();
  assertFinal(hidden,32);
  assert.equal(hiddenBus.liveParticles(),0);
  const capped=stage();
  let fire=null;
  const capBus=createFxBus({reducedMotion:()=>false});
  const capHandle=play(capped,{
    bus:capBus,
    schedule(fn,ms){
      assert.equal(ms,2000);
      fire=fn;
      return 7;
    }
  });
  capHandle.timeline.pause();
  capHandle.timeline.time(0.05);
  assert.equal(typeof fire,'function');
  fire();
  assertFinal(capped,32);
  assert.equal(capBus.tweenCount(),0);
  nodes.remove();
  hidden.remove();
  capped.remove();
});

test('win and fail markup have no star nodes and the win jar is not a button',()=>{
  const won=renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:true,score:32,target:9,label:'NEXT',
    praise:{tier:3,text:'Hiveful!'},onReset(){}
  }));
  assert.match(won,/Hiveful!/);
  assert.doesNotMatch(won,/NECTAR!/);
  assert.match(won,/score-board\.png/);
  assert.match(won,/Honey Collected/);
  assert.match(won,/victory-slogan-underline\.png/);
  assert.match(won,/victory-slogan-side-drops-left\.png/);
  assert.match(won,/sgv-honey-slogan-drops-right/);
  assert.match(won,/sgv-honey-slogan-drops-art/);
  assert.match(won,/Target:\s*9/);
  assert.doesNotMatch(won,/sgv-honey-confetti|sgv-confetti|sgv-honey-subline|sgv-honey-mark|sgv-honey-count-slot/);
  assert.doesNotMatch(won,/sgv-peri-spark|sgv-glass-spark/);
  assert.match(won,/sgv-honey-idle-stars/);
  assert.match(won,/sgv-honey-idle-star-a/);
  assert.doesNotMatch(won,/Sweet!|Tasty!|Divine!/);
  assert.match(won,/32 honey secured\. Target 9\./);
  assert.match(won,/empty-complete-jar\.png/);
  assert.match(won,/empty-front-jar\.png/);
  assert.match(won,/sgv-jar-mask sgv-jar-honey-layer/);
  assert.match(won,/sgv-jar-mask sgv-jar-lights/);
  assert.match(won,/sgv-honey-internal-light/);
  assert.match(won,/sgv-honey-reflection/);
  assert.match(won,/sgv-honey-gleam-sweep/);
  assert.match(won,/sgv-honey-warm-light/);
  assert.match(won,/sgv-honey-foliage-rear/);
  assert.match(won,/sgv-honey-foliage-front/);
  assert.match(won,/celebration\/bush-long-1\.png/);
  assert.match(won,/celebration\/bush-big\.png/);
  assert.match(won,/celebration\/green-plant-1\.png/);
  assert.match(won,/celebration\/daisy-1\.png/);
  assert.doesNotMatch(won,/celebration\/waterfall/);
  assert.doesNotMatch(won,/celebration\/bush-biggest/);
  assert.match(won,/sgv-fluid-fill/);
  assert.match(won,/sgv-fluid-surface/);
  assert.match(won,/sgv-honey-cta-wrap/);
  assert.match(won,/sgv-end-cta/);
  assert.match(won,/sgv-honey-cta-stars/);
  assert.match(won,/sgv-honey-cta-star-a/);
  assert.match(won,/>NEXT</);
  assert.match(won,/sgv-honey-reset/);
  assert.match(won,/aria-label="Reset progress"/);
  assert.match(won,/↺/);
  assert.doesNotMatch(won,/RESET PROGRESS/);
  assert.match(won,/Level complete!/);
  assert.doesNotMatch(won,/sgv-win-star|data-star|★|aria-label="[^"]*star/i);
  assert.doesNotMatch(won,/<button[^>]*sgv-honey-jar|sgv-honey-jar[^>]*<button/);
  const exact=renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:true,score:5,target:5,label:'NEXT',settled:true,
    praise:{tier:3,text:'Hiveful!'}
  }));
  assert.doesNotMatch(exact,/sgv-honey-mark/);
  assert.match(exact,/sgv-honey-scoreboard-target is-met/);
  const over=renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:true,score:8,target:5,label:'NEXT',
    praise:{tier:3,text:'Hiveful!'}
  }));
  assert.doesNotMatch(over,/sgv-honey-mark/);
  const lost=renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:false,score:2,target:8,label:'TRY AGAIN'
  }));
  assert.match(lost,/Try again!/);
  assert.match(lost,/>TRY AGAIN</);
  assert.match(lost,/Drops secured: 2 \/ 8/);
  assert.doesNotMatch(lost,/sgv-win-praise|sgv-win-star|sgv-honey-jar|sgv-win-tally|Sweet!|Tasty!|Divine!|★/);
});

test('honey styles are scoped under the end card and FX stays between the card and NEW!',async()=>{
  const css=await read('../src/casual/minimal.css');
  const motion=await read('../src/casual/winMotion.js');
  const screens=await read('../src/casual/levelScreens.js');
  const engines=await read('../src/external/engines.js');
  assert.match(css,/\.sgv-end-card \.sgv-win-praise/);
  assert.match(css,/\.sgv-end-card \.sgv-win-tally/);
  assert.match(css,/\.sgv-honey-scoreboard\{/);
  assert.match(css,/--honey-scoreboard-top/);
  assert.match(css,/object-fit:\s*contain/);
  assert.match(css,/\.sgv-honey-slogan-drops-right\{[^}]*scaleX\(-1\)/);
  assert.match(css,/\.sgv-honey-slogan-drops-art\{/);
  assert.match(css,/\.sgv-honey-scoreboard \.sgv-win-tally\{[^}]*top:\s*28\.6%;[^}]*height:\s*27\.4%/s);
  assert.match(css,/aspect-ratio:\s*1398\/584/);
  assert.match(css,/--honey-scrim-opacity/);
  assert.match(css,/sgv-fluid-surface/);
  assert.match(css,/mask-position:\s*50% 50%/);
  assert.match(css,/-webkit-mask-position:\s*50% 50%/);
  assert.match(css,/\.sgv-jar-mask\{/);
  assert.match(css,/transform-origin:\s*50% 50%/);
  assert.match(css,/transform:\s*translateY\(7%\) scale\(0\.82\)/);
  assert.match(css,/linear-gradient\(180deg,\s*#fff8c8 0%,\s*#ffe08a 14%,\s*#ffc83d 36%,\s*#ff9d0a 62%,\s*#f07800 100%\)/);
  assert.match(css,/#fff8c866/);
  assert.match(css,/#9d4e0022/);
  assert.match(css,/#fff06a66/);
  assert.match(css,/#fffdf0/);
  assert.match(css,/#f49a00/);
  assert.match(css,/0 0 18px #ffd56acc/);
  assert.match(css,/\.sgv-jar-front\{[^}]*opacity:\s*\.78/);
  assert.match(css,/rotate\(-14deg\)/);
  assert.match(css,/\.sgv-honey-reflection\{[^}]*width:\s*18%/);
  assert.match(css,/\.sgv-honey-gleam-sweep\{[^}]*width:\s*28%/s);
  assert.match(css,/0 0 70px #fff6d8cc/);
  assert.match(css,/0 0 28px #ffe9a099/);
  assert.match(css,/\.sgv-honey-hero-art::before\{/);
  assert.match(css,/@keyframes sgv-honey-idle-twinkle/);
  assert.match(css,/\.sgv-honey-idle-star\{/);
  assert.match(motion,/duration:\s*0\.9/);
  assert.match(motion,/sgv-honey-slogan-drops-art/);
  assert.doesNotMatch(motion,/scaleX:\s*-1/);
  assert.match(css,/rgba\(9,\s*34,\s*43,\s*\.44\)/);
  assert.match(css,/transparent 24%/);
  assert.match(css,/rgba\(9,\s*34,\s*43,\s*\.44\) 68%/);
  assert.match(css,/rgba\(0,\s*0,\s*0,\s*\.24\)/);
  assert.match(css,/rgba\(0,\s*0,\s*0,\s*\.18\)/);
  assert.match(css,/\.sgv-honey-warm-light\{[^}]*radial-gradient/s);
  assert.doesNotMatch(screens,/celebration\/waterfall/);
  assert.match(css,/width:\s*112%/);
  assert.match(css,/left:\s*-6%/);
  assert.match(css,/brightness\(\.62\) saturate\(\.8\)/);
  assert.match(css,/brightness\(\.86\) saturate\(\.95\)/);
  assert.match(css,/\.sgv-cele-bush-big\{[^}]*width:\s*34%/);
  assert.match(css,/\.sgv-cele-plant\{[^}]*width:\s*28%/);
  assert.match(css,/0 4px 12px #f0a51f66/);
  assert.match(css,/font-family:"Lilita One"/);
  assert.match(css,/stroke-width:14/);
  assert.match(screens,/sgv-praise-arc/);
  assert.match(css,/left:\s*var\(--honey-focus-x/);
  assert.match(screens,/score-board\.png/);
  assert.match(screens,/Honey Collected/);
  assert.match(screens,/victory-slogan-underline\.png/);
  assert.match(screens,/sgv-honey-slogan-drops-art/);
  assert.doesNotMatch(screens,/sgv-confetti|dx:-168|sgv-honey-subline/);
  assert.match(css,/sgv-fluid-bubble[\s\S]{0,90}display:none/);
  assert.match(css,/height:44px;min-height:44px;min-width:44px/);
  assert.match(css,/\.sgv-honey-reset:focus-visible/);
  assert.match(motion,/HONEY_MOTION\.scrim/);
  assert.match(motion,/HONEY_MOTION\.foliage/);
  assert.doesNotMatch(screens,/NECTAR!/);
  assert.doesNotMatch(motion,/flightCount:flightDroplets/);
  assert.match(motion,/burstCount:0/);
  assert.doesNotMatch(css,/\.sgv-win-star|\.sgv-success-star|sgv-win-stars/);
  assert.doesNotMatch(screens,/sgv-win-star|★/);
  assert.doesNotMatch(motion,/sgv-win-star|★/);
  assert.doesNotMatch(engines,/honeyWin|honeyTier|Sweet!/);
  const style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);
  const card=document.createElement('div');
  card.className='sgv-end-card';
  card.innerHTML=[
    '<p class="sgv-win-praise sgv-win-praise-1">Sweet!</p>',
    '<p class="sgv-win-praise sgv-win-praise-2">Tasty!</p>',
    '<p class="sgv-win-praise sgv-win-praise-3">Divine!</p>',
    '<p class="sgv-win-tally">32</p>',
    '<p class="sgv-end-score">kept</p>'
  ].join('');
  document.body.appendChild(card);
  const sweet=win.getComputedStyle(card.querySelector('.sgv-win-praise-1'));
  const tasty=win.getComputedStyle(card.querySelector('.sgv-win-praise-2'));
  const divine=win.getComputedStyle(card.querySelector('.sgv-win-praise-3'));
  const tally=win.getComputedStyle(card.querySelector('.sgv-win-tally'));
  const score=win.getComputedStyle(card.querySelector('.sgv-end-score'));
  assert.equal(sweet.fontSize,'36px');
  assert.equal(sweet.fontWeight,'900');
  assert.equal(sweet.color,'#fff0cf');
  assert.equal(tasty.color,'#f0c14a');
  assert.equal(divine.color,'#ffe08a');
  assert.equal(tally.fontSize,'64px');
  assert.equal(tally.fontWeight,'900');
  assert.equal(tally.color,'#f0c14a');
  assert.match(String(tally.fontVariantNumeric),/tabular-nums/);
  assert.notEqual(score.fontSize,sweet.fontSize);
  assert.equal(score.color,'#8b6954');
  const phone=document.createElement('div');
  phone.className='sgv-phone';
  phone.innerHTML=[
    '<div class="sgv-fx-layer"><canvas class="sgv-fx-canvas"></canvas></div>',
    '<div class="sgv-end-overlay"></div>',
    '<div class="sgv-feature-intro"></div>'
  ].join('');
  document.body.appendChild(phone);
  const fx=win.getComputedStyle(phone.querySelector('.sgv-fx-layer'));
  const end=win.getComputedStyle(phone.querySelector('.sgv-end-overlay'));
  const intro=win.getComputedStyle(phone.querySelector('.sgv-feature-intro'));
  assert.equal(fx.zIndex,'35');
  assert.equal(intro.zIndex,'40');
  assert.ok(Number(fx.zIndex)>Number(end.zIndex));
  assert.ok(Number(fx.zIndex)<Number(intro.zIndex));
  assert.equal(fx.pointerEvents,'none');
  card.remove();
  phone.remove();
  style.remove();
});

test('the win scrim, glass jar, and reset icon are styled before any tween',async()=>{
  const css=await read('../src/casual/minimal.css');
  const style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);
  const host=document.createElement('div');
  host.className='sgv-phone sgv-onboarding';
  host.setAttribute('data-honey-win','true');
  host.innerHTML='<header class="sgv-hud"></header>'+renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:true,score:8,target:5,label:'NEXT',
    praise:{tier:3,text:'Hiveful!'},onReset(){}
  }));
  document.body.appendChild(host);
  const scrim=win.getComputedStyle(host.querySelector('.sgv-honey-scrim'));
  const overlay=win.getComputedStyle(host.querySelector('.sgv-honey-win'));
  assert.ok(scrim.opacity==='1'||scrim.opacity==='1.0');
  assert.equal(scrim.backdropFilter,'none');
  assert.ok(host.querySelector('.sgv-honey-warm-light'));
  assert.ok(overlay.backgroundColor==='transparent'||overlay.backgroundColor==='rgba(0, 0, 0, 0)');
  assert.equal(overlay.backdropFilter,'none');
  assert.ok(host.querySelector('.sgv-jar-back'));
  assert.ok(host.querySelector('.sgv-jar-front'));
  assert.ok(host.querySelector('.sgv-jar-honey-layer.sgv-jar-mask'));
  assert.ok(host.querySelector('.sgv-jar-lights.sgv-jar-mask'));
  assert.ok(host.querySelector('.sgv-fluid-surface'));
  const honeyMask=win.getComputedStyle(host.querySelector('.sgv-jar-honey-layer'));
  const lightMask=win.getComputedStyle(host.querySelector('.sgv-jar-lights'));
  assert.match(String(honeyMask.maskImage||honeyMask.webkitMaskImage),/honey-fill-mask/);
  assert.equal(honeyMask.maskImage,lightMask.maskImage);
  assert.equal(honeyMask.webkitMaskImage,lightMask.webkitMaskImage);
  assert.equal(win.getComputedStyle(host.querySelector('.sgv-honey-warm-light')).pointerEvents,'none');
  assert.equal(win.getComputedStyle(host.querySelector('.sgv-honey-foliage-rear')).pointerEvents,'none');
  assert.equal(win.getComputedStyle(host.querySelector('.sgv-hud')).visibility,'hidden');
  const reset=host.querySelector('.sgv-honey-reset');
  const resetStyle=win.getComputedStyle(reset);
  assert.equal(resetStyle.height,'44px');
  assert.equal(resetStyle.minHeight,'44px');
  assert.equal(resetStyle.minWidth,'44px');
  assert.equal(resetStyle.borderTopWidth,'2px');
  assert.equal(resetStyle.fontSize,'15px');
  assert.equal(reset.getAttribute('aria-label'),'Reset progress');
  assert.match(reset.textContent,/Reset/);
  const board=host.querySelector('.sgv-honey-scoreboard');
  const boardStyle=win.getComputedStyle(board);
  assert.equal(boardStyle.position,'absolute');
  assert.match(String(boardStyle.aspectRatio||''),/1398\s*\/\s*584|2\.39/);
  const art=win.getComputedStyle(host.querySelector('.sgv-honey-scoreboard-art'));
  assert.equal(art.objectFit,'fill');
  assert.match(art.maxWidth,/100%/);
  const tallyStyle=win.getComputedStyle(host.querySelector('.sgv-win-tally'));
  assert.match(tallyStyle.color,/#5a2d7a|rgb\(90,\s*45,\s*122\)/);
  assert.match(tallyStyle.top,/28\.6%/);
  const fill=win.getComputedStyle(host.querySelector('.sgv-fluid-fill'));
  assert.match(fill.backgroundImage,/#fff8c8|#ffe08a|#ffc83d|#ff9d0a|#f07800/i);
  const surface=win.getComputedStyle(host.querySelector('.sgv-fluid-surface'));
  assert.equal(surface.height,'14px');
  assert.notEqual(surface.backgroundImage,'none');
  assert.match(win.getComputedStyle(host.querySelector('.sgv-jar-front')).opacity,/^0?\.78$/);
  const praise=win.getComputedStyle(host.querySelector('.sgv-honey-praise-slot'));
  assert.ok(praise.backgroundColor===''||praise.backgroundColor==='transparent'||praise.backgroundColor==='rgba(0, 0, 0, 0)');
  assert.match(praise.top,/safe-top\) \+ 12px|12px/);
  assert.match(resetStyle.top,/safe-top\) \+ 16px|16px/);
  assert.match(resetStyle.right,/safe-right\) \+ 16px|16px/);
  assert.ok(host.querySelector('.sgv-honey-slogan-drops-right'));
  assert.ok(host.querySelector('.sgv-honey-slogan-drops-art'));
  assert.ok(host.querySelector('.sgv-honey-slogan-underline'));
  assert.match(
    win.getComputedStyle(host.querySelector('.sgv-honey-slogan-drops-right')).transform,
    /matrix\(-1|scaleX\(-1\)/
  );
  host.remove();
  style.remove();
});

test('particle flight and the brief settle burst never overlap in the pool',()=>{
  const source={x:40,y:100};
  const mouth={x:160,y:220};
  const colors=new Set(['#ff4d7d','#ffd24a','#6ec8ff','#c9a0ff','#ffa24a','#5ee0a8']);
  const shapes=new Set(['circle','rect']);
  let overlap=false;
  let peak=0;
  for(let step=0;step<=30;step++){
    const list=honeyParticles({t:step/10,tier:3,scale:1,source,mouth});
    peak=Math.max(peak,list.length);
    assert.ok(list.length<=40);
    const flight=list.some(particle=>particle.event==='honey-flight');
    const confetti=list.some(particle=>particle.event==='win-burst');
    if(flight&&confetti)overlap=true;
  }
  assert.equal(overlap,false);
  assert.ok(peak>=16&&peak<=24);
  const pieces=honeyParticles({t:1.15,tier:3,scale:1,source,mouth});
  assert.equal(pieces.length,24);
  assert.equal(pieces.every(particle=>shapes.has(particle.shape)),true);
  assert.equal(pieces.every(particle=>colors.has(particle.color)),true);
  assert.equal(pieces.some(particle=>particle.shape==='circle'),true);
  assert.equal(pieces.some(particle=>particle.shape==='rect'),true);
  assert.equal(pieces.some(particle=>particle.shape==='drop'),false);
  assert.equal(honeyParticles({t:1.8,tier:3,scale:1,source,mouth}).length,0);
});

test('the fill bobs, the gleam sweeps, and jar entrance overshoots then settles',()=>{
  const nodes=stage();
  const body=document.createElement('div');
  body.className='sgv-chest-body';
  body.style.width='220px';
  nodes.gleam.style.width='56px';
  nodes.hero.insertBefore(body,nodes.liquid);
  const bus=createFxBus({reducedMotion:()=>false});
  const handle=play(nodes,{bus,tier:3,secured:32,target:9});
  handle.timeline.pause();
  let low=0;
  let high=0;
  for(let step=0;step<=70;step++){
    handle.timeline.time(0.35+0.7*step/70);
    const bob=Number(String(nodes.surface.style.transform).replace(/[^\d.-]/g,''))||0;
    low=Math.min(low,bob);
    high=Math.max(high,bob);
  }
  assert.ok(low<=-2.9,String(low));
  assert.ok(high>=2.9,String(high));
  handle.timeline.time(1.0);
  handle.timeline.time(1.2);
  const peakGleam=Number(nodes.gleam.style.opacity||0);
  assert.ok(peakGleam>0,nodes.gleam.style.opacity);
  assert.match(nodes.gleam.style.transform||'',/matrix|translate/);
  handle.timeline.time(1.9);
  assert.ok(Number(nodes.gleam.style.opacity||0)<=peakGleam+1e-6);
  let peak=1;
  for(let step=15;step<=35;step++){
    handle.timeline.time(step/100);
    peak=Math.max(peak,Number(gsap.getProperty(nodes.hero,'scale'))||1);
  }
  assert.ok(peak>1&&peak<=1.03+1e-6);
  handle.timeline.time(1.1);
  assert.equal(bus.liveParticles(),0);
  handle.cancel();
  assert.equal(nodes.hero.style.transform,'none');
  assert.equal(nodes.surface.style.transform,'none');
  assert.equal(nodes.gleam.style.opacity,'0');
  assert.equal(bus.liveParticles(),0);
  nodes.remove();
});

test('scrim darkens in 150ms and foliage settles in 250ms, then skip paints the final card',()=>{
  const nodes=stage();
  const rear=document.createElement('div');
  rear.className='sgv-honey-foliage-rear';
  const front=document.createElement('div');
  front.className='sgv-honey-foliage-front';
  nodes.overlay.append(rear,front);
  const handle=play(nodes,{tier:3,secured:5,target:5});
  handle.timeline.pause();
  handle.timeline.time(0);
  assert.ok(Number(nodes.scrim.style.opacity||0)<0.2);
  assert.ok(Number(rear.style.opacity||0)<0.2);
  handle.timeline.time(0.15);
  assert.ok(Math.abs(Number(nodes.scrim.style.opacity)-1)<0.05,nodes.scrim.style.opacity);
  handle.timeline.time(0.25);
  assert.ok(Math.abs(Number(rear.style.opacity)-1)<0.05,rear.style.opacity);
  assert.ok(Math.abs(Number(front.style.opacity)-1)<0.05,front.style.opacity);
  handle.cancel();
  assertFinal(nodes,5);
  assert.equal(rear.style.opacity,'1');
  assert.equal(rear.style.transform,'none');
  assert.equal(front.style.opacity,'1');
  nodes.remove();
});

test('reduced motion keeps a static jar with no bob, gleam, pop, or confetti',()=>{
  const nodes=stage();
  const bus=createFxBus({reducedMotion:()=>false});
  const handle=play(nodes,{reduced:true,bus,tier:3,secured:32,target:9});
  assert.equal(handle.motion,false);
  assert.equal(bus.liveParticles(),0);
  assert.equal(nodes.hero.style.transform,'none');
  assert.equal(nodes.surface.style.transform,'none');
  assert.equal(nodes.gleam.style.opacity,'0');
  assert.equal(gsap.getTweensOf(nodes.hero).length,0);
  nodes.remove();
});
