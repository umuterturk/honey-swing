import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {honeyParticles} from '../src/casual/honeyWin.js';

function layerLocalCenter(node, layer){
  const rect = node.getBoundingClientRect();
  const origin = layer.getBoundingClientRect();
  return {
    x:rect.left + rect.width / 2 - origin.left,
    y:rect.top + rect.height / 2 - origin.top
  };
}

function firstBurst(mouth){
  for(let step = 0; step <= 40; step++){
    const list = honeyParticles({
      t:step / 20,
      tier:1,
      scale:1,
      source:{x:12, y:18},
      mouth
    }).filter(particle => particle.event === 'win-burst');
    if(list.length)return list;
  }
  return [];
}

test('confetti originates at the jar lip', () => {
  const win = new Window();
  const layer = win.document.createElement('div');
  const mouth = win.document.createElement('span');
  layer.getBoundingClientRect = () => ({
    left:35, top:60, width:320, height:568, x:35, y:60, right:355, bottom:628
  });
  mouth.getBoundingClientRect = () => ({
    left:175, top:260, width:10, height:10, x:175, y:260, right:185, bottom:270
  });
  const lip = layerLocalCenter(mouth, layer);
  const burst = firstBurst(lip);
  assert.ok(burst.length > 0, 'a win emits confetti');
  for(const piece of burst){
    assert.ok(Math.hypot(piece.x - lip.x, piece.y - lip.y) < 1,
      'first confetti sits on the lip, not a fixed point');
    assert.ok(Math.hypot(piece.x - 12, piece.y - 18) > 1);
  }
  mouth.getBoundingClientRect = () => ({
    left:245, top:220, width:10, height:10, x:245, y:220, right:255, bottom:230
  });
  const moved = layerLocalCenter(mouth, layer);
  const shifted = firstBurst(moved);
  assert.ok(shifted.length > 0);
  for(const piece of shifted){
    assert.ok(Math.hypot(piece.x - moved.x, piece.y - moved.y) < 1);
  }
  assert.ok(Math.hypot(moved.x - lip.x, moved.y - lip.y) > 1);
});
