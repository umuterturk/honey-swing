import {readFile} from 'node:fs/promises';
import {register} from 'node:module';
import {Window} from 'happy-dom';

let win;
let reduced = false;
let booted = false;

function expose(name, value){
  try{Object.defineProperty(globalThis, name, {configurable:true, writable:true, value});}
  catch{/* Node already exposes a read-only global such as navigator. */}
}

export function setReduced(value){
  reduced = !!value;
}

export async function boot(){
  if(booted)return win;
  win = new Window({url:'https://honey.test/'});
  expose('window', win);
  expose('document', win.document);
  expose('navigator', win.navigator);
  expose('HTMLElement', win.HTMLElement);
  expose('SVGElement', win.SVGElement);
  expose('Element', win.Element);
  expose('Node', win.Node);
  expose('MutationObserver', win.MutationObserver);
  expose('DocumentFragment', win.DocumentFragment);
  expose('localStorage', win.localStorage);
  expose('CustomEvent', win.CustomEvent);
  expose('Event', win.Event);
  expose('MouseEvent', win.MouseEvent);
  expose('PointerEvent', win.PointerEvent);
  expose('KeyboardEvent', win.KeyboardEvent);
  expose('getComputedStyle', win.getComputedStyle.bind(win));
  expose('requestAnimationFrame', win.requestAnimationFrame.bind(win));
  expose('cancelAnimationFrame', win.cancelAnimationFrame.bind(win));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  win.matchMedia = query => ({
    matches:reduced && String(query).includes('reduce'),
    media:query, onchange:null,
    addListener(){}, removeListener(){},
    addEventListener(){}, removeEventListener(){},
    dispatchEvent(){return false;}
  });
  globalThis.matchMedia = win.matchMedia;
  const css = await readFile(new URL('../../src/casual/minimal.css', import.meta.url), 'utf8');
  const style = win.document.createElement('style');
  style.textContent = css;
  win.document.head.appendChild(style);
  register(new URL('../jsx-loader.mjs', import.meta.url));
  await import('gsap');
  booted = true;
  return win;
}

export function page(){
  return win;
}

export function accessibleName(node){
  if(!node)return '';
  const label = node.getAttribute?.('aria-label');
  if(label)return label.replace(/\s+/g, ' ').trim();
  const labelledby = node.getAttribute?.('aria-labelledby');
  if(labelledby){
    const doc = node.ownerDocument;
    return labelledby.split(/\s+/)
      .map(id => doc.getElementById(id)?.textContent || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return (node.textContent || '').replace(/\s+/g, ' ').trim();
}

export function buttons(root){
  return [...root.querySelectorAll('button')];
}

export function buttonNamed(root, name){
  const needle = name.toLowerCase();
  const all = buttons(root);
  const exact = all.find(node => {
    const accessible = accessibleName(node).toLowerCase();
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return accessible === needle || text === needle;
  });
  if(exact)return exact;
  return all.find(node => accessibleName(node).toLowerCase().includes(needle)) || null;
}

export function dialogs(root){
  return [...root.querySelectorAll('[role="dialog"]')];
}

export async function click(node){
  const {act} = await import('react');
  const view = node.ownerDocument.defaultView;
  await act(async() => {
    node.dispatchEvent(new view.PointerEvent('pointerdown', {
      bubbles:true, cancelable:true, pointerId:1
    }));
    node.dispatchEvent(new view.MouseEvent('click', {bubbles:true, cancelable:true}));
  });
}

export async function pressKey(node, key){
  const {act} = await import('react');
  const view = node.ownerDocument.defaultView;
  await act(async() => {
    node.dispatchEvent(new view.KeyboardEvent('keydown', {
      key, bubbles:true, cancelable:true
    }));
  });
}

export async function mountGame(){
  await boot();
  const {act, createElement, StrictMode} = await import('react');
  const {createRoot} = await import('react-dom/client');
  const {default:SimplifiedGame} = await import('../../src/casual/SimplifiedGame.jsx');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async() => {
    root.render(createElement(StrictMode, null, createElement(SimplifiedGame)));
  });
  return {
    host,
    async unmount(){
      await act(async() => {root.unmount();});
      host.remove();
    }
  };
}

export async function closePage(){
  if(!win)return;
  const {gsap} = await import('gsap');
  gsap.globalTimeline.clear();
  win.happyDOM.abort();
  win = null;
  booted = false;
}
