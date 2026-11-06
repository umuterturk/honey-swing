import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {act} from 'react';
import {createFxBus} from '../src/casual/fx/fxBus.js';
import {PARTICLE_CAP} from '../src/casual/fx/particlePool.js';
import {canvasBufferSize,createParticleCanvas} from '../src/casual/fx/particleCanvas.js';

register('./jsx-loader.mjs',import.meta.url);
const {FxLayer}=await import('../src/casual/fx/FxLayer.jsx');

const win=new Window({url:'https://honey.test/win-burst'});
function expose(name,value){
  try{Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});}
  catch{/* Node already exposes a read-only global such as navigator. */}
}
expose('window',win);
expose('document',win.document);
expose('navigator',win.navigator);
expose('HTMLElement',win.HTMLElement);
expose('HTMLCanvasElement',win.HTMLCanvasElement);
expose('Element',win.Element);
expose('Node',win.Node);
expose('MutationObserver',win.MutationObserver);
expose('requestAnimationFrame',win.requestAnimationFrame.bind(win));
expose('cancelAnimationFrame',win.cancelAnimationFrame.bind(win));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
win.localStorage.clear();

const frames=new Map();
let nextFrame=1;
function installFrames(){
  frames.clear();
  nextFrame=1;
  const request=fn=>{
    const id=nextFrame++;
    frames.set(id,fn);
    return id;
  };
  const cancel=id=>{frames.delete(id);};
  win.requestAnimationFrame=request;
  win.cancelAnimationFrame=cancel;
  globalThis.requestAnimationFrame=request;
  globalThis.cancelAnimationFrame=cancel;
}
installFrames();

function flushFrame(now=16){
  const next=frames.entries().next();
  if(next.done)return false;
  const [id,fn]=next.value;
  frames.delete(id);
  fn(now);
  return true;
}

function mockContext(){
  const calls=[];
  return {
    calls,
    clearRect(...args){calls.push(['clear', ...args]);},
    beginPath(){calls.push(['begin']);},
    arc(...args){calls.push(['arc', ...args]);},
    fill(){calls.push(['fill']);},
    save(){calls.push(['save']);},
    restore(){calls.push(['restore']);},
    set fillStyle(value){calls.push(['fillStyle', value]);},
    set globalAlpha(value){calls.push(['alpha', value]);}
  };
}

let restoreContext=null;
function installContext(ctx){
  const proto=win.HTMLCanvasElement.prototype;
  const original=proto.getContext;
  proto.getContext=function(kind){
    if(kind==='2d')return ctx;
    return original.call(this, kind);
  };
  restoreContext=()=>{proto.getContext=original; restoreContext=null;};
}

const read=async path=>readFile(new URL(path,import.meta.url),'utf8');

async function mountLayer(bus){
  const host=document.createElement('div');
  document.body.appendChild(host);
  const root=createRoot(host);
  await act(async()=>{root.render(createElement(FxLayer,{bus}));});
  return {host, async unmount(){
    await act(async()=>{root.unmount();});
    host.remove();
  }};
}

after(()=>{
  restoreContext?.();
  win.happyDOM.abort();
});

test('a win burst draws on the canvas, and settle clears it and stops the loop',async()=>{
  installFrames();
  const ctx=mockContext();
  installContext(ctx);
  const bus=createFxBus({reducedMotion:()=>false});
  const view=await mountLayer(bus);
  const canvas=view.host.querySelector('canvas');
  canvas.width=120;
  canvas.height=80;
  bus.emit({id:'win-burst',particles:80});
  assert.equal(bus.liveParticles(),PARTICLE_CAP);
  assert.equal(flushFrame(32),true);
  const arcs=ctx.calls.filter(call=>call[0]==='arc');
  const fills=ctx.calls.filter(call=>call[0]==='fill');
  assert.ok(arcs.length>0,'the win burst must draw particles');
  assert.ok(fills.length>0,'the win burst must fill those particles');
  assert.ok(arcs.length<=PARTICLE_CAP);
  assert.ok(fills.length<=PARTICLE_CAP);
  const drawn=ctx.calls.length;
  bus.settle();
  assert.equal(bus.liveParticles(),0);
  assert.ok(ctx.calls.slice(drawn).some(call=>call[0]==='clear'),'settle clears the canvas');
  assert.equal(frames.size,0,'settle stops the rAF loop');
  assert.equal(flushFrame(48),false);
  const after=ctx.calls.length;
  assert.equal(flushFrame(64),false);
  assert.equal(ctx.calls.length,after,'a stopped loop does not draw again');
  await view.unmount();
  restoreContext?.();
});

test('reduced motion emits a win burst with 0 canvas draws',async()=>{
  installFrames();
  const ctx=mockContext();
  installContext(ctx);
  const bus=createFxBus({reducedMotion:()=>true});
  const view=await mountLayer(bus);
  bus.emit({id:'win-burst',particles:24});
  assert.equal(bus.liveParticles(),0);
  assert.equal(flushFrame(32),false);
  assert.equal(ctx.calls.filter(call=>call[0]==='arc').length,0);
  assert.equal(ctx.calls.filter(call=>call[0]==='fill').length,0);
  assert.equal(frames.size,0);
  await view.unmount();
  restoreContext?.();
});

function channel(hex){
  const value=parseInt(hex.slice(1),16);
  return [(value>>16)&255,(value>>8)&255,value&255];
}
function sameColor(actual, hex){
  const text=String(actual).replace(/\s+/g,'').toLowerCase();
  const [r,g,b]=channel(hex);
  return text===hex.toLowerCase()||text===`rgb(${r},${g},${b})`||text===`rgba(${r},${g},${b},1)`;
}

test('praise tiers and the tally beat the end-card paragraph rule',async()=>{
  const css=await read('../src/casual/minimal.css');
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
    '<p class="sgv-end-score">Drops secured: 32 / 9</p>'
  ].join('');
  document.body.appendChild(card);
  const sweet=card.querySelector('.sgv-win-praise-1');
  const tasty=card.querySelector('.sgv-win-praise-2');
  const divine=card.querySelector('.sgv-win-praise-3');
  const tally=card.querySelector('.sgv-win-tally');
  const score=card.querySelector('.sgv-end-score');
  const sweetStyle=win.getComputedStyle(sweet);
  const tastyStyle=win.getComputedStyle(tasty);
  const divineStyle=win.getComputedStyle(divine);
  const tallyStyle=win.getComputedStyle(tally);
  const scoreStyle=win.getComputedStyle(score);
  assert.equal(sweetStyle.fontSize,'36px');
  assert.equal(sweetStyle.fontWeight,'900');
  assert.ok(sameColor(sweetStyle.color,'#fff0cf'),sweetStyle.color);
  assert.equal(tastyStyle.fontSize,'36px');
  assert.equal(tastyStyle.fontWeight,'900');
  assert.ok(sameColor(tastyStyle.color,'#f0c14a'),tastyStyle.color);
  assert.equal(divineStyle.fontSize,'36px');
  assert.equal(divineStyle.fontWeight,'900');
  assert.ok(sameColor(divineStyle.color,'#ffe08a'),divineStyle.color);
  assert.equal(tallyStyle.fontSize,'64px');
  assert.equal(tallyStyle.fontWeight,'900');
  assert.ok(sameColor(tallyStyle.color,'#f0c14a'),tallyStyle.color);
  assert.match(String(tallyStyle.fontVariantNumeric),/tabular-nums/);
  assert.equal(scoreStyle.fontSize,'18px');
  assert.equal(scoreStyle.fontWeight,'800');
  assert.ok(sameColor(scoreStyle.color,'#8b6954'),scoreStyle.color);
  card.remove();
  style.remove();
});

test('a burst has a real radial spread instead of one dot',async()=>{
  installFrames();
  const ctx=mockContext();
  installContext(ctx);
  const bus=createFxBus({reducedMotion:()=>false});
  const view=await mountLayer(bus);
  bus.emit({id:'win-burst',particles:12});
  assert.equal(flushFrame(16),true);
  const live=bus.pool.live();
  assert.equal(live.length,12);
  const velocities=live.map(particle=>particle.vx.toFixed(4)+','+particle.vy.toFixed(4));
  const places=live.map(particle=>particle.x.toFixed(3)+','+particle.y.toFixed(3));
  assert.equal(new Set(velocities).size,live.length);
  assert.equal(new Set(places).size,live.length);
  for(const particle of live)assert.ok(Math.hypot(particle.vx,particle.vy)>1);
  await view.unmount();
  restoreContext?.();
});

test('the fx canvas buffer tracks css size times devicePixelRatio, including resize',()=>{
  assert.deepEqual(canvasBufferSize(320,568,2),{width:640,height:1136,ratio:2});
  assert.equal(canvasBufferSize(390,844,1.5).width,Math.round(390*1.5));
  const canvas=document.createElement('canvas');
  const pool={
    live:()=>[],
    liveCount:()=>0,
    cap:40
  };
  let box={cssWidth:320,cssHeight:568,dpr:2};
  let frame=null;
  const view=createParticleCanvas({
    canvas,pool,reduced:()=>false,size:()=>box,
    requestFrame(fn){frame=fn;return 1;},
    cancelFrame(){}
  });
  view.resize();
  assert.equal(canvas.width,640);
  assert.equal(canvas.height,1136);
  box={cssWidth:430,cssHeight:932,dpr:3};
  view.resize();
  assert.equal(canvas.width,1290);
  assert.equal(canvas.height,2796);
  const ctx=mockContext();
  canvas.getContext=()=>ctx;
  pool.live=()=>[{
    alive:true,absolute:true,x:16,y:20,radius:8,opacity:1,color:'#f0c14a'
  }];
  pool.liveCount=()=>1;
  view.kick();
  assert.equal(typeof frame,'function');
  frame(16);
  const arc=ctx.calls.find(call=>call[0]==='arc');
  assert.ok(arc,'an absolute droplet is drawn');
  assert.equal(arc[1],16*3);
  assert.equal(arc[2],20*3);
  assert.equal(arc[3],8*3);
});

test('a mounted fx layer resizes its buffer with the layer and the device pixel ratio',async()=>{
  const bus=createFxBus({reducedMotion:()=>false});
  const view=await mountLayer(bus);
  const layer=view.host.querySelector('.sgv-fx-layer');
  const canvas=layer.querySelector('canvas');
  let width=320;
  let height=568;
  Object.defineProperty(layer,'clientWidth',{configurable:true,get(){return width;}});
  Object.defineProperty(layer,'clientHeight',{configurable:true,get(){return height;}});
  win.devicePixelRatio=2;
  window.dispatchEvent(new win.Event('resize'));
  assert.equal(canvas.width,640);
  assert.equal(canvas.height,1136);
  width=200;
  height=100;
  win.devicePixelRatio=2;
  window.dispatchEvent(new win.Event('resize'));
  assert.equal(canvas.width,400);
  assert.equal(canvas.height,200);
  assert.notEqual(canvas.width,300);
  assert.notEqual(canvas.height,150);
  await view.unmount();
});
