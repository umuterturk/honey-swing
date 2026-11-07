import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fluidFillPercent,bankPourAmounts,visiblePotPayout} from '../src/casual/presentation.js';
import {newRound,stepFirstLevel,FIRST_LEVEL} from '../src/casual/firstLevel.js';
import {overswingActions,overswingPayout} from '../src/external/engines.js';
import {CARD_ARROW_PATH,cardDirection,cardAccentMix} from '../src/casual/cardDirection.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('tap-to-bank respects engine eligibility and previews actual payout',()=>{
 let round=newRound();
 const bankable=state=>overswingActions(state.game,FIRST_LEVEL.rules)
   .some(a=>a.type==='bank'&&a.dropIndex==null);
 assert.equal(bankable(round),false);
 round=stepFirstLevel(round,{type:'flip'});
 assert.equal(bankable(round),false);
 round=stepFirstLevel(round,{type:'flip'});
 assert.equal(bankable(round),true);
 assert.equal(overswingPayout(round.game,FIRST_LEVEL.rules),56);
 const next=stepFirstLevel(round,{type:'bank'});
 assert.equal(next.game.deal.T,56);
 assert.equal(next.game.deal.pot.length,0);
 assert.equal(bankable(next),false);
});

test('P0 regression: dedicated Bank remains tappable while decorative Pot is not',()=>{
 const board=read('src/casual/MinimalBoard.jsx');
 const screen=read('src/casual/SimplifiedGame.jsx');
 const css=read('src/casual/minimal.css');
 assert.match(board,/const Tag=interactive\?'button':'div'/);
 assert.match(screen,/interactive=\{false\}/);
 assert.match(screen,/className=\{'sgv-action sgv-bank sgv-bank-command'/);
 assert.match(screen,/onClick=\{\(\)=>play\(\{type:'bank'\},rootRef.current\?\.querySelector\('\.sgv-pending-pot'\)\)\}/);
 assert.match(css,/\.sgv-onboarding \.sgv-bottle-pair \.sgv-pot-display\{[\s\S]*?pointer-events:none/);
 assert.match(board,/bankable&&interactive\?' sgv-pot-bankable':'/);
});

test('normal Bank stays eligible after three safe played cards',()=>{
 let round=newRound();
 for(let i=0;i<3;i++){
   const next=stepFirstLevel(round,{type:'steer',index:0});
   assert.notStrictEqual(next,round,'steer must be legal in first three turns');
   assert.equal(next.snaps,0,'the three-card sequence must remain safe');
   round=next;
 }
 const legal=overswingActions(round.game,FIRST_LEVEL.rules);
 assert.ok(legal.some(a=>a.type==='bank'&&a.dropIndex==null),
   'Bank must be available after three safe card plays');
 const payout=overswingPayout(round.game,FIRST_LEVEL.rules);
 assert.ok(payout>0);
 const after=stepFirstLevel(round,{type:'bank'});
 assert.equal(after.game.deal.T,round.game.deal.T+payout);
 assert.equal(after.game.deal.pot.length,0);
});

test('Pot number and fluid represent engine payout, never the unmultiplied raw cards',()=>{
 const board=read('src/casual/MinimalBoard.jsx');
 const screen=read('src/casual/SimplifiedGame.jsx');
 const css=read('src/casual/minimal.css');
 assert.equal(visiblePotPayout(18,9,9),18);
 assert.equal(visiblePotPayout(18,9,4.5),9);
 assert.equal(visiblePotPayout(18,9,0),0);
 assert.equal(visiblePotPayout(18,9,-1),0);
 assert.equal(visiblePotPayout(18,9,500),18);
 assert.equal(visiblePotPayout(0,9,9),0);
 assert.equal(visiblePotPayout(18,0,0),0);
 assert.equal(visiblePotPayout(18,9,Number.NaN),18);
 assert.ok(fluidFillPercent(9,24,{max:76,smooth:true})<
           fluidFillPercent(18,24,{max:76,smooth:true}));
 assert.match(screen,/visiblePotPayout\(potentialPayout,rawPotValue\(deal\),view\.rawPot\)/);
 assert.match(screen,/<PendingPot value=\{potDisplay\}/);
 assert.match(board,/sgv-pot-amount/);
 assert.doesNotMatch(board,/sgv-pot-bank-preview|bankPreview/);
 assert.doesNotMatch(css,/sgv-pot-bank-preview/);
});

test('Snap cracks and loses pending fluid; Zero Break keeps the Pot without a crack',()=>{
 const motion=read('src/casual/minimalMotion.js');
 const screen=read('src/casual/SimplifiedGame.jsx');
 const css=read('src/casual/minimal.css');
 assert.match(motion,/export function animatePotBreak\(root,kind='snap'\)/);
 assert.match(motion,/sgv-pot-fracture/);
 assert.match(screen,/breakMotionRef\.current=animatePotBreak\(root,'snap'\)/);
 assert.doesNotMatch(screen,/animatePotBreak\(root,'zero'\)/);
 assert.match(screen,/Pot safe\./);
 assert.match(screen,/animateFactorReset\(root\)/);
 assert.match(screen,/lossMotionRef\.current=animateSnapLoss\(root,change\.rawPotBefore\)/);
 assert.match(css,/\.sgv-pot-fracture-snap path\{/);
 assert.match(screen,/breakMotionRef\.current\?\.\(\)/);
});
