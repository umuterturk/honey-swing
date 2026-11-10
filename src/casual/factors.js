// Words, icons, and the deal fields the board reads. Scoring stays in the engine.
export const FACTORS=Object.freeze([
  Object.freeze({
    kind:'swing',
    dealField:'W',
    dealAdd:1,
    gainedFlag:'swingTierGained',
    rulesFlag:'enableSwingFactor',
    label:'Swing multiplier',
    copy:'Cross 0 for more flowers.',
    icon:'celebration/daisy-2.webp',
    iconClass:'sgv-multiplier-daisy',
    equationOrder:0,
    pillOrder:0,
    flyer:'More Flower',
    introId:'swing',
    info:true,
    dock:'swing',
    outcome:'cross',
    outcomeOrder:0,
    flyerAt:'cross',
    flyerFrom:'marker',
    hold:0.05
  }),
  Object.freeze({
    kind:'flip',
    dealField:'flipFactor',
    dealAdd:0,
    gainedFlag:'flipTierGained',
    rulesFlag:'enableFlipFactor',
    label:'Flip multiplier',
    copy:'Flip for more bees.',
    icon:'bee-smiling-closed-eyes.webp',
    iconClass:'sgv-multiplier-bee',
    equationOrder:1,
    pillOrder:2,
    flyer:'More Bee',
    introId:'flip_mult',
    info:true,
    dock:'flip-pill',
    outcome:'flipFactor',
    outcomeOrder:1,
    flyerAt:'face',
    flyerFrom:'flip-button',
    hold:0
  })
]);

export function factorByKind(kind){
  return FACTORS.find(factor=>factor.kind===kind)||null;
}

export function dealValue(factor,deal){
  const raw=Number(deal?.[factor.dealField]);
  return (Number.isFinite(raw)?raw:0)+factor.dealAdd;
}

export function equationKinds(){
  return FACTORS.slice().sort((a,b)=>a.equationOrder-b.equationOrder).map(factor=>factor.kind);
}
