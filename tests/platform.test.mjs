import test from 'node:test';
import assert from 'node:assert/strict';
import {browserStorage, dispatchCasualEvent, prefersReducedMotion} from '../src/casual/platform.js';

test('browserStorage returns null when window is missing', () => {
  const previous=globalThis.window;
  delete globalThis.window;
  try{
    assert.equal(browserStorage(), null);
    assert.equal(prefersReducedMotion(), false);
    assert.doesNotThrow(()=>dispatchCasualEvent('level_start', {level:1}));
  }finally{
    if(previous===undefined)delete globalThis.window;
    else globalThis.window=previous;
  }
});

test('browserStorage returns null when localStorage throws', () => {
  const previous=globalThis.window;
  globalThis.window={
    get localStorage(){throw new Error('blocked');},
    dispatchEvent(){},
    matchMedia(){return {matches:true};}
  };
  try{
    assert.equal(browserStorage(), null);
    assert.equal(prefersReducedMotion(), true);
  }finally{
    if(previous===undefined)delete globalThis.window;
    else globalThis.window=previous;
  }
});

test('dispatchCasualEvent sends swing-casual-event', () => {
  const previous=globalThis.window;
  const events=[];
  globalThis.window={
    localStorage:{getItem(){return null;}, setItem(){}},
    matchMedia(){return {matches:false};},
    dispatchEvent(event){events.push(event);}
  };
  try{
    dispatchCasualEvent('hint_shown', {level:2, turn:1});
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'swing-casual-event');
    assert.deepEqual(events[0].detail, {name:'hint_shown', level:2, turn:1});
  }finally{
    if(previous===undefined)delete globalThis.window;
    else globalThis.window=previous;
  }
});
