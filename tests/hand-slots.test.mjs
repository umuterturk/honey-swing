import test from 'node:test';
import assert from 'node:assert/strict';
import {nextHandSlots} from '../src/casual/handSlots.js';

const cards = [
  {id:1, value:-2, order:0},
  {id:2, value:3, order:1},
  {id:3, value:1, order:2}
];

test('a fresh hand is sorted and empty sockets are closed', ()=>{
  const layout = nextHandSlots(null, cards, 4, 1);
  assert.deepEqual(layout.slots.map(slot=>slot.kind==='card'?slot.id:slot.key), [1, 3, 2, 'pad-3']);
});

test('playing a card closes that socket and leaves the others in place', ()=>{
  const laid = nextHandSlots(null, cards, 4, 1);
  const after = nextHandSlots(laid, cards.filter(card=>card.id!==3), 4, 1);
  assert.deepEqual(after.slots.map(slot=>slot.kind==='card'?slot.id:slot.key), [1, 'closed-3', 2, 'pad-3']);
});

test('a new card deals a fresh row', ()=>{
  const laid = nextHandSlots(null, cards, 4, 1);
  const refilled = nextHandSlots(laid, [{id:9, value:-1, order:0}, {id:8, value:4, order:1}], 4, 1);
  assert.deepEqual(refilled.slots.map(slot=>slot.kind==='card'?slot.id:slot.key), [9, 8, 'pad-2', 'pad-3']);
});
