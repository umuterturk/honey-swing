import {createElement} from 'react';
import {publicUrl} from './publicUrl.js';

export function VictoryJarArt({
  fillPercent=0,
  className='',
  showIdleStars=false,
  mouthClassName='sgv-chest-mouth'
}){
  const fill=Math.max(0,Math.min(100,Number(fillPercent)||0));
  return createElement('div',{
    className:'sgv-chest-art sgv-victory-jar-art '+className,
    'aria-hidden':'true'
  },
  createElement('img',{
    className:'sgv-jar-layer sgv-jar-back',
    src:publicUrl('empty-complete-jar.png'),alt:'',draggable:false
  }),
  createElement('div',{className:'sgv-jar-mask sgv-jar-honey-layer'},
    createElement('div',{className:'sgv-fluid-fill',style:{height:fill+'%',opacity:fill>0?1:0}},
      createElement('span',{className:'sgv-fluid-surface'}),
      createElement('span',{className:'sgv-fluid-bubble sgv-fluid-bubble-a'}),
      createElement('span',{className:'sgv-fluid-bubble sgv-fluid-bubble-b'}),
      createElement('span',{className:'sgv-fluid-bubble sgv-fluid-bubble-c'})
    )
  ),
  createElement('div',{className:'sgv-jar-mask sgv-jar-lights','aria-hidden':'true'},
    createElement('span',{className:'sgv-honey-internal-light'}),
    createElement('span',{className:'sgv-honey-reflection'}),
    createElement('span',{className:'sgv-honey-gleam-sweep'})
  ),
  createElement('img',{
    className:'sgv-jar-layer sgv-jar-front',
    src:publicUrl('empty-front-jar.png'),alt:'',draggable:false
  }),
  showIdleStars?createElement('div',{className:'sgv-honey-idle-stars','aria-hidden':'true'},
    createElement('span',{className:'sgv-honey-idle-star sgv-honey-idle-star-a'},'✦'),
    createElement('span',{className:'sgv-honey-idle-star sgv-honey-idle-star-b'},'✦'),
    createElement('span',{className:'sgv-honey-idle-star sgv-honey-idle-star-c'},'✦'),
    createElement('span',{className:'sgv-honey-idle-star sgv-honey-idle-star-d'},'✦'),
    createElement('span',{className:'sgv-honey-idle-star sgv-honey-idle-star-e'},'✦'),
    createElement('span',{className:'sgv-honey-idle-star sgv-honey-idle-star-f'},'✦')
  ):null,
  createElement('span',{className:mouthClassName})
  );
}
