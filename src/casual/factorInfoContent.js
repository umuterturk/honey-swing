import {FACTORS} from './factors.js';
import {publicUrl} from './publicUrl.js';

export const FACTOR_INFO=Object.freeze(Object.fromEntries(
  FACTORS.filter(factor=>factor.info).map(factor=>[factor.kind,Object.freeze({
    kind:factor.kind,
    title:factor.flyer,
    copy:factor.copy,
    iconSrc:publicUrl(factor.icon),
    buttonLabel:'Got it'
  })])
));

export function factorInfoFor(kind){
  return FACTOR_INFO[kind]||null;
}
