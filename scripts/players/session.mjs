// Campaign transitions. A win is the only way to advance. Retry exhaustion ends the session.

function advance(session,levelCount){
  session.securedWin=false
  session.hiveReplaysUsed=0
  session.levelFails=0
  session.consecutiveFails=0
  session.tryAgainsUsed=0
  if(session.levelId>=levelCount){
    session.completed=true
    session.alive=false
    session.quitReason=null
    session.quitLevel=null
    return {type:'complete'}
  }
  session.levelId+=1
  return {type:'advance'}
}

export function stopSession(session,reason,levelId){
  session.alive=false
  session.completed=false
  session.quitReason=reason
  session.quitLevel=levelId
}

export function openAttempt(profile,session){
  if(profile.sessionAttemptBudget!=null&&session.attempts>=profile.sessionAttemptBudget){
    return {type:'quit',reason:'attempt-budget'}
  }
  return null
}

function afterJar(profile,session,outcome,levelCount){
  if(outcome.win&&outcome.honey>=3){
    session.consecutiveNonHive=0
    return advance(session,levelCount)
  }
  if(!session.securedWin){
    if(!outcome.win){
      session.levelFails++
      if(session.levelFails>=profile.maxFailedAttempts)return {type:'quit',reason:'fail-budget'}
      return {type:'retry'}
    }
    session.securedWin=true
    session.levelFails=0
    session.hiveReplaysUsed=0
  }
  if(session.hiveReplaysUsed<profile.hiveReplays){
    session.hiveReplaysUsed++
    return {type:'replay'}
  }
  session.consecutiveNonHive++
  if(session.consecutiveNonHive>=profile.quitAfterConsecutiveNonHiveLevels){
    return {type:'quit',reason:'consecutive-non-hiveful'}
  }
  return advance(session,levelCount)
}

function afterPlanner(profile,session,outcome,levelCount){
  if(outcome.win&&outcome.honey>=3)return advance(session,levelCount)
  if(!session.securedWin){
    if(!outcome.win)return {type:'retry'}
    session.securedWin=true
    session.hiveReplaysUsed=0
  }
  if(session.hiveReplaysUsed<profile.hiveReplays){
    session.hiveReplaysUsed++
    return {type:'replay'}
  }
  return advance(session,levelCount)
}

function afterSaver(profile,session,outcome,levelCount){
  if(outcome.win)return advance(session,levelCount)
  session.consecutiveFails++
  if(session.consecutiveFails>=profile.quitConsecutiveFails){
    return {type:'quit',reason:'consecutive-fails'}
  }
  if(session.tryAgainsUsed>=profile.tryAgains)return {type:'quit',reason:'try-again-cap'}
  session.tryAgainsUsed++
  return {type:'retry'}
}

function afterFirst(profile,session,outcome,levelCount){
  if(outcome.win)return advance(session,levelCount)
  session.consecutiveFails++
  if(session.consecutiveFails>=profile.quitConsecutiveFails){
    return {type:'quit',reason:'consecutive-fails'}
  }
  return {type:'retry'}
}

function afterNervous(profile,session,outcome,levelCount){
  if(outcome.bigSnapQuit)return {type:'quit',reason:'big-snap'}
  if(outcome.win){
    session.consecutiveFails=0
    return advance(session,levelCount)
  }
  session.consecutiveFails++
  session.sessionFails++
  if(session.consecutiveFails>=profile.quitConsecutiveFails){
    return {type:'quit',reason:'consecutive-fails'}
  }
  if(session.sessionFails>=profile.sessionFailBudget){
    return {type:'quit',reason:'session-fails'}
  }
  return {type:'retry'}
}

const AFTER={
  jar:afterJar,
  planner:afterPlanner,
  saver:afterSaver,
  first:afterFirst,
  nervous:afterNervous
}

export function afterAttempt(profile,session,outcome,levelCount){
  const decide=AFTER[profile.id]
  if(!decide)throw new Error('No session rules for '+profile.id)
  return decide(profile,session,outcome,levelCount)
}

export function freshSession(sessionIdx){
  return {
    sessionIdx,levelId:1,alive:true,attempts:0,attemptInSession:0,
    hints:0,furthest:0,lastPlayed:0,completed:false,
    quitReason:null,quitLevel:null,played:new Set(),
    consecutiveFails:0,sessionFails:0,levelFails:0,
    securedWin:false,hiveReplaysUsed:0,consecutiveNonHive:0,tryAgainsUsed:0
  }
}
