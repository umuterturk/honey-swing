// One shape and one shade scale for both dealt and revealed cards.
// Direction is based on the signed engine value, never on card suit or ID.
export const CARD_ARROW_PATH='M8 20 H47 V7 L73 29 L47 51 V38 H8 Z';
export const cardDirection=value=>value<0?'left':'right';

// Shade 1–6 follows |value|. A value outside that range clamps; the numeral stays true.
export function cardShade(value){
  const magnitude=Number.isFinite(value)?Math.abs(value):1;
  return Math.min(6, Math.max(1, Math.round(magnitude)));
}
