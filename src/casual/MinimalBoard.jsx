import React from 'react';
import {meterPercent,meterMarks} from './meterScale.js';
import {fluidFillPercent} from './presentation.js';
import {CARD_ARROW_PATH,cardDirection,cardAccentMix} from './cardDirection.js';
import {VictoryJarArt} from './VictoryJarArt.js';
import {publicUrl} from './publicUrl.js';

export const signedValue=n=>n>0?'+'+n:String(n);
export const directionLabel=n=>n<0?'LEFT':n>0?'RIGHT':'CENTER';
export const directionalValue=n=>n===0?'CENTER 0':directionLabel(n)+' '+Math.abs(n);

// The fluid is one resource with two states: at-risk in the Pot, secured in the tank.
export function DropletIcon({className=''}) {
 return <svg className={'sgv-drop-icon '+className} viewBox="0 0 28 34"
   aria-hidden="true" focusable="false">
   <path d="M14 2C11 8 3 17 3 23a11 11 0 0 0 22 0C25 17 17 8 14 2Z"
     fill="currentColor" stroke="var(--drop-rim,#ffeb9d)" strokeWidth="2.6"
     strokeLinejoin="round"/>
   <path d="M9 22c.4-3 2-6 4.5-9" stroke="#fff8ca" strokeWidth="2.2"
     strokeLinecap="round" fill="none" opacity=".85"/>
 </svg>;
}

export function HorizontalMeter({position,limit=8,multipliers=[],visibleFactors=null,showDanger=true,beat='',dock=null,
  onFactorInfo=null,factorInfoEnabled=false}){
 const percentage=meterPercent(position,limit);
 return <section className="sgv-meter-section" aria-label="Swing meter and multipliers">
   <div className="sgv-meter" role="group" data-value={position}
     aria-label={'Swing at '+directionalValue(position)+(showDanger?'; Snap beyond '+limit+' left or '+limit+' right':'')}>
     <img className="sgv-honeycomb" src={publicUrl('honeycomb.png')} alt="" aria-hidden="true" draggable="false"/>
     <div className="sgv-meter-track" role="img" data-edge-danger={showDanger&&Math.abs(position)>=limit-2}
       aria-label={'Swing position '+directionalValue(position)}>
       <div className="sgv-meter-scale" aria-hidden="true">
         <div className="sgv-meter-ticks">
           {meterMarks(limit).map(number=>
             <span key={number} className={'sgv-meter-tick'+(number===0?' sgv-meter-tick-zero':'')}
               style={{left:meterPercent(number,limit)+'%'}}>{Math.abs(number)}</span>)}
         </div>
       </div>
     </div>
     <img className="sgv-meter-wasp sgv-meter-wasp-left" src={publicUrl('wasp-looking-right.png')}
       alt="" aria-hidden="true" draggable="false"/>
     <img className="sgv-meter-wasp sgv-meter-wasp-right" src={publicUrl('wasp-looking-right.png')}
       alt="" aria-hidden="true" draggable="false"/>
     <div className="sgv-meter-marker-rail" aria-hidden="true">
       <span className="sgv-meter-marker" style={{left:percentage+'%'}}>
         <span className="sgv-meter-needle">
           <img className="sgv-meter-needle-art" src={publicUrl('needle-honeycomb-cell.png')} alt="" draggable="false"/>
           <strong className="sgv-meter-needle-value">{Math.abs(position)}</strong>
         </span>
       </span>
     </div>
     <img className="sgv-honey-tap" src={publicUrl('honey-tap.png')} alt="" aria-hidden="true" draggable="false"/>
     <div className="sgv-multipliers" role="group" aria-label="Swing, Flip, Jackpot multipliers">
       {multipliers
         .filter(({kind})=>!visibleFactors||visibleFactors.includes(kind))
         .slice()
         .sort((a,b)=>(a.kind==='flip')-(b.kind==='flip'))
         .map(({kind,value,label})=>{
           const infoKind=kind==='swing'||kind==='flip'?kind:null;
           const canInfo=!!(infoKind&&onFactorInfo);
           const Tag=canInfo?'button':'span';
           return <Tag key={kind} type={canInfo?'button':undefined}
             className={'sgv-multiplier-pill sgv-multiplier-'+kind+
               ((dock==='swing'&&kind==='swing')||(dock==='flip-pill'&&kind==='flip')||
                (dock==='jackpot'&&kind==='jackpot')?' sgv-dock':'')}
             data-factor={kind} title={label}
             aria-label={canInfo?label+' info, times '+value:label+': times '+value}
             disabled={canInfo?!factorInfoEnabled:undefined}
             onClick={canInfo&&factorInfoEnabled?()=>onFactorInfo(infoKind):undefined}>
             <span className="sgv-multiplier-value">×{value}</span>
             {kind==='swing'?<img className="sgv-multiplier-icon sgv-multiplier-daisy" src={publicUrl('celebration/daisy-2.png')}
               alt="" aria-hidden="true" draggable="false"/>:null}
             {kind==='flip'?<img className="sgv-multiplier-icon sgv-multiplier-bee" src={publicUrl('bee-smiling-closed-eyes.png')}
               alt="" aria-hidden="true" draggable="false"/>:null}
           </Tag>;
         })}
     </div>
     {beat?<p className="sgv-meter-beat" role="status">{beat}</p>:null}
   </div>
 </section>;
}

// The Pot shows the engine's prospective Bank payout, not raw card value.
// Its shine is the tappable affordance, replacing the separate Bank chip.
// Cap (when set) still drives fill / soft overflow; the label shows amount only.
export function PendingPot({value,cap=null,target=24,bankable=false,onBank,className='',interactive=true}){
 const hasCap=Number.isInteger(cap)&&cap>0;
 const fillTarget=hasCap?cap:target;
 const fill=fluidFillPercent(value,fillTarget,{max:76,smooth:true});
 const Tag=interactive?'button':'div';
 return <Tag type={interactive?'button':undefined}
   className={'sgv-pending-pot sgv-pot-bottle'+(bankable&&interactive?' sgv-pot-bankable':'')+(!interactive?' sgv-pot-display':'')+(hasCap&&value>=cap?' sgv-pot-full':'')+' '+className}
   style={{'--pot-fill':fill+'%'}}
   disabled={interactive?!bankable:undefined}
   onClick={interactive?event=>onBank?.(event.currentTarget):undefined}
   aria-label={!interactive?'Pot has '+value+' pending drops':bankable
     ?'Tap Pot to save '+value+' drops'
     :'Pot has '+value+' potential drops. Saving not yet available'}>
   <span className="sgv-jar-pad" aria-hidden="true"/>
   <VictoryJarArt fillPercent={fill} className="sgv-pot-victory-art" mouthClassName="sgv-pot-art-mouth"/>
   <span className="sgv-pot-pour-lip" aria-hidden="true"/>
   <span className="sgv-pot-amount" aria-hidden="true">
     <DropletIcon className="sgv-pot-drop"/>
     {value}
   </span>
 </Tag>;
}

export function GoalProgress({banked,target}){
 return <div className="sgv-goal-progress" role="status" aria-label={'Secured '+banked+' of '+target+' drops'}>
   <span>SAVINGS</span><strong>{banked} / {target}</strong>
 </div>;
}

// Larger destination bottle. Its fluid represents only secured engine value.
export function GlassChest({banked,target}){
 const fill=fluidFillPercent(banked,target,{max:78});
 return <div className="sgv-chest-area sgv-bank-bottle"
   aria-label={banked+' of '+target+' drops secured'} data-gold={banked}>
   <span className="sgv-jar-pad" aria-hidden="true"/>
   <div className="sgv-chest-glow" aria-hidden="true"/>
   <div className="sgv-chest-body" aria-hidden="true">
     <VictoryJarArt fillPercent={fill} className="sgv-bank-victory-art" mouthClassName="sgv-chest-mouth"/>
   </div>
   <GoalProgress banked={banked} target={target}/>
 </div>;
}

export function IntroTarget({target,onDone,sequence}){
 return <div className="sgv-intro-target" key={sequence} aria-live="polite"
   onAnimationEnd={event=>{if(event.target===event.currentTarget)onDone();}}>
   <div className="sgv-intro-coin"><DropletIcon/></div>
   <div className="sgv-intro-message"><span>COLLECT</span><strong>{target}</strong><span>DROPS!</span></div>
 </div>;
}

export function SimpleCard({id,index,value,disabled,onPlay,showDirection=true,risky=false,highlighted=false}){
 const direction=cardDirection(value);
 return <button type="button"
   className={'sgv-card sgv-card-'+direction+(!showDirection?' sgv-card-number-only':'')+(risky?' sgv-card-risky':'')+(highlighted?' sgv-attention':'')}
   style={{'--sgv-card-mix':cardAccentMix(value)}}
   aria-label={'Play '+directionalValue(value)}
   disabled={disabled}
   onClick={event=>onPlay(index,event.currentTarget)}>
   <span className="sgv-card-gloss" aria-hidden="true"/>
   {showDirection&&<svg className="sgv-card-arrow" viewBox="0 0 80 58" aria-hidden="true" focusable="false">
     <path d={CARD_ARROW_PATH}/>
   </svg>}
   <strong>{Math.abs(value)}</strong>
 </button>;
}
