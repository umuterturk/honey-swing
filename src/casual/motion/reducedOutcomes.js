import {STATIC_OUTCOME_MS,reducedBankSummary,reducedCardSummary} from '../motionSchedule.js';
import {mountPotEquationFlyer} from './potEquation.js';
import {placeStaticFactor} from './factorFlyer.js';
import {placeStatic,point,removeNodes,replaceStatic} from './stage.js';

function showReducedCard(root,view){
  const summary=reducedCardSummary(view);
  if(!root)return ()=>{};
  const nodes=[];
  if(summary.pourFly){
    const pot=root.querySelector('.sgv-pending-pot');
    const origin=pot?point(pot,root):{x:root.clientWidth*.25,y:root.clientHeight*.63};
    const doc=root.ownerDocument;
    let node;
    if(summary.pourFly.rich){
      node=mountPotEquationFlyer(doc,summary.pourFly.initial);
      node.classList.add('sgv-static-outcome');
    }else{
      node=doc.createElement('span');
      node.className='sgv-pot-fly sgv-static-outcome';
      node.textContent=summary.pourFly.initial;
      node.setAttribute('aria-hidden','true');
    }
    Object.assign(node.style,{
      left:origin.x+'px',top:(origin.y-8)+'px',
      transform:summary.pourFly.rich?'translateX(-50%)':undefined
    });
    root.appendChild(node);
    nodes.push(node);
  }
  if(summary.flower){
    const pill=root.querySelector('[data-factor="swing"]');
    const origin=pill?point(pill,root):{x:root.clientWidth/2,y:root.clientHeight*.4};
    const node=placeStaticFactor(root,'swing',{x:origin.x,y:origin.y+28});
    if(node)nodes.push(node);
  }
  if(summary.bee){
    const pill=root.querySelector('[data-factor="flip"]');
    const origin=pill?point(pill,root):{x:root.clientWidth/2,y:root.clientHeight*.4};
    const node=placeStaticFactor(root,'flip',{x:origin.x,y:origin.y+28});
    if(node)nodes.push(node);
  }
  const clear=()=>removeNodes(nodes);
  const cancel=replaceStatic(clear);
  const hold=summary.pourFly?.rich?6600:STATIC_OUTCOME_MS;
  const timer=setTimeout(cancel,hold);
  return ()=>{clearTimeout(timer);cancel();};
}
function showReducedBank(root,fromScore,toScore){
  const summary=reducedBankSummary(fromScore,toScore);
  if(!root||!summary.gain)return ()=>{};
  const mouth=root.querySelector('.sgv-chest-mouth')||root.querySelector('.sgv-chest-body');
  const origin=mouth?point(mouth,root):{x:root.clientWidth*.7,y:root.clientHeight*.55};
  const node=placeStatic(root,'sgv-bank-score-fly',summary.gain,origin);
  const clear=()=>node.remove();
  const cancel=replaceStatic(clear);
  const timer=setTimeout(cancel,STATIC_OUTCOME_MS);
  return ()=>{clearTimeout(timer);cancel();};
}

export {showReducedCard,showReducedBank};
