import test from 'node:test';
import assert from 'node:assert/strict';
import {focusTargetAfterSkip,isSkipKey,rememberFocus} from '../src/casual/skipFocus.js';

const classes=name=> ({contains:value=>value===name});
const control=extra=>({disabled:false,isConnected:true,classList:classes(''),...extra});

test('Escape, Enter, and Space skip, and Tab does not',()=>{
  assert.equal(isSkipKey('Escape'),true);
  assert.equal(isSkipKey('Enter'),true);
  assert.equal(isSkipKey(' '),true);
  assert.equal(isSkipKey('Tab'),false);
});

test('after a skip, focus stays on a real control and never the skip surface',()=>{
  const card=control();
  const bank=control({disabled:true});
  const next=control();
  const skip=control({classList:classes('sgv-skip-surface')});
  const root={contains:node=>node===card||node===skip};
  assert.equal(rememberFocus(card,root),card);
  assert.equal(rememberFocus(skip,root),null);
  assert.equal(focusTargetAfterSkip({active:skip,previous:card,controls:[bank,next]}),card);
  assert.equal(focusTargetAfterSkip({
    active:null,previous:{...card,isConnected:false},controls:[bank,next]
  }),next);
  const reset=control();
  assert.equal(focusTargetAfterSkip({active:reset,previous:card,controls:[next]}),reset);
  assert.equal(focusTargetAfterSkip({active:null,previous:null,controls:[bank]}),null);
});
