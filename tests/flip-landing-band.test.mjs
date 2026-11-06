import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {signed} from '../src/external/engines.js';
import {
  newOnboardingRound,onboardingActions,onboardingLevel,stepOnboarding
} from '../src/casual/onboardingLevels.js';
import {
  FLIP_BAND_APPEAR_MS,flipBandShownPayload,flipBandView,flipChosenPayload,
  flipLandingBand,flipLandings,nextFlipBandShown
} from '../src/casual/flipLandingBand.js';

const flip={type:'flip'},bank={type:'bank'};
function play(round,action){
  const next=stepOnboarding(round,action);
  assert.notStrictEqual(next,round);
  return next;
}
function steerValue(round,value){
  const index=round.game.deal.hand.findIndex(id=>signed(id)===value);
  assert.ok(index>=0,'L'+round.levelId+' has no '+value);
  return play(round,{type:'steer',index});
}
function line(level,values){
  return values.reduce((round,value)=>value==='flip'?play(round,flip):
    value==='bank'?play(round,bank):steerValue(round,value),newOnboardingRound(level));
}
function expectBand(round){
  const landings=flipLandings(round);
  const band=flipLandingBand(round);
  const legal=onboardingActions(round).some(action=>action.type==='flip');
  if(!legal||!landings.length){
    assert.equal(band,null);
    return null;
  }
  assert.deepEqual(band.landings,landings);
  assert.equal(band.min,Math.min(...landings));
  assert.equal(band.max,Math.max(...landings));
  assert.equal(band.single,landings.length===1);
  assert.equal(band.snapRisk,landings.some(value=>Math.abs(value)>8));
  assert.equal(band.showSnapOverlap,round.levelId>=11);
  assert.equal(band.danger,band.snapRisk&&round.levelId>=11);
  assert.equal(band.aria.includes(String(band.min)),true);
  assert.equal(band.aria.includes(String(band.max)),true);
  if(band.danger)assert.match(band.aria,/including Snap risk/);
  else assert.doesNotMatch(band.aria,/Snap risk/);
  for(const mark of band.marks){
    assert.ok(mark.percent>=0&&mark.percent<=100);
    if(Math.abs(mark.value)>8){
      assert.ok(mark.chevron);
      assert.equal(mark.percent,mark.value>0?100:0);
    }else assert.equal(mark.chevron,null);
    assert.equal(mark.snap,round.levelId>=11&&Math.abs(mark.value)>8);
  }
  return band;
}

test('opening and scripted lines match engine landings',()=>{
  const scripts={
    5:[[],[3],[3,2],[3,2,'flip'],['flip'],['flip',3,2]],
    6:[[],['flip'],['flip','flip'],[2],[2,1],[2,1,'flip'],[2,1,'flip','flip']],
    8:[[],[2],[2,'flip'],[3],[3,'flip'],[2,3],[2,3,'flip'],['flip'],['flip',2,3]],
    11:[[],[2],[2,-1],[2,-1,'bank'],[5],[2,-1,'bank',5],[2,-1,'bank',5,-3]],
    12:[[],[4],[4,'flip'],[4,1],[4,1,'flip'],[1],['flip'],['flip',4],[1,'flip',4]]
  };
  for(const [level,paths] of Object.entries(scripts)){
    for(const path of paths)expectBand(line(Number(level),path));
  }
  for(const id of [1,2,3,4,9,10])assert.equal(flipLandingBand(newOnboardingRound(id)),null);
});

test('red exists only for a real Snap landing from Level 11 on',()=>{
  for(let id=5;id<=12;id++){
    const band=flipLandingBand(newOnboardingRound(id));
    if(!band)continue;
    assert.equal(band.danger,false,'opening L'+id);
    assert.equal(onboardingLevel(id).showSnapOverlap,id>=11);
  }
  const taught=line(11,[5]);
  const band=expectBand(taught);
  assert.equal(band.danger,true);
  const seven=band.marks.find(mark=>mark.value===taught.game.deal.S+7);
  const minus=band.marks.find(mark=>mark.value===taught.game.deal.S-3);
  const plus=band.marks.find(mark=>mark.value===taught.game.deal.S+3);
  assert.equal(seven.snap,true);
  assert.equal(seven.chevron,'right');
  assert.equal(minus.snap,false);
  assert.equal(plus.snap,false);
  assert.equal(band.segments.some(segment=>segment.side==='right'&&segment.chevron),true);
});

test('Level 12 opens on a single mark at -6',()=>{
  const band=flipLandingBand(newOnboardingRound(12));
  assert.equal(band.single,true);
  assert.equal(band.min,-6);
  assert.equal(band.max,-6);
  assert.equal(band.danger,false);
  assert.equal(band.chevronMin,false);
  assert.equal(band.marks[0].chevron,null);
});

test('reduced motion keeps static ticks and drops the fade',()=>{
  const open=flipLandingBand(newOnboardingRound(6));
  const reduced=flipBandView(open,{reduced:true});
  assert.equal(reduced.animate,false);
  assert.equal(reduced.appearMs,0);
  assert.equal(reduced.ticks.length,2);
  assert.equal(reduced.blocksInput,false);
  const motion=flipBandView(open,{reduced:false});
  assert.equal(motion.animate,true);
  assert.equal(motion.appearMs,FLIP_BAND_APPEAR_MS);
  assert.equal(FLIP_BAND_APPEAR_MS<=150,true);
  assert.equal(motion.ticks.length,0);
  const single=flipBandView(flipLandingBand(newOnboardingRound(12)),{reduced:true});
  assert.equal(single.ticks.length,1);
  const css=readFileSync(new URL('../src/casual/minimal.css',import.meta.url),'utf8');
  assert.match(css,/--sgv-flip-band:#fff0cf52/);
  assert.match(css,/--sgv-flip-band-danger:#e94b7273/);
  assert.match(css,/\.sgv-flip-band\{[^}]*pointer-events:none/);
  assert.match(css,/\.sgv-flip-band\{[^}]*transition:left \.12s,width \.12s,opacity \.15s/);
  assert.match(css,/\.sgv-flip-band-hatch\{background-image:repeating-linear-gradient\(45deg/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\s*\.sgv-flip-band,\.sgv-flip-band-danger\{transition:none;animation:none\}\s*\.sgv-flip-band-tick\{display:block\}/);
  assert.match(css,/\.sgv-meter-marker\{[^}]*z-index:3/);
  assert.match(css,/\.sgv-flip-band\{[^}]*z-index:1/);
});

test('band analytics fire once per range and again when a Flip is chosen',()=>{
  const band=flipLandingBand(newOnboardingRound(12));
  const first=nextFlipBandShown(null,12,band);
  assert.equal(first.payload.name,'flip_band_shown');
  assert.deepEqual({level:first.payload.level,min:first.payload.min,max:first.payload.max,snapRisk:first.payload.snapRisk},
    {level:12,min:-6,max:-6,snapRisk:false});
  assert.equal(nextFlipBandShown(first.key,12,band).payload,null);
  const risky=flipLandingBand(line(11,[5]));
  const shown=flipBandShownPayload(11,risky);
  assert.equal(shown.snapRisk,true);
  assert.equal(shown.min,2);
  assert.equal(shown.max,12);
  assert.deepEqual(flipChosenPayload(11,risky),{name:'flip_chosen',level:11,snapRisk:true});
  assert.deepEqual(flipChosenPayload(6,flipLandingBand(newOnboardingRound(6))),
    {name:'flip_chosen',level:6,snapRisk:false});
  assert.equal(nextFlipBandShown('x',1,null).payload,null);
});
