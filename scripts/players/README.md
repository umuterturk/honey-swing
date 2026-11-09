# Player-profile simulation

A read-only harness over the casual engine. It does not change level data, scoring, or the casual breadth-first simulator.

```bash
npm run simulate:players
```

That is `node scripts/simulate-players.mjs`. It plays all five profiles on every level in `GARDEN` (1 through `ONBOARDING_COUNT`) and writes one JSON report to stdout. Same seed, same bytes.

Smaller runs, for a smoke check:

```bash
node scripts/simulate-players.mjs --attempts 2 --sessions 1
```

`--attempts` is Mode A (fresh deal per level). `--sessions` is Mode B (a campaign that starts at level 1). Defaults are 1000 and 1000. Knobs live in `scripts/players/tuning.mjs`.

`npm test` runs `tests/player-sim.test.mjs` with the rest of the suite.

## Modes

- **Mode A.** Each profile plays every level from a new round. Quit rules do not skip a level. The report's `modeA.levels[]` rows are the per-level results.
- **Mode B.** Each profile plays seeded campaigns from level 1, advancing only after a win and stopping by that profile's retry and quit rules. Levels a campaign never reaches stay in Mode A. `modeB.reached` is how many sessions started each level. `modeB.quitReason` and `modeB.quitLevel` are where a session stopped. `modeB.lastPlayed` is the last level a session actually dealt.

## How to read a level row

`honey` is four counts, tiers 0, 1, 2, 3. Tier 0 is not a win. On a win, tier 1 is Nectar, 2 is Amber, 3 is Hiveful (`honeyTier`).

`winRate` is wins / attempts, rounded to 6 decimal places. Counts (`attempts`, `wins`, `honey`, `snapTotal`, `failCause`) are exact.

`score.median`, `p75`, and `p90` are nearest-rank quantiles of secured `deal.T` over every attempt, wins and losses together. `shortfallToStar2` is `star2 - median` (positive means the median is under that threshold). `shortfallToMaxWin` uses the highest winning total the harness found by search.

`failCause.snap` is a second Snap. `exhausted` means the deal ended under the target. `stuck` means no legal action and the round was not finished. `stepCap` means the 64-step cap. A run with any step-cap stop throws instead of printing a report.

`preBankWins` counts wins that Saved at least twice. `potOverflows` counts engine `potOverflow` flags. `lostPayoutTotal` sums `lastAction.lostPayout` on Snaps.

`attemptsToFirstWin` (Mode A only) walks the attempt list in seed order and stops an episode at the first win or at `episodeFailCap` failures.

## Seeds

`mulberry32(seedBase + 1000000*profileIndex + 1000*levelId + runIdx)` via the engine's `seeded` helper.

Mode A `runIdx` is the attempt index, starting at 0. Mode B `runIdx` is `modeAAttempts + sessionIdx*campaignSeedStride + attemptInSession`.

Profiles, in index order: Jar Chaser, Save-Spammer, First-Timer, Puzzle Planner, Nervous Satisficer.

## What the run checks

Before it prints, the harness checks that `GARDEN` and `ONBOARDING_LEVELS` are frozen, that `GARDEN`'s JSON is unchanged, that every level 1..`ONBOARDING_COUNT` was played in Mode A, that no attempt hit the step cap without a terminal round, and that `simulateOnboardingLevel` still returns the same JSON as it did before the profiles ran. `clearWinMemo()` runs at each level boundary because the idle-hint helper keeps a cache.
