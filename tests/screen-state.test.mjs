import test from 'node:test';
import assert from 'node:assert/strict';
import {ONBOARDING_PROGRESS_KEY, ONBOARDING_SESSION_KEY, SEEN_FEATURE_INTROS_KEY} from '../src/casual/onboardingProgress.js';
import {dismissFeatureIntro} from '../src/casual/featureIntroRegistry.js';
import {newOnboardingRound, ONBOARDING_COUNT} from '../src/casual/onboardingLevels.js';
import {dismissLevelScreen} from '../src/casual/levelScreens.js';
import {
  ackAfterCommit, arrivalBegan, arrivalSettled, clearedAck, closedStart, dismissedIntro,
  endTransition, initialScreen, levelScreen, nextLevelId,
  settledScreen, successMarked
} from '../src/casual/screenState.js';

function memoryStorage(seed={}){
  const data={...seed};
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(data, key)?data[key]:null;},
    setItem(key, value){data[key]=String(value);},
    removeItem(key){delete data[key];}
  };
}

test('initialScreen opens a fresh level 1 behind the bank intro', () => {
  const screen=initialScreen({storage:memoryStorage(), levelCount:ONBOARDING_COUNT, reduced:false});
  assert.equal(screen.round.levelId, 1);
  assert.equal(screen.shownGold, screen.round.game.deal.T);
  assert.equal(screen.introGate, true);
  assert.equal(screen.introCard.id, 'bank');
  assert.equal(screen.startOpen, false);
  assert.equal(screen.arriving, false);
  assert.equal(screen.docking, false);
  assert.equal(screen.advanced, false);
});

test('initialScreen resumes a mid-level round with the start screen closed', () => {
  const round=newOnboardingRound(2);
  round.turn=1;
  const storage=memoryStorage({[ONBOARDING_SESSION_KEY]:JSON.stringify(round)});
  const screen=initialScreen({storage, levelCount:ONBOARDING_COUNT, reduced:false});
  assert.equal(screen.round.levelId, 2);
  assert.equal(screen.round.turn, 1);
  assert.equal(screen.shownGold, round.game.deal.T);
  assert.equal(screen.startOpen, false);
  assert.equal(screen.introGate, false);
  assert.equal(screen.arriving, false);
});

test('levelScreen resets gold and opens the start screen when no intro is waiting', () => {
  const seen=memoryStorage({[SEEN_FEATURE_INTROS_KEY]:JSON.stringify(['bank'])});
  const motion=levelScreen(3, {storage:seen, reduced:false});
  assert.equal(motion.round.levelId, 3);
  assert.equal(motion.shownGold, 0);
  assert.equal(motion.view.position, motion.round.game.deal.S);
  assert.equal(motion.startOpen, true);
  assert.equal(motion.introGate, false);
  assert.equal(motion.docking, true);
  assert.equal(motion.arriving, true);
  assert.equal(motion.animating, false);
  assert.equal(motion.help, false);
  assert.equal(motion.devMenuOpen, false);
  const reduced=levelScreen(3, {storage:memoryStorage({[SEEN_FEATURE_INTROS_KEY]:JSON.stringify(['bank'])}), reduced:true});
  assert.equal(reduced.arriving, false);
  assert.equal(reduced.docking, true);
});

test('a fresh level 13 shows the six-card intro after Save is seen', () => {
  const storage=memoryStorage({[SEEN_FEATURE_INTROS_KEY]:JSON.stringify(['bank'])});
  const screen=levelScreen(13, {storage, reduced:true});
  assert.equal(screen.introGate, true);
  assert.equal(screen.introCard.id, 'hand');
  assert.equal(screen.startOpen, false);
});

test('level 16 with a seen-set shows the six-card intro once', () => {
  const storage=memoryStorage({
    [SEEN_FEATURE_INTROS_KEY]:JSON.stringify(['bank']),
    [ONBOARDING_PROGRESS_KEY]:'16'
  });
  const first=levelScreen(16, {storage, reduced:true});
  assert.equal(first.introGate, true);
  assert.equal(first.introCard.id, 'hand');
  const dismissed=dismissFeatureIntro({levelId:16, storage, via:'play'});
  assert.equal(dismissed.id, 'hand');
  const second=levelScreen(16, {storage, reduced:true});
  assert.equal(second.introGate, false);
  assert.equal(second.startOpen, true);
});

test('a stale mid-level deck restarts that level and keeps progress', () => {
  for(const levelId of [8, 13, 16, 20]){
    const round=newOnboardingRound(levelId);
    round.turn=3;
    round.game.deal.deck=[9, 9, 9];
    const storage=memoryStorage({
      [ONBOARDING_SESSION_KEY]:JSON.stringify(round),
      [ONBOARDING_PROGRESS_KEY]:String(levelId),
      [SEEN_FEATURE_INTROS_KEY]:JSON.stringify(['bank','hand'])
    });
    const screen=initialScreen({storage, levelCount:ONBOARDING_COUNT, reduced:true});
    assert.equal(screen.round.levelId, levelId);
    assert.equal(screen.round.turn, 0);
    assert.notDeepEqual(screen.round.game.deal.deck, [9, 9, 9]);
    assert.equal(storage.getItem(ONBOARDING_PROGRESS_KEY), String(levelId));
  }
});

test('a seen bank intro lets level 1 open the start screen', () => {
  const storage=memoryStorage({[SEEN_FEATURE_INTROS_KEY]:JSON.stringify(['bank'])});
  const screen=levelScreen(1, {storage, reduced:false});
  assert.equal(screen.introGate, false);
  assert.equal(screen.startOpen, true);
  assert.equal(screen.arriving, true);
});

test('nextLevelId stays on the last level', () => {
  assert.equal(nextLevelId(12, 20), 13);
  assert.equal(nextLevelId(20, 20), 20);
});

test('dismissedIntro opens the start screen only for a level-start handoff', () => {
  const screen=levelScreen(1, {storage:memoryStorage(), reduced:true});
  const queued=dismissedIntro(screen, {
    dismissed:true, gate:true, intro:{id:'next'}, handoff:null
  });
  assert.equal(queued.introGate, true);
  assert.equal(queued.introCard.id, 'next');
  assert.equal(queued.startOpen, screen.startOpen);
  const handed=dismissedIntro(screen, {
    dismissed:true, gate:false, intro:null, handoff:'level-start'
  });
  assert.equal(handed.introGate, false);
  assert.equal(handed.introCard, null);
  assert.equal(handed.startOpen, true);
  assert.equal(dismissedIntro(screen, {dismissed:false, gate:true, intro:screen.introCard}), screen);
});

test('ackAfterCommit sets the first outcome and clears a later one', () => {
  const screen={ack:null};
  const first=ackAfterCommit(screen, {outcome:'snap', first:{kind:'snap'}, text:'Pot lost. Savings safe.'});
  assert.deepEqual(first.ack, {kind:'snap', text:'Pot lost. Savings safe.'});
  const later=ackAfterCommit(first, {outcome:'flip', first:null, text:null});
  assert.equal(later.ack, null);
  assert.equal(ackAfterCommit(first, {outcome:null, first:null, text:null}), first);
});

test('settledScreen copies the presentation fields and keeps the ack', () => {
  const screen={ack:{kind:'flip', text:'FLIP'}, help:true, round:{levelId:1}};
  const settled=settledScreen(screen, {
    round:{levelId:1, turn:1}, view:{position:2}, shownGold:4, feedback:null, animating:false
  });
  assert.equal(settled.round.turn, 1);
  assert.equal(settled.view.position, 2);
  assert.equal(settled.shownGold, 4);
  assert.equal(settled.feedback, null);
  assert.equal(settled.animating, false);
  assert.deepEqual(settled.ack, screen.ack);
  assert.equal(settled.help, true);
});

test('closedStart leaves the dock flag alone', () => {
  const screen={startOpen:true, docking:true};
  assert.deepEqual(closedStart(screen), {startOpen:false, docking:true});
});

test('end decisions settle, advance once, or replay', () => {
  const playing={round:{levelId:12}, advanced:false, successSettled:false};
  const win=endTransition(playing, dismissLevelScreen('win', 'cta'), 20);
  assert.equal(win.enterLevel, 13);
  assert.equal(win.screen.advanced, true);
  assert.equal(win.screen.successSettled, true);
  const backdrop=endTransition(playing, dismissLevelScreen('win', 'backdrop'), 20);
  assert.equal(backdrop.enterLevel, null);
  assert.equal(backdrop.screen.successSettled, true);
  assert.equal(backdrop.screen.advanced, false);
  const lose=endTransition(playing, dismissLevelScreen('lose', 'cta'), 20);
  assert.equal(lose.enterLevel, 12);
  const again=endTransition({...playing, advanced:true}, dismissLevelScreen('win', 'cta'), 20);
  assert.equal(again.enterLevel, null);
  assert.equal(again.screen.advanced, true);
  const locked=endTransition(playing, {lock:true, advance:true}, 20);
  assert.equal(locked.enterLevel, null);
  assert.equal(locked.screen, playing);
});

test('clearedAck ignores a newer token and arrival can settle', () => {
  const ack={kind:'cross', text:'CROSS'};
  const screen={ack, arriving:true, successSettled:false};
  assert.equal(clearedAck(screen, {kind:'other'}).ack, ack);
  assert.equal(clearedAck(screen, ack).ack, null);
  assert.equal(arrivalBegan(screen, true).arriving, true);
  assert.equal(arrivalBegan({...screen, arriving:true}, false).arriving, false);
  assert.equal(arrivalSettled(screen).arriving, false);
  assert.equal(successMarked(screen).successSettled, true);
});
