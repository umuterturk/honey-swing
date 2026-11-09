import {fluidFillPercent} from '../presentation.js';

// All motions are presentation only. The game transaction is calculated once
// before these modules are called; interrupting an animation never changes rules.
const reducedMotion=()=>typeof window!=='undefined'&&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const point=(node,root)=>{
  const a=node.getBoundingClientRect(),b=root.getBoundingClientRect();
  return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2};
};
// Top of the honey meniscus — geometric center sinks into the fluid.
const honeySurfacePoint=(root,jar,fallback)=>{
  const surface=jar?.querySelector?.('.sgv-fluid-surface');
  const fill=jar?.querySelector?.('.sgv-fluid-fill');
  const node=surface||fill||fallback;
  if(!node)return null;
  const a=node.getBoundingClientRect(),b=root.getBoundingClientRect();
  return {x:a.left-b.left+a.width/2,y:a.top-b.top+(surface?1:0)};
};
const tapSpoutPoint=(root,tap)=>{
  const a=tap.getBoundingClientRect(),b=root.getBoundingClientRect();
  return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height*.88};
};
const pourStreamPath=(start,end)=>{
  const dx=end.x-start.x,dy=end.y-start.y;
  return 'M '+start.x+' '+start.y+' C '+(start.x+dx*.36)+' '+(start.y-8)+
    ', '+(end.x-dx*.25)+' '+(end.y-Math.max(6,dy*.20))+', '+end.x+' '+end.y;
};
// Mount the pour SVG in the jar honey slot (under front glass) while keeping
// path coordinates in phone-root space via a compensating offset.
const appendPourStreamAtHoneyDepth=(root,jar,doc)=>{
  const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('sgv-pour-stream');
  svg.setAttribute('viewBox','0 0 '+root.clientWidth+' '+root.clientHeight);
  svg.setAttribute('width',root.clientWidth);
  svg.setAttribute('height',root.clientHeight);
  svg.setAttribute('aria-hidden','true');
  const art=jar?.querySelector?.('.sgv-victory-jar-art');
  if(art){
    const rootRect=root.getBoundingClientRect();
    const artRect=art.getBoundingClientRect();
    Object.assign(svg.style,{
      left:(rootRect.left-artRect.left)+'px',
      top:(rootRect.top-artRect.top)+'px',
      width:root.clientWidth+'px',
      height:root.clientHeight+'px'
    });
    const lights=art.querySelector('.sgv-jar-lights');
    if(lights)art.insertBefore(svg,lights);
    else{
      const honey=art.querySelector('.sgv-jar-honey-layer');
      if(honey)honey.after(svg);
      else art.appendChild(svg);
    }
  }else{
    root.appendChild(svg);
  }
  return svg;
};
const paintJarFill=(jar,secured,fillTarget,{max=76,smooth=true}={})=>{
  const fillEl=jar?.querySelector?.('.sgv-fluid-fill');
  if(!fillEl||!Number.isFinite(fillTarget)||fillTarget<=0)return;
  const pct=fluidFillPercent(secured,fillTarget,{max,smooth});
  fillEl.style.height=pct+'%';
  fillEl.style.opacity=pct>0?'1':'0';
};
const removeNodes=nodes=>nodes.forEach(node=>node?.remove());
let clearStatic=()=>{};
function replaceStatic(clear){
  clearStatic();
  const cancel=()=>{
    clear();
    if(clearStatic===cancel)clearStatic=()=>{};
  };
  clearStatic=cancel;
  return cancel;
}
function placeStatic(root,className,text,origin){
  const node=document.createElement('span');
  node.className=className+' sgv-static-outcome';
  node.textContent=text;
  node.setAttribute('aria-hidden','true');
  Object.assign(node.style,{left:origin.x+'px',top:origin.y+'px'});
  root.appendChild(node);
  return node;
}

export {
  reducedMotion,point,honeySurfacePoint,tapSpoutPoint,pourStreamPath,
  appendPourStreamAtHoneyDepth,paintJarFill,removeNodes,
  clearStatic,replaceStatic,placeStatic
};
