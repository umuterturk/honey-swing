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
  HONEY_MOTION,HONEY_TOKENS,burstDiameter,burstOffset,compositeBacking,
  contrastRatio,countFrame,flightEmitTime,flightOpacity,flightPosition,
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

test('honey intensity keeps Appendix A and praise is Sweet, Tasty, Divine',()=>{
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
  assert.deepEqual(praiseFor(1),{tier:1,text:'Sweet!',sound:'praise.h1'});
  assert.deepEqual(praiseFor(2),{tier:2,text:'Tasty!',sound:'praise.h2'});
  assert.deepEqual(praiseFor(3),{tier:3,text:'Divine!',sound:'praise.h3'});
  assert.equal(praiseFor(0),null);
  assert.deepEqual([flightDroplets(1),flightDroplets(2),flightDroplets(3)],[8,12,16]);
  assert.deepEqual([flightDropletSize(1),flightDropletSize(2),flightDropletSize(3)],[16,18,20]);
  assert.deepEqual([burstParticles(1),burstParticles(2),burstParticles(3)],[12,18,24]);
  assert.ok(burstParticles(3)<=24);
  assert.equal(overflowMarks(3,5,5).length,0);
  assert.equal(overflowMarks(3,6,5).length,6);
  assert.equal(overflowMarks(1,9,8).length,2);
  assert.equal(overflowMarks(2,12,8).length,4);
});

test('count-up is a fixed 0.600s power2.out and ends on the engine integer',()=>{
  for(const value of [1,5,32,100,10**21])assert.equal(countUpDuration(value),0.6);
  assert.equal(HONEY_MOTION.count.start,0.2);
  assert.equal(HONEY_MOTION.count.end,0.8);
  assert.equal(HONEY_MOTION.count.ease,'power2.out');
  assert.equal(power2Out(0.5),0.875);
  assert.equal(displayedCount(0,32),0);
  assert.equal(displayedCount(0.5,5),2);
  assert.equal(displayedCount(1,32),32);
  assert.equal(displayedCount(1.0000000002,100),100);
  const mid=countFrame(0.5,32,9);
  assert.equal(mid.shown,28);
  assert.equal(mid.shown>0&&mid.shown<32,true);
  assert.equal(mid.fraction,1);
  assert.ok(mid.overflow>0);
  const exact=countFrame(0.5,11,11);
  assert.equal(exact.shown,9);
  assert.ok(Math.abs(exact.fraction-0.875)<1e-9);
  assert.equal(exact.overflow,0);
  for(const value of [5,32,100]){
    assert.equal(countFrame(0.2,value,value).shown,0);
    assert.ok(countFrame(0.24,value,value).shown<value);
    assert.equal(countFrame(0.8,value,value).shown,value);
    assert.equal(countFrame(0.8,value,value).fraction,1);
    for(let step=0;step<=12;step++){
      const frame=countFrame(0.2+0.6*step/12,value,value);
      assert.equal(Number.isInteger(frame.shown),true);
      assert.ok(frame.shown>=0&&frame.shown<=value);
    }
  }
});

test('layout reserves the spec slots at 320, 430, and a short safe height',()=>{
  const small=honeyLayout(320,568,{top:0,right:0,bottom:0,left:0});
  assert.equal(small.short,false);
  assert.ok(Math.abs(small.jar.w-185.6)<1e-9);
  assert.ok(Math.abs(small.jar.h-232)<1e-9);
  assert.ok(Math.abs(small.jar.x-67.2)<1e-9);
  assert.ok(Math.abs(small.jar.y-109)<1e-9);
  assert.ok(Math.abs(small.number.y-351)<1e-9);
  assert.equal(small.number.h,64);
  assert.ok(Math.abs(small.subline.y-423)<1e-9);
  assert.equal(small.subline.h,24);
  assert.ok(Math.abs(small.cta.y-496)<1e-9);
  assert.equal(small.cta.h,56);
  assert.equal(small.praise.font,36);
  assert.equal(small.number.font,40);
  assert.equal(small.subline.font,15);
  assert.ok(small.jar.h*0.8>=small.jar.h*0.4);
  const large=honeyLayout(430,932,{top:0,right:0,bottom:0,left:0});
  assert.equal(large.jar.w,200);
  assert.equal(large.jar.h,250);
  assert.equal(large.jar.x,115);
  assert.ok(Math.abs(large.jar.y-282)<1e-9);
  assert.ok(Math.abs(large.number.y-542)<1e-9);
  assert.ok(Math.abs(large.number.font-51.6)<1e-9);
  assert.equal(large.praise.font,44);
  assert.equal(large.subline.font,18);
  assert.ok(Math.abs(large.cta.y-860)<1e-9);
  const tight=honeyLayout(320,568,{top:44,right:0,bottom:34,left:0});
  assert.equal(tight.safeH,490);
  assert.equal(tight.short,true);
  assert.ok(Math.abs(tight.jar.y-(44+85))<1e-6);
  assert.ok(Math.abs(tight.jar.y+tight.jar.h-(44+317))<1e-6);
  assert.ok(Math.abs(tight.number.y-(44+325))<1e-6);
  assert.ok(Math.abs(tight.subline.y-(44+377))<1e-6);
  assert.ok(Math.abs(tight.cta.y-(44+418))<1e-6);
  for(const box of [small,large,tight]){
    const zones=[box.praise,box.jar,box.number,box.subline,box.cta,box.reset];
    for(let i=0;i<zones.length;i++){
      for(let j=i+1;j<zones.length;j++){
        assert.equal(rectsOverlap(zones[i],zones[j]),false,i+' overlaps '+j);
      }
    }
    assert.ok(box.cta.h>=56);
    assert.ok(box.reset.w>=44&&box.reset.h>=44);
  }
});

test('praise and count contrast clear 4.5:1 on the composited backing',()=>{
  const backing=compositeBacking();
  for(const hex of ['#fff0cf','#f0c14a','#ffe08a']){
    assert.ok(contrastRatio(hex,backing)>=4.5,hex+' '+contrastRatio(hex,backing));
  }
  assert.ok(contrastRatio(HONEY_TOKENS.glassRim,backing.scrim)>=3);
  assert.equal(HONEY_TOKENS.scrimOpacity,0.72);
  assert.equal(HONEY_TOKENS.backingOpacity,0.08);
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
  assert.deepEqual([burstDiameter(0),burstDiameter(1),burstDiameter(2),burstDiameter(3)],[8,10,12,8]);
  const flying=honeyParticles({t:0.2,tier:3,scale:1,source,mouth});
  assert.equal(flying.length,16);
  assert.equal(flying[0].diameter,20);
  assert.equal(flying.every(particle=>particle.event==='honey-flight'),true);
  assert.equal(honeyParticles({t:0.5,tier:3,scale:1,source,mouth}).length,0);
  const lip=honeyParticles({t:0.9,tier:1,scale:1,source,mouth});
  assert.equal(lip.length,12);
  assert.equal(lip[0].diameter,8);
  const places=lip.map(particle=>particle.x.toFixed(3)+','+particle.y.toFixed(3));
  const velocities=lip.map(particle=>particle.vx.toFixed(4)+','+particle.vy.toFixed(4));
  assert.equal(new Set(places).size,lip.length);
  assert.equal(new Set(velocities).size,lip.length);
  for(const particle of lip){
    assert.ok(Math.hypot(particle.vx,particle.vy)>0);
    assert.ok(Math.hypot(particle.x-mouth.x,particle.y-mouth.y)>1);
  }
  assert.equal(honeyParticles({t:0.9,tier:3,scale:0.5,source,mouth}).length,12);
  assert.equal(honeyParticles({t:0.2,tier:3,scale:0,source,mouth}).length,0);
  assert.equal(honeyParticles({t:1.3,tier:3,scale:1,source,mouth}).length,0);
});

test('the win plan times match the honey overrides and a loss stays quiet',()=>{
  const winPlan=successPlan({victory:true,levelId:4,secured:11,bank:true});
  assert.equal(winPlan.star,null);
  assert.equal(winPlan.tier,1);
  assert.equal(winPlan.praise.text,'Sweet!');
  assert.equal(winPlan.flight.count,8);
  assert.equal(winPlan.flight.size,16);
  assert.equal(winPlan.burst.particles,12);
  assert.equal(winPlan.burst.start,0.85);
  assert.equal(winPlan.count.duration,0.6);
  assert.equal(winPlan.count.ease,'power2.out');
  assert.equal(winPlan.subline.start,1);
  assert.equal(winPlan.subline.end,1.18);
  assert.equal(winPlan.settled,1.3);
  assert.equal(winPlan.ctaEmphasis.end,1.7);
  assert.equal(winPlan.cap,2.5);
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

function stage({score=32,target=9,over=true}={}){
  const overlay=document.createElement('div');
  overlay.className='sgv-end-overlay sgv-honey-win';
  const scrim=document.createElement('div');
  scrim.className='sgv-honey-scrim';
  const praise=document.createElement('p');
  praise.className='sgv-win-praise';
  praise.textContent='Divine!';
  const liquid=document.createElement('div');
  liquid.className='sgv-honey-liquid';
  const overflow=over?document.createElement('div'):null;
  if(overflow)overflow.className='sgv-honey-overflow';
  const tally=document.createElement('p');
  tally.className='sgv-win-tally';
  const subline=document.createElement('p');
  subline.className='sgv-honey-subline';
  subline.textContent=score+' / '+target;
  const cta=document.createElement('button');
  cta.type='button';
  cta.className='sgv-end-cta';
  cta.textContent='NEXT';
  overlay.append(scrim,praise,liquid,tally,subline,cta);
  if(overflow)overlay.append(overflow);
  document.body.append(overlay);
  return {overlay,scrim,praise,liquid,overflow,tally,subline,cta,remove(){overlay.remove();}};
}

function play(stageNodes,{secured=32,target=9,tier=3,reduced=false,bus,schedule,doc}={}){
  return playWinCelebration({
    victory:true,secured,target,tier,
    praise:stageNodes.praise,tally:stageNodes.tally,subline:stageNodes.subline,
    liquid:stageNodes.liquid,overflow:stageNodes.overflow,scrim:stageNodes.scrim,
    cta:stageNodes.cta,card:stageNodes.overlay,reduced,bus,schedule,doc,
    sourcePoint:{x:20,y:40},mouthPoint:{x:120,y:180}
  });
}

function assertFinal(nodes,secured){
  assert.equal(nodes.tally.textContent,String(secured));
  assert.equal(nodes.praise.style.opacity,'1');
  assert.equal(nodes.praise.textContent,'Divine!');
  assert.doesNotMatch(nodes.praise.style.transform||'',/scale\(0/);
  assert.match(nodes.liquid.style.transform,/scaleY\(1\)/);
  assert.equal(nodes.subline.style.opacity,'0.9');
  assert.equal(nodes.scrim.style.opacity,'0.72');
  assert.equal(nodes.cta.disabled,false);
  if(nodes.overflow){
    assert.equal(nodes.overflow.style.opacity,'1');
    assert.doesNotMatch(nodes.overflow.style.transform||'',/scale\(0/);
  }
  assert.equal(nodes.overlay.classList.contains('sgv-honey-final'),true);
}

test('a skipped or killed celebration paints the final jar, praise, and score',()=>{
  const nodes=stage();
  const bus=createFxBus({reducedMotion:()=>false});
  const handle=play(nodes,{bus});
  assert.equal(handle.motion,true);
  assert.equal(handle.timeline.totalDuration(),2.5);
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

test('the count and the jar rise together and the lip burst waits until 0.850s',()=>{
  const nodes=stage();
  const sounds=[];
  const bus=createFxBus({
    reducedMotion:()=>false,
    audio:{play(id){sounds.push(id);return false;}}
  });
  const handle=play(nodes,{bus,tier:3,secured:32,target:9});
  handle.timeline.pause();
  handle.timeline.time(0);
  assert.equal(nodes.tally.textContent,'0');
  assert.match(nodes.liquid.style.transform,/scaleY\(0\)/);
  assert.equal(nodes.cta.disabled,false);
  handle.timeline.time(0.2);
  assert.equal(nodes.tally.textContent,'0');
  handle.timeline.time(0.5);
  assert.equal(nodes.tally.textContent,'28');
  assert.match(nodes.liquid.style.transform,/scaleY\(1\)/);
  assert.equal(bus.liveParticles(),0);
  handle.timeline.time(0.8);
  assert.equal(nodes.tally.textContent,'32');
  handle.timeline.time(0.84);
  assert.equal(bus.liveParticles(),0);
  handle.timeline.time(0.9);
  assert.equal(bus.liveParticles(),24);
  assert.ok(bus.liveParticles()<=PARTICLE_CAP);
  assert.ok(bus.tweenCount()<=24);
  assert.equal(Number(nodes.subline.style.opacity)||0,0);
  handle.timeline.time(1.18);
  assert.equal(nodes.subline.style.opacity,'0.9');
  handle.timeline.time(1.3);
  assert.equal(bus.liveParticles(),0);
  let peak=0;
  handle.timeline.time(0);
  for(let step=0;step<=22;step++){
    handle.timeline.time(step/100);
    peak=Math.max(peak,Number(gsap.getProperty(nodes.praise,'scale'))||0);
  }
  assert.ok(peak<=1.14+1e-6);
  assert.ok(sounds.includes('praise.h3'));
  assert.ok(sounds.includes('win.burst'));
  nodes.remove();
});

test('reduced motion is the static final card with 0 particles',()=>{
  const nodes=stage({score:18,target:11,over:true});
  nodes.praise.textContent='Tasty!';
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
  assert.match(nodes.liquid.style.transform,/scaleY\(1\)/);
  assert.equal(nodes.subline.style.opacity,'0.9');
  assert.equal(nodes.overflow.style.opacity,'1');
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
  assert.equal(nodes.praise.textContent,'Divine!');
  assert.equal(nodes.cta.disabled,false);
  const doc={
    visibilityState:'visible',
    addEventListener(type,fn){this.fn=fn;},
    removeEventListener(){this.fn=null;}
  };
  const hidden=stage();
  hidden.praise.textContent='Divine!';
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
      assert.equal(ms,2500);
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
    praise:{tier:3,text:'Divine!'},onReset(){}
  }));
  assert.match(won,/Divine!/);
  assert.match(won,/32 honey secured\. Target 9\./);
  assert.match(won,/32 \/ 9/);
  assert.match(won,/sgv-honey-jar/);
  assert.match(won,/sgv-honey-liquid/);
  assert.match(won,/sgv-end-cta/);
  assert.match(won,/>NEXT</);
  assert.match(won,/RESET PROGRESS/);
  assert.match(won,/Level complete!/);
  assert.doesNotMatch(won,/sgv-win-star|data-star|★|aria-label="[^"]*star/i);
  assert.doesNotMatch(won,/<button[^>]*sgv-honey-jar|sgv-honey-jar[^>]*<button/);
  const exact=renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:true,score:5,target:5,label:'NEXT',
    praise:{tier:3,text:'Divine!'}
  }));
  assert.doesNotMatch(exact,/sgv-honey-mark/);
  const over=renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:true,score:8,target:5,label:'NEXT',
    praise:{tier:3,text:'Divine!'}
  }));
  assert.equal((over.match(/sgv-honey-mark/g)||[]).length,6);
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
  assert.match(css,/\.sgv-end-card \.sgv-honey-subline/);
  assert.match(css,/min\(200px,\s*58%/);
  assert.match(css,/scaleY/);
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
    '<p class="sgv-honey-subline">32 / 9</p>',
    '<p class="sgv-end-score">kept</p>'
  ].join('');
  document.body.appendChild(card);
  const sweet=win.getComputedStyle(card.querySelector('.sgv-win-praise-1'));
  const tasty=win.getComputedStyle(card.querySelector('.sgv-win-praise-2'));
  const divine=win.getComputedStyle(card.querySelector('.sgv-win-praise-3'));
  const tally=win.getComputedStyle(card.querySelector('.sgv-win-tally'));
  const sub=win.getComputedStyle(card.querySelector('.sgv-honey-subline'));
  const score=win.getComputedStyle(card.querySelector('.sgv-end-score'));
  assert.equal(sweet.fontSize,'36px');
  assert.equal(sweet.fontWeight,'900');
  assert.equal(sweet.color,'#fff0cf');
  assert.equal(tasty.color,'#f0c14a');
  assert.equal(divine.color,'#ffe08a');
  assert.equal(tally.fontSize,'40px');
  assert.equal(tally.fontWeight,'900');
  assert.equal(tally.color,'#f0c14a');
  assert.match(String(tally.fontVariantNumeric),/tabular-nums/);
  assert.equal(sub.fontSize,'15px');
  assert.equal(sub.color,'#fff0cf');
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
