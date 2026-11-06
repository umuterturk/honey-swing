// Layer-local CSS pixels. Viewport client rects are shifted by the FX
// layer's own bounding-rect origin. Honey flight and signature anchors share this.
export function centerOf(node,layer){
  const rect=node?.getBoundingClientRect?.();
  if(!rect)return null;
  const width=rect.width||0;
  const height=rect.height||0;
  const left=Number.isFinite(rect.left)?rect.left:(rect.x||0);
  const top=Number.isFinite(rect.top)?rect.top:(rect.y||0);
  if(!(width||height||left||top))return null;
  const origin=layer?.getBoundingClientRect?.();
  const originX=origin&&Number.isFinite(origin.left)?origin.left:(origin?.x||0);
  const originY=origin&&Number.isFinite(origin.top)?origin.top:(origin?.y||0);
  return {x:left+width/2-originX,y:top+height/2-originY};
}
