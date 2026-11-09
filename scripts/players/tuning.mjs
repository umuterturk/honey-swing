// Change a profile here and both modes pick it up.
// Defaults approved by Umut on 2026-11-09 (profiles + 9 question defaults). Model output, not measured player data.

export const HARNESS_VERSION=1
export const ENGINE_BASELINE='823a67f8a2fd2bbab840fbfe166edc77d0d310e3'

// mulberry32(SEED_BASE + 1_000_000*profileIndex + 1_000*levelId + runIdx)
export const SEED_BASE=20261109
export const MODE_A_ATTEMPTS=1000
export const MODE_B_SESSIONS=1000
// Mode B runIdx = modeAAttempts + sessionIdx * stride + attemptInSession.
// Stride stays above any session's attempt count so two sessions cannot share a seed.
export const CAMPAIGN_SEED_STRIDE=1000
export const MAX_STEPS=64
export const BIG_SNAP_FRACTION=0.5
export const PLANNER_DEPTH=3

export const PROFILES=Object.freeze([
  Object.freeze({
    index:0,id:'jar',name:'Jar Chaser',role:'risk-taker',
    epsilon:0.05,pKnownSnap:0.25,
    hiveReplays:3,maxFailedAttempts:4,
    quitAfterConsecutiveNonHiveLevels:2,sessionAttemptBudget:40,
    episodeFailCap:4
  }),
  Object.freeze({
    index:1,id:'saver',name:'Save-Spammer',role:'greedy',
    epsilon:0.03,tryAgains:3,quitConsecutiveFails:3,
    episodeFailCap:3
  }),
  Object.freeze({
    index:2,id:'first',name:'First-Timer',role:'novice',
    epsilon:0.10,pIdle:0.30,pMisread:0.15,
    quitConsecutiveFails:3,sessionAttemptBudget:25,
    episodeFailCap:3
  }),
  Object.freeze({
    index:3,id:'planner',name:'Puzzle Planner',role:'optimiser',
    epsilon:0.02,depth:PLANNER_DEPTH,
    hiveReplays:5,sessionAttemptBudget:100,
    episodeFailCap:100
  }),
  Object.freeze({
    index:4,id:'nervous',name:'Nervous Satisficer',role:'snap-averse',
    epsilon:0.05,flipAvoidAt:4,
    quitConsecutiveFails:2,sessionFailBudget:3,
    bigSnapFraction:BIG_SNAP_FRACTION,
    episodeFailCap:2
  })
])

export function profileById(id){
  const found=PROFILES.find(profile=>profile.id===id)
  if(!found)throw new Error('Unknown profile '+id)
  return found
}

// Stable notes for facts the rules do not settle. Kept here so the report quotes one source.
export const ASSUMPTIONS=Object.freeze([
  'Q2: only Puzzle Planner averages a Flip over the remaining cards. Other profiles never step a Flip to preview the hidden card. After a hypothetical Flip, cards still left are ordered by ascending id, so the real deck order is not an input.',
  'Q6: on L1-L15 garden data sets potCap equal to target, so one Save cannot score above the target. The code does not say whether Amber or Hiveful therefore requiring an earlier Save is intended. This harness measures that pattern and does not call it a defect.',
  'Q7: showChances (true from L11) draws remaining hearts and marks hand cards that would snap. It does not show a numeric chance for the hidden Flip. Profiles do not invent a Flip chance from that flag. Known hand snaps use wouldSnap, the same fact the card value and meter already show.',
  'Q8: figures below are measurements under the current rules. Older star-threshold notes are not a pass or fail oracle.',
  'Q9: there is no uniform-random baseline. The run is the five approved profiles only.',
  'Save-Spammer keeps tryAgains 3 and quitConsecutiveFails 3. On an all-fail streak the consecutive-fail rule ends the session on the third fail, so a third TRY AGAIN is not taken.',
  'Jar Chaser maxFailedAttempts is the number of failed attempts on a level before the session stops. Hiveful replays are extra attempts after a non-Hiveful win and do not spend that fail budget. A campaign never skips a level: retries without a win end the session.',
  'Every profile Saves when Save is the only legal action. Jar Chaser also takes a non-snap exact zero while a level still locks Save behind the first zero break.',
  'Puzzle Planner pre-banks for a two-Save line only when one capped pot cannot reach star3 (star3 minus secured is greater than potCap). When one capped pot is exactly enough, that pot is not split.',
  'lostPayout is the engine field lastAction.lostPayout (rank-sum of the pot times the multiplier at the Snap). Nervous Satisficer compares that field with bigSnapFraction times the level target.',
  'Mode B uses the same seed formula as Mode A. Its runIdx is modeAAttempts + sessionIdx * campaignSeedStride + attemptInSession.'
])
