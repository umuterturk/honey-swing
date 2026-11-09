// Simulator fingerprint with the hand sorted and discard dropped. Hand order is
// not a second rules path: Steer removes one id and the engine keeps the rest
// in deck order, so the sorted id list is the position.
export function canonicalKey(round){
  const d=round.game.deal;
  return JSON.stringify({
    levelId:round.levelId,turn:round.turn,snaps:round.snaps,
    flipCount:round.flipCount,zeroBreakCount:round.zeroBreakCount,
    status:round.game.status,
    T:d.T,S:d.S,W:d.W,flips:d.flips,plays:d.plays,
    flipFactor:d.flipFactor,
    flipStreak:d.flipStreak,bankCount:d.bankCount,handCap:d.handCap,
    potValue:d.potValue??null,
    pot:d.pot,hand:d.hand.slice().sort((a,b)=>a-b),pos:d.pos
  });
}
