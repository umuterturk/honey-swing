import test from 'node:test';
import assert from 'node:assert/strict';
import {ONBOARDING_COUNT} from '../../src/casual/onboardingLevels.js';
import {PROFILES,SEED_BASE} from './tuning.mjs';
import {seedFor,modeBRunIdx,rngFor} from './rng.mjs';
import {playAttempt} from './playout.mjs';
import {runPlayerSim} from './run.mjs';
import {renderReport} from './report.mjs';

test('seed formula matches the approved scheme',()=>{
  assert.equal(seedFor(0,1,0),(SEED_BASE+1_000)>>>0)
  assert.equal(seedFor(4,20,999),(SEED_BASE+4_000_000+20_000+999)>>>0)
  assert.equal(modeBRunIdx(1000,2,3,1000),3003)
  assert.throws(()=>modeBRunIdx(1000,0,1000,1000))
})

test('every profile wins Level 1',()=>{
  for(const profile of PROFILES){
    for(let runIdx=0;runIdx<20;runIdx++){
      const outcome=playAttempt(profile,1,rngFor(profile.index,1,runIdx))
      assert.equal(outcome.win,true,profile.id+' run '+runIdx)
      assert.equal(outcome.honey,3,profile.id)
      assert.equal(outcome.stepCapped,false,profile.id)
      assert.equal(outcome.failCause,null,profile.id)
    }
  }
})

test('a reduced run is deterministic and covers every level',()=>{
  const options={attempts:1,sessions:1,guards:true}
  const first=renderReport(runPlayerSim(options))
  const second=renderReport(runPlayerSim(options))
  assert.equal(first,second)
  const report=JSON.parse(first)
  assert.equal(report.guards.onboardingCount,ONBOARDING_COUNT)
  assert.equal(report.guards.gardenUnchanged,true)
  assert.equal(report.guards.simulateCasualMatched,true)
  assert.equal(report.guards.stepCapNonTerminal,0)
  assert.equal(report.coverage.length,ONBOARDING_COUNT)
  assert.equal(report.profiles.length,PROFILES.length)
  for(const profile of report.profiles){
    assert.equal(profile.modeA.levels.length,ONBOARDING_COUNT)
    profile.modeA.levels.forEach((level,index)=>{
      assert.equal(level.levelId,index+1)
      assert.equal(level.attempts,1)
      assert.equal(level.failCause.stepCap,0)
    })
    assert.equal(profile.modeB.sessions,1)
    assert.ok(profile.modeB.completed===1||profile.modeB.quitReason.length>=1)
  }
})
