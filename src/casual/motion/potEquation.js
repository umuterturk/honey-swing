import {factorByKind} from '../factors.js';
import {publicUrl} from '../publicUrl.js';
function mountPotEquationFlyer(doc,data){
  const label=doc.createElement('span');
  label.className='sgv-pot-fly sgv-pot-fly-equation';
  label.setAttribute('aria-hidden','true');
  const rank=doc.createElement('span');
  rank.className='sgv-pot-eq-rank';
  rank.textContent=String(data.rank);
  label.append(rank);
  for(const term of data.terms){
    const wrap=doc.createElement('span');
    wrap.className='sgv-pot-eq-term';
    const mul=doc.createElement('span');
    mul.className='sgv-pot-eq-mul';
    mul.textContent='×';
    const icon=factorByKind(term.kind)?.icon;
    if(icon){
      const img=doc.createElement('img');
      img.className='sgv-pot-eq-icon sgv-pot-eq-icon-'+term.kind;
      img.src=publicUrl(icon);
      img.alt='';
      img.draggable=false;
      wrap.append(mul,img);
    }else{
      wrap.append(mul);
    }
    const val=doc.createElement('span');
    val.className='sgv-pot-eq-factor';
    val.textContent='×'+term.value;
    wrap.append(val);
    label.append(wrap);
  }
  const arrow=doc.createElement('span');
  arrow.className='sgv-pot-eq-arrow';
  arrow.textContent='→';
  const res=doc.createElement('span');
  res.className='sgv-pot-eq-result';
  res.textContent='+'+data.added;
  label.append(arrow,res);
  return label;
}

export {mountPotEquationFlyer};
