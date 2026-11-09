import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_PROGRESS_KEY, ONBOARDING_SESSION_KEY
} from '../src/casual/onboardingProgress.js';
import {commitPlay, loadSavedRound, saveRound} from '../src/casual/sessionRecords.js';

function memoryStorage(seed = {}){
  const data = {...seed};
  return {
    getItem(key){
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value){ data[key] = String(value); },
    data
  };
}

function savedRound(levelId = 2){
  return {
    levelId, turn: 1, snaps: 0, flipCount: 0, zeroBreakCount: 0,
    game: {game: 'overswing', deal: {T: 0}}
  };
}

function facts(overrides = {}){
  return {
    next: {...savedRound(3), turn: 2},
    turnBefore: 1,
    action: {type: 'steer', index: 0},
    change: {signedCard: -3, snap: false, zeroBreak: false, bankGain: 0, rewards: []},
    levelId: 3,
    levelCount: 20,
    won: false,
    ...overrides
  };
}

test('loadSavedRound returns a valid saved round', () => {
  const storage = memoryStorage({
    [ONBOARDING_SESSION_KEY]: JSON.stringify(savedRound(4))
  });
  assert.deepEqual(loadSavedRound(storage, 20), savedRound(4));
});

test('loadSavedRound rejects a missing, broken, or out-of-range session', () => {
  assert.equal(loadSavedRound(null, 20), null);
  assert.equal(loadSavedRound(memoryStorage(), 20), null);
  const broken = memoryStorage({[ONBOARDING_SESSION_KEY]: '{'});
  assert.equal(loadSavedRound(broken, 20), null);
  const high = memoryStorage({
    [ONBOARDING_SESSION_KEY]: JSON.stringify(savedRound(21))
  });
  assert.equal(loadSavedRound(high, 20), null);
  const bare = memoryStorage({
    [ONBOARDING_SESSION_KEY]: JSON.stringify({...savedRound(2), game: {game: 'overswing'}})
  });
  assert.equal(loadSavedRound(bare, 20), null);
});

test('saveRound writes the session key and swallows a storage throw', () => {
  const storage = memoryStorage();
  const round = savedRound(2);
  assert.equal(saveRound(storage, round), true);
  assert.equal(storage.data[ONBOARDING_SESSION_KEY], JSON.stringify(round));
  const failing = {setItem(){ throw new Error('full'); }};
  assert.equal(saveRound(failing, round), false);
  assert.equal(saveRound(null, round), false);
});

test('commitPlay saves an ordinary steer as card_play and leaves progress alone', () => {
  const storage = memoryStorage({[ONBOARDING_PROGRESS_KEY]: '3'});
  const play = facts();
  const result = commitPlay(storage, play);
  assert.equal(result.saved, true);
  assert.equal(result.unlockedLevel, null);
  assert.equal(storage.data[ONBOARDING_PROGRESS_KEY], '3');
  assert.equal(storage.data[ONBOARDING_SESSION_KEY], JSON.stringify(play.next));
  assert.deepEqual(result.events, [{
    name: 'card_play', level: 3, turn: 2, card: -3,
    snap: false, zeroBreak: false, bankGain: 0
  }]);
});

test('commitPlay reports the first action, snap, zero break, and each factor', () => {
  const storage = memoryStorage();
  const play = facts({
    turnBefore: 0,
    action: {type: 'bank'},
    change: {
      signedCard: null, snap: true, zeroBreak: true, bankGain: 4,
      rewards: [{kind: 'swing', value: 2}, {kind: 'flip', value: 3}]
    }
  });
  const names = commitPlay(storage, play).events.map(entry => entry.name);
  assert.deepEqual(names, [
    'bank', 'first_action', 'snap', 'zero_break', 'factor_changed', 'factor_changed'
  ]);
  const factors = commitPlay(storage, play).events.filter(entry => entry.name === 'factor_changed');
  assert.deepEqual(factors, [
    {name: 'factor_changed', level: 3, kind: 'swing', value: 2},
    {name: 'factor_changed', level: 3, kind: 'flip', value: 3}
  ]);
});

test('commitPlay unlocks the next level on a win and the cap on the last level', () => {
  const mid = memoryStorage();
  const midResult = commitPlay(mid, facts({won: true, levelId: 3, levelCount: 20}));
  assert.equal(midResult.unlockedLevel, 4);
  assert.equal(mid.data[ONBOARDING_PROGRESS_KEY], '4');
  assert.deepEqual(midResult.events.map(entry => entry.name), ['card_play', 'level_complete']);
  assert.equal(midResult.events[1].actions, 2);

  const last = memoryStorage();
  const next = {...savedRound(20), turn: 6};
  const lastResult = commitPlay(last, facts({
    won: true, levelId: 20, levelCount: 20, next
  }));
  assert.equal(lastResult.unlockedLevel, 20);
  assert.equal(last.data[ONBOARDING_PROGRESS_KEY], '20');
  assert.deepEqual(lastResult.events.map(entry => entry.name), [
    'card_play', 'level_complete', 'onboarding_complete'
  ]);
  assert.deepEqual(lastResult.events[2], {name: 'onboarding_complete'});
});

test('commitPlay still returns the win events when the progress write throws', () => {
  const storage = {
    getItem(){ return null; },
    setItem(key){
      if(key === ONBOARDING_PROGRESS_KEY) throw new Error('full');
    }
  };
  const result = commitPlay(storage, facts({won: true, levelId: 3, levelCount: 20}));
  assert.equal(result.saved, true);
  assert.equal(result.unlockedLevel, null);
  assert.deepEqual(result.events.map(entry => entry.name), ['card_play', 'level_complete']);
});
