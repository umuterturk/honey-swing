import {publicUrl} from './publicUrl.js';

export const FACTOR_INFO=Object.freeze({
  swing:Object.freeze({
    kind:'swing',
    title:'More Flower',
    copy:'Cross 0 for more flowers.',
    iconSrc:publicUrl('celebration/daisy-2.png'),
    buttonLabel:'Got it'
  }),
  flip:Object.freeze({
    kind:'flip',
    title:'More Bee',
    copy:'Flip for more bees.',
    iconSrc:publicUrl('bee-smiling-closed-eyes.png'),
    buttonLabel:'Got it'
  })
});

export function factorInfoFor(kind){
  return FACTOR_INFO[kind]||null;
}
