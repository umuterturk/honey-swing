import {signed} from '../external/engines.js';
import {meterPercent} from './meterScale.js';
import {onboardingActions,onboardingLevel} from './onboardingLevels.js';

// Appear, edge morph, and hide. None of these hold input.
export const FLIP_BAND_APPEAR_MS=150;
export const FLIP_BAND_MORPH_MS=120;
export const FLIP_BAND_HIDE_MS=120;

const clamp=(value,limit)=>Math.max(-limit,Math.min(limit,value));
const percent=(value,limit)=>meterPercent(clamp(value,limit),limit);

export function flipLandings(round){
  const deal=round.game.deal;
  return deal.deck.slice(deal.pos).map(id=>deal.S+signed(id));
}

export function flipLandingBand(round){
  const level=onboardingLevel(round.levelId);
  if(!onboardingActions(round).some(action=>action.type==='flip'))return null;
  const landings=flipLandings(round);
  if(!landings.length)return null;
  const limit=level.rules.snapLimit;
  const min=Math.min(...landings);
  const max=Math.max(...landings);
  const showSnapOverlap=!!level.showSnapOverlap;
  const snaps=landings.map(value=>Math.abs(value)>limit);
  const snapRisk=snaps.some(Boolean);
  const danger=showSnapOverlap&&snapRisk;
  const single=landings.length===1;
  const mark=value=>({
    value,
    percent:percent(value,limit),
    chevron:Math.abs(value)>limit?(value>0?'right':'left'):null,
    snap:showSnapOverlap&&Math.abs(value)>limit
  });
  const segments=[];
  if(danger&&min<-limit){
    segments.push({
      side:'left',
      left:percent(min,limit),
      right:percent(Math.min(max,-limit),limit),
      chevron:true
    });
  }
  if(danger&&max>limit){
    segments.push({
      side:'right',
      left:percent(Math.max(min,limit),limit),
      right:percent(max,limit),
      chevron:true
    });
  }
  const aria=single
    ?'Flip can land on '+min+(danger?', including Snap risk':'')
    :'Flip can land between '+min+' and '+max+(danger?', including Snap risk':'');
  return {
    min,max,landings,limit,single,snapRisk,showSnapOverlap,danger,aria,
    left:percent(min,limit),right:percent(max,limit),
    chevronMin:min<-limit,chevronMax:max>limit,
    marks:landings.map(mark),
    segments
  };
}

export function flipBandView(band,{reduced=false}={}){
  if(!band)return {hidden:true,ticks:[],animate:false,danger:false,hatch:false};
  const ticks=band.single?[band.marks[0]]:
    [{value:band.min,percent:band.left,chevron:band.chevronMin?'left':null},
      {value:band.max,percent:band.right,chevron:band.chevronMax?'right':null}];
  return {
    hidden:false,
    single:band.single,
    ticks:reduced||band.single?ticks:[],
    animate:!reduced,
    appearMs:reduced?0:FLIP_BAND_APPEAR_MS,
    danger:band.danger,
    hatch:band.danger,
    aria:band.aria,
    blocksInput:false
  };
}

export function flipBandShownPayload(levelId,band){
  if(!band)return null;
  return {name:'flip_band_shown',level:levelId,min:band.min,max:band.max,snapRisk:band.snapRisk};
}
export function flipChosenPayload(levelId,band){
  return {name:'flip_chosen',level:levelId,snapRisk:!!band?.snapRisk};
}
export function nextFlipBandShown(previousKey,levelId,band){
  const payload=flipBandShownPayload(levelId,band);
  if(!payload)return {key:null,payload:null};
  const key=JSON.stringify(payload);
  if(key===previousKey)return {key,payload:null};
  return {key,payload};
}
