// Sockets stay put. A played card becomes a closed cell in its own socket.
// Any card that is not already sitting in an open socket starts a fresh sorted row.
export function nextHandSlots(previous, cards, capacity, layoutKey){
  const count=Math.max(0, capacity|0);
  const incoming=Array.isArray(cards)?cards:[];
  const openIds=new Set(
    previous?.slots?.filter(slot=>slot.kind==='card').map(slot=>slot.id)??[]
  );
  const sameRow=previous
    &&previous.key===layoutKey
    &&previous.capacity===count
    &&incoming.every(card=>openIds.has(card.id));
  if(!sameRow){
    const sorted=incoming.slice().sort((a,b)=>a.value-b.value||(a.order??a.id)-(b.order??b.id));
    const slots=sorted.map(card=>({kind:'card', id:card.id, value:card.value}));
    for(let index=slots.length; index<count; index++){
      slots.push({kind:'closed', key:'pad-'+index});
    }
    return {key:layoutKey, capacity:count, slots};
  }
  const live=new Map(incoming.map(card=>[card.id, card]));
  return {
    key:layoutKey,
    capacity:count,
    slots:previous.slots.map(slot=>{
      if(slot.kind==='closed')return slot;
      const card=live.get(slot.id);
      if(!card)return {kind:'closed', key:'closed-'+slot.id};
      return {kind:'card', id:card.id, value:card.value};
    })
  };
}
