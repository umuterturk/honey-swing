import {cardMotionMarks} from '../motionSchedule.js';
import {MAGNITUDE,SIGNATURE_PRESETS} from './signaturePresets.js';

const LIFE=0.900;
const ENTRY=0.150;
const FADE=0.150;

// Bank small / mid / over uses only bankGain and securedAfter compared with
// the level target. B4 names the three pots and does not add another cutoff.
function bankTier(bankGain,securedAfter,target){
  if(bankGain>=target)return 'M3';
  if(securedAfter>=target)return 'M2';
  return 'M1';
}

function withTier(name,extra){
  return {
    magnitude:name,...MAGNITUDE[name],life:LIFE,entry:ENTRY,fade:FADE,
    shake:false,praise:false,...extra
  };
}

function presetOf(id){
  return SIGNATURE_PRESETS[id];
}

// Ordered signature list for one committed change. Numbers come from the
// change (engine gain, W, flipFactor, bankGain, secured) and the level target.
export function fxEventsFromChange(change={},action={},level={}){
  const events=[];
  const type=action?.type||change?.type;
  const rewards=Array.isArray(change?.rewards)?change.rewards:[];
  const swing=rewards.find(reward=>reward?.kind==='swing');
  const flip=rewards.find(reward=>reward?.kind==='flip');
  const marks=cardMotionMarks({type,snap:!!change?.snap,rewards});
  if(change?.snap){
    const preset=presetOf('snap');
    events.push(withTier('M4',{
      id:'snap',
      callout:null,
      callouts:['SNAP!','Pot lost. Bank safe.'],
      at:0,
      particleDelay:0,
      shake:true,
      shakeDuration:0.280,
      shakeAmplitude:3,
      shakeAxis:'x',
      praise:false,
      sound:preset.sound,
      haptic:preset.haptic,
      colors:[...preset.colors],
      anchor:preset.anchor
    }));
    return events;
  }
  if(type==='flip'){
    const preset=presetOf('flip');
    events.push({
      id:'flip',
      callout:null,
      callouts:null,
      particles:0,
      shake:false,
      flash:null,
      flashMs:0,
      magnitude:null,
      at:marks.faceEnd,
      sound:preset.sound,
      haptic:null,
      colors:[],
      anchor:preset.anchor,
      praise:false
    });
  }
  if(change?.zeroBreak){
    const preset=presetOf('zero');
    events.push({
      id:'zero',
      callout:preset.callout,
      callouts:null,
      particles:0,
      shake:false,
      flash:null,
      flashMs:0,
      halo:0.300,
      at:0,
      sound:preset.sound,
      haptic:null,
      colors:[],
      anchor:preset.anchor,
      praise:false,
      magnitude:null
    });
    return events;
  }
  const dual=!!(swing&&flip);
  if(swing){
    const ordinary=!dual&&change.gain<=1&&change.swingW<=1;
    const id=ordinary?'swing':'cross';
    const name=dual?'M3':ordinary?'M1':'M2';
    const preset=presetOf(id);
    events.push(withTier(name,{
      id,
      callout:preset.callout,
      callouts:null,
      at:marks.rewards,
      particleDelay:0,
      sound:preset.sound,
      haptic:preset.haptic??null,
      colors:[...preset.colors],
      anchor:preset.anchor
    }));
  }
  if(flip){
    const preset=presetOf('flipx');
    const factor=change.flipFactor;
    events.push(withTier(dual?'M3':'M2',{
      id:'flipx',
      callout:'FLIP ×'+factor+'!',
      callouts:null,
      flipFactor:factor,
      at:marks.rewards,
      particleDelay:0,
      sound:preset.sound,
      haptic:null,
      colors:[...preset.colors],
      anchor:preset.anchor
    }));
  }
  if(type==='bank'&&change.bankGain>0){
    const preset=presetOf('bank');
    events.push(withTier(bankTier(change.bankGain,change.securedAfter,level?.target),{
      id:'bank',
      callout:preset.callout,
      callouts:null,
      amount:change.bankGain,
      at:0,
      particleDelay:0.180,
      entry:0.120,
      sound:preset.sound,
      haptic:preset.haptic,
      colors:[...preset.colors],
      anchor:preset.anchor
    }));
  }
  return events;
}
