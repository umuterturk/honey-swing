import test from 'node:test';
import assert from 'node:assert/strict';
import {publicUrl} from '../src/casual/publicUrl.js';

test('publicUrl never emits a host-root absolute path',()=>{
  const tap=publicUrl('honey-tap.png');
  assert.equal(tap.startsWith('/'),false);
  assert.match(tap,/honey-tap\.png$/);
  assert.match(publicUrl('/celebration/daisy-2.png'),/celebration\/daisy-2\.png$/);
});
