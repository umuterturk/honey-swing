# Honey Swing — Garden 1 Level Design

**Status:** Proposed design. Payouts below were enumerated under the new scoring rule plus the current engine's cross test, Bank gate, and hand refill. Not implemented. Not playtested.  
**Date:** 6 November 2026  
**Replaces (intent):** the ten-level onboarding in `src/casual/onboardingLevels.js` and the historical plan in `docs/swing-casual-onboarding.md`.  
**Depends on:** a **scoring change** and a **`flipOnly` refill gate** (below). Current engine `overswingPayout` (`sum(ranks) × M`) cannot ship these targets honestly.

Garden 1 **is the game**. The player should not feel they are in a tutorial. No lesson chrome, no dimmed fake-hand, no text walls. New board pieces **dock** like pickups. Guidance is pulse and juice only.

A strict cross is the only Swing. Two opposite cards never cross in both orders: the larger one has to be played second. Leaving 0 is not a cross. Landing on 0 is not a cross. Decks below are built to that test.

---

## 1. Product contract

- Full real board from Level 1: header, numbered meter, playable hand, pending Pot, secured Bank, dedicated BANK. Reduce **choices**, not the board.
- First tap in ≤ 5 seconds with zero reading. Inactivity pulse at ~3s, never a modal.
- Level 1 won in ≤ 30 seconds, several paths, no realistic loss.
- One new thing at a time: introduce → use safely → combine → (later) test.
- No forced Snap. The taught Snap is recoverable. A second Snap ends the level.
- Hidden mechanics are **engine-disabled**, not merely undrawn.
- Honest numbers: every displayed Pot/Bank value equals the engine.
- After Level 12, a real next garden exists. Do not end on Replay Challenge.
- Skip lives in overflow after Level 3, never before the first tap. Skip goes to **L13**, not to L12.

---

## 2. Scoring change (do this before any new decks)

### Problem

The Pot UI shows **projected Bank payout** `raw × current multiplier`. When multipliers reset (Zero Break), the **displayed Pot drops** even though the cards are still there. That reads as a loss.

### New rule

Multipliers apply only to the **card just played**. The Pot is a running total. It never goes down except on **Snap** (empty) or **Bank** (transfer).

Example: Pot `20`, board multiplier `×6`, play a `5`:

```text
Pot → 20 + 6×5 = 50
```

### Resolution order (casual Garden rules)

After a **safe** Steer or Flip:

1. Move the meter. If Snap (`|next| > snapLimit`): Pot `= 0`, factors reset, Banked gold unchanged. Stop.
2. A **strict cross** is `S ≠ 0`, `next ≠ 0`, and the signs differ. Leaving 0 is not a cross. Landing on 0 is not a cross.
3. Update factors from this play. On an exact zero, skip this step (the add uses the multiplier already on the board):
   - Strict cross on **Steer or Flip** adds Swing gain `max(1, floor(|S| / 3))` to `W`. Every Garden 1 cross starts from `|S| ≤ 5`, so the gain is **+1** and the pill goes `×1 → ×2` on the first cross.
   - Strict cross on **Flip** also takes the Flip step below. The streak is **not** reset. There is no Jackpot factor.
   - Safe non-crossing Flip takes the same Flip step: `streak++`, `flipFactor = max(flipFactor, streak + 1)`.
   - A Steer resets the Flip streak and does **not** reset `flipFactor`. It does not grow Flip.
4. `M = (W + 1) × flipFactor`
5. Exact zero: add using that `M`, then reset every factor to `×1`. Pot holds.
6. `Pot += M × rank`  
   The card that earned a bonus is paid at the **new** M.

Bank transfers `Pot` as-is, then resets the meter and the factors (`clearSwing`). The next swing starts at 0. UI: the Pot number **is** the Bank number.

### Casual rule flags (unchanged defaults unless a level says otherwise)

```text
snapLimit: 8
steerAlwaysToPot: true
steerNoncrossPenalty: 0
flipNoncrossPenalty: 0
bankCapacityLoss: 0
enableResonance: false
flipOnly: false
```

`flipOnly: true` (L5–L8 and L12): undealt cards are played only by Flip. `refillEmptyHand` must not draw them. An empty hand with cards still in the pile is not a soft-lock — Flip stays legal. This is a casual teaching gate. Overswing defaults stay `flipOnly: false`.

BANK still requires a non-empty Pot and **two plays** this swing (or an empty deck and an empty hand). Engine `initialHandSize` remains 2–8. Do not spec 1-card engine hands. Do not use `requiresFlip`: emptying the hand used to eat the pile and then block Bank forever.

### Display invariants

- Pot and BANK show the same integer when Bank is legal.
- Zero Break: pills return to `×1`; Pot **holds**; no glass fracture; not red.
- Snap: Pot empties; secured glass does not shake or drain.
- Flying `+N` into the Pot is the **multiplied** add (e.g. crossing `−5` at `×2` flies `+10`).
- Cross FX (tier 3) plays only when Swing is enabled **and** this play was a strict cross. L2 can pass the middle with Swing off; that is meter motion only.

Overswing campaign defaults must stay untouched, including `jackpotFactor` on a crossing Flip when `enableJackpotFactor` is on. Garden 1 sets that flag **off**. The Flip step on a crossing Flip applies only while `runningPot` is on and Jackpot is off. This is a **casual-rules** payout, not a silent global rewrite.

---

## 3. Curve map — Garden 1 (Levels 1–12)

| Lv | Name | Role | New on board | Intended feeling | First-try | Slack | Aha | Hook to next |
|---:|---|---|---|---|---:|---|---|---|
| 1 | Honey Drop | Teach | — | Delight | 100% | High | — | Glass wants more |
| 2 | Two Ways | Practice | — | Both ways work | 98% | High | Left card still fills Pot | — |
| 3 | The Crossing | Teach | Swing pill docks `×1` | Punch | 100% | High | Minus card pays double | Pill wants another tick |
| 4 | Either Side | Practice | — | Choice | 95% | High | Minus after a small plus pays more | — |
| 5 | Mystery Card | Teach | Flip docks | Curiosity | 100% | High | Hidden card is a real play | — |
| 6 | Hot Streak | Teach | Flip pill docks `×1` | Streak | 100% | High | Second Flip pays more | — |
| 7 | Sweet Mix | Combine | — | Clever, safe | 95% | High | Cross or Flip, cross is richer | L8 docks the third pill |
| 8 | Golden Flip | Combine | — | Explosion | 100% | High | Flip through the middle ticks both pills | — |
| 9 | Easy Garden | Relief | — | Easy wealth | 95% | High | — | Next hand looks precise |
| 10 | Perfect Stop | Teach | — | Soft surprise | 95% | Med | Hit the middle, Pot stays | — |
| 11 | Edge of the Jar | Teach | 2 hearts + edge warn | Tension, then relief | 90% | Med | Red card Snaps; glass stays | One heart left |
| 12 | The Big Jar | Light test | — | I play this | 75% | Low–med | Flip after a plus, not before | **Lower Orchard** (L13+) |

**Spikes:** none until 11–12. L11 is a teach with a real, recoverable miss. L12 is the first light test.  
**Relief:** 9 after the crossing Flip.  
**Unlocks (quiet dock, skippable, ~0.8s, no copy):** L3 Swing, L5 Flip, L6 Flip×, L11 hearts, L12 → Garden 2. No empty pill socket before its dock. L8 docks nothing: both pills are already on the board.

### Mechanic arcs

| Mechanic | Teach | Practice | Combine / use |
|---|---|---|---|
| Pot → Bank | 1 | 2 | all later |
| Signed direction | 2 | — | — |
| Swing (pass the middle) | 3 | 4 | 7, 9, 12 |
| Flip control | 5 | 6 (by using it) | 7, 12 |
| Flip multiplier | 6 | 7 | 8, 12 |
| Crossing Flip (Swing and Flip both step) | 8 | — | 12 |
| Zero Break | 10 | — | later gardens |
| Snap | 11 | — | later gardens |

### What the player never sees

- Tutorial titles, lesson strings, help overlay on L1–4
- Dimmed extra cards / `visibleHandSlots: 1`
- Flip button with `0 left`
- A Jackpot pill, or any third multiplier
- Pot dropping when a pill resets
- Fracture FX on Zero
- Cross FX while Swing is off
- Replay Challenge as the product

Idle 3s: pulse the next legal control. One word may pop **on the object** (`BANK`, `CROSS`, `×2`, `SNAP`). No banners on L1–3.

Hand order is deck order, left to right. The pulsed card is the left one unless a level says otherwise.

---

## 4. Card encoding (engine)

Ordinary id `0–39`: `rank = id % 10 + 1`, `suit = floor(id / 10)`, signed positive if `suit < 2`.

| Face | Ids used in Garden 1 |
|---|---|
| +1 | 0 |
| +2 | 1, 11 |
| +3 | 2, 12 |
| +4 | 3 |
| +5 | 4 |
| +7 | 6 |
| −1 | 20 |
| −2 | 21 |
| −3 | 22 |
| −5 | 24 |
| −6 | 25 |

---

## 5. Level specs

Data fields: `id`, `name`, `target`, `deck`, `initialHandSize`, factor flags, `flipOnly`, `script`, gates. `script` stays empty. Guidance is the 3s pulse only.

### Level 1 — Honey Drop

- **Role:** Teach core loop
- **Learning goal:** Tap cards into the Pot; BANK fills the glass.
- **Intended feeling:** First tap is juicy; Bank is the first real reward.
- **Board / data:**
  - `target: 5`
  - `deck: [1, 2, 12]` → `+2, +3, +3`
  - `initialHandSize: 3`
  - Factors off. `showFlip: false`, `showChances: false`
  - `script: []`
- **Scoring:** M = 1. Two-card Banks: 5 / 5 / 6. All three sum to 8, which is the edge and not a Snap. No negative, so the meter only moves right. The middle is not crossed before L3.
- **Optimal:** 3 taps. **Slack:** any two cards.
- **First touch:** Three cards in the thumb zone; left `+2` pulses at 3s. No text.
- **Aha:** —
- **Greedy trap / near-miss:** None.
- **Fail routes:** None.
- **Juice:** First tap tier-2; `+N` droplets into Pot; Bank tier-4 pour; win tier-5 (leave headroom).
- **Exit hook:** `5 / 5` on the glass. NEXT.
- **Sim:** 0 forced losses. Every pair banks at least 5.
- **Playtest:** First tap ≤ 5s? After Bank, is the glass the safe one?

### Level 2 — Two Ways

- **Role:** Practice signed direction
- **Learning goal:** Left and right both add positive drops; the meter is where the card went.
- **Intended feeling:** Same as L1, tiny twist.
- **Board / data:**
  - `target: 6`
  - `deck: [3, 21]` → `+4, −2`
  - `initialHandSize: 2`
  - Factors still off. No script.
- **Scoring:**
  - `+4` then `−2`: meter `+4 → +2`, Pot `6`
  - `−2` then `+4`: meter `−2 → +2`. That passes the middle. Swing is off, so the add is still `4` and the Pot is still `6`. No cross FX.
- **Optimal:** 3 taps. Must play both (Bank needs 2 plays).
- **First touch:** Both cards live. Pulse `+4`.
- **Aha:** The left card grew the Pot.
- **Fail routes:** None.
- **Juice:** Meter motion is the new readable beat. Not tier-3.
- **Sim:** 2 wins, 0 fails.
- **Playtest:** “What did the left card do to the honey?”

### Level 3 — The Crossing

- **Role:** Teach Swing
- **Learning goal:** Passing through the middle makes **this** card pay more.
- **Intended feeling:** The minus card hits like a crit.
- **Board / data:**
  - `target: 8`
  - `deck: [2, 24]` → `+3, −5`
  - `initialHandSize: 2`
  - `enableSwingFactor: true`, `visibleFactors: ['swing']`
  - Swing pill docks at level start (~0.8s, skippable, no copy), starts `×1`
  - No script. Both cards live. Pulse `+3`.
- **Scoring:**
  - `+3` then `−5`: Pot 3; strict cross from `+3`, M = 2, `−5` adds **10**, Pot **13**
  - `−5` then `+3`: meter `−5 → −2`, same side, no cross, Pot **8**
- **Target 8** is the low line, so both orders win. The aha is the pulsed order (`5` flies as `+10`). The other order is a bare win, not a lesson. Two opposite cards cannot both cross.
- **Aha (~2nd tap, if they followed the pulse):** Flying **+10**; pill `×1 → ×2`.
- **Fail routes:** None.
- **Juice:** Crossing = tier-3 (hit-stop ~50ms, spark middle → pill, then +10 into Pot). The non-cross order is tier-1.
- **Copy on object (only if this play crossed):** `CROSS`
- **Sim:** 0 forced losses. Pots 13 and 8.
- **Playtest:** On the pulsed line, why was the flying number bigger than 5?

Do not say “cross zero/center” in a way that makes landing **on** 0 sound like a bonus. L10 is the opposite.

### Level 4 — Either Side

- **Role:** Practice crossing
- **Learning goal:** A minus played after a smaller plus pays more. The quiet line still fills the glass.
- **Intended feeling:** Choice, then a bigger hit if they set the cross.
- **Board / data:**
  - `target: 11`
  - `deck: [1, 3, 24]` → `+2, +4, −5`
  - `initialHandSize: 3`
  - Swing on. No Flip. `−5` is larger than both pluses, so plus-then-minus always crosses.
- **All three cards, in order:**

  | Order | Pot |
  |---|---:|
  | +2, −5, +4 | 24 (12 after the cross, then +4 crosses from −3) |
  | +4, −5, +2 | 20 (14 after the cross, bankable there) |
  | +2, +4, −5 | 11 (meter stays positive, `+6 → +1`) |
  | +4, +2, −5 | 11 |
  | −5, +2, +4 | 15 |
  | −5, +4, +2 | 13 |

  Banking a two-card pot of 6, 7, or 9 still clears: the last card banks on an empty deck and the total is 11.
- **Near-miss:** None that fails. The quiet line is 11 against crosses of 12–15. They left honey on the table and still won.
- **Fail routes:** None. No Snap (`|S|` peaks at 6).
- **Sim:** 0 forced losses.
- **Playtest:** Did the minus feel bigger when it was played second?

### Level 5 — Mystery Card

- **Role:** Teach Flip (control only; Flip× **off**)
- **Learning goal:** Flip plays the next hidden card now.
- **Board / data:**
  - `target: 6`
  - `deck: [2, 1, 0]` → hand `+3, +2`, Flip `+1`
  - `initialHandSize: 2`
  - `showFlip: true`, `enableFlipFactor: false`, `flipOnly: true`
  - Swing stays on. Every card is positive, so Flip cannot cross and the Swing pill cannot tick.
  - Flip button docks at start. Pulse FLIP at 3s if idle.
- **Scoring:** The two hand cards sum to 5. The `+1` is reachable only by Flip, so every win plays it. Flip pays 1, the same as its rank. Banking 5 and then Flipping still totals 6 (empty-deck Bank of the last 1).
- **Aha:** `?` becomes `+1` and enters the Pot.
- **Fail routes:** None.
- **Juice:** Reveal tier-2; no pill tick.
- **Sim:** 0 forced losses. Every win plays the Flip card. No Swing gain.
- **Playtest:** Is Flip a card or a skip?

### Level 6 — Hot Streak

- **Role:** Teach Flip×
- **Learning goal:** Safe Flips in a row pay more **on that Flip**.
- **Board / data:**
  - `target: 13`
  - `deck: [1, 0, 11, 2]` → hand `+2, +1`, Flip `+2` then `+3`
  - `initialHandSize: 2`
  - `enableFlipFactor: true`, `visibleFactors: ['swing', 'flip']`, `flipOnly: true`
  - All four cards are positive. Sum is 8, so the last card sits on the edge and does not Snap.
  - Flip pill docks at start. Pulse FLIP.
- **Intended line:** Flip, Flip, Bank (hand unused).
  1. Flip `+2`: Flip× `×2`, add **4**, Pot 4, meter +2
  2. Flip `+3`: streak `×3`, add **9**, Pot **13**, meter +5
- **Hand first:** `+2` then `+1` is Pot 3 at `+3`. The pile is still Flip-only, so the streak still happens: Flip `+2` adds 4 (Pot 7), Flip `+3` adds 9 (Pot **16**).
- **Aha:** Second Flip flies **+9**.
- **Fail routes:** None. No cross, no Snap.
- **Sim:** 0 forced losses. Both the Flip-first line (13) and the hand-first line (16) bank at or above 13, and both tick the Flip pill twice.
- **Playtest:** Which pill grew? Why was the second number bigger?

### Level 7 — Sweet Mix

- **Role:** Combine Swing + Flip×. Gentle on purpose: L8 is the next teach, so this is not an exam.
- **Learning goal:** A cross **or** the Flip is enough. The cross pays more.
- **Board / data:**
  - `target: 10`
  - `deck: [2, 24, 0]` → hand `+3, −5`, Flip `+1`
  - `initialHandSize: 2`
  - Swing on, Flip× on, `flipOnly: true`
  - No third pill.
- **Scoring:**
  - Cross line: `+3` then `−5` → Pot **13**. Bank. The Flip can sit unused.
  - Other order: `−5` then `+3` → Pot 8 at `−2`. Flip `+1` is a safe Flip, `×2`, adds **2**, Pot **10**.
  - Banking the 8 and then Flipping from 0 also totals 10.
- **Fail routes:** None. No Snap.
- **Exit hook:** Win. L8 uses the two pills already on the board. Nothing empty on this board.
- **Sim:** 0 forced losses. Target is reachable by a cross with no Flip, and by the non-cross line with one Flip.
- **Playtest:** Did they feel clever without a pointer?

### Level 8 — Golden Flip

- **Role:** Combine Swing + Flip on one card
- **Learning goal:** A Flip that passes the middle steps **both** pills and pays this Flip at the product.
- **Intended feeling:** The hidden card explodes.
- **Board / data:**
  - `target: 17`
  - `deck: [1, 2, 25]` → hand `+2, +3`, Flip `−6`
  - `initialHandSize: 2`
  - Swing and Flip on. No new pill, no dock. `flipOnly: true`
  - Both hand cards are positive and smaller than 6, so a Flip after either of them crosses. Pulse `+2`, then Flip once the meter has left 0.
- **Lines:**
  - `+2` then Flip `−6`: cross, Swing `×2`, Flip `×2`, M = 4, add **24**, Pot **26**
  - `+3` then Flip `−6`: Pot **27**
  - Both, then Flip from `+5`: Pot **29**
  - Flip first (from 0, not a cross): Flip× `×2`, Swing stays `×1`, add 12. Then `+2` adds 4 (Pot 16) and `+3` adds 6 (Pot **22**). Still a win.
  - Bank the two pluses (5) and then Flip from 0: 5 + 12 = **17**.
- **Target 17** is that last line. The explosion is the pulsed path, not a gate. Raising the target so the Flip-first line loses would punish the habit L6 just taught.
- **Aha:** Flip `−6` shows **+24**; Swing and Flip both step.
- **Fail routes:** None. No Snap.
- **Sim:** 0 forced losses. Every line that Flips while the meter is positive ticks both pills and banks at least 26.
- **Playtest:** Did both pills move, and why was the flying number 24?

### Level 9 — Easy Garden

- **Role:** Relief
- **Learning goal:** None new.
- **Intended feeling:** Rich, short, “I’m good at this.”
- **Board / data:**
  - `target: 11`
  - `deck: [4, 25]` → `+5, −6`
  - `initialHandSize: 2`
  - Swing on. No Flip, so the Flip pill is absent. Pulse `+5`.
- **Scoring:**
  - `+5` then `−6`: cross from `+5`, add 12, Pot **17**
  - `−6` then `+5`: same side (`−6 → −1`), Pot **11**
- **Target 11** so the quiet order still fills the glass. The pulsed order is the wealthy one.
- **Juice:** Swing only, no new VFX. Serotonin, not a finale.
- **Sim:** 2 wins, 0 fails. No Snap.

### Level 10 — Perfect Stop

- **Role:** Teach Zero Break
- **Learning goal:** Landing **on** the middle keeps the Pot. If a bonus was live, it resets for later cards.
- **Intended feeling:** Soft “oh,” not a break.
- **Board / data:**
  - `target: 10`
  - `deck: [2, 24, 1]` → `+3, −5, +2`
  - `initialHandSize: 3`
  - Swing **on**. No Flip, so the Flip pill is absent.
  - `requiresZeroBreak: true` — the only Bank gate in Garden 1. Without it the hot line banks 13 and skips the beat.
  - Pulse `+3`, then `−5`, then `+2`. Not a lock.
- **Intended order `+3, −5, +2`:**
  1. +3 → Pot 3
  2. −5 cross → add 10, Pot 13, `×2`. BANK is visible but disabled; `+2` is live
  3. +2: meter `−2 → 0`. Add **2 × 2 = 4** (M already on the board). Pot **17**. Pills → `×1`. **Pot stays 17.**
  4. BANK 17
- **Other orders** also land on 0 (the three values sum to 0) and bank at least 10. Four of the six orders never raise Swing, so the pill reset is invisible there. The Pot holding is true on every order. That is the lesson. The hot reset is the pulsed order.
- **Juice:** Neutral reset (not red, **no fracture**). Pot number does not drop.
- **Copy on the meter, one beat, pulsed order:** `Pot safe.`
- **Fail routes:** None. No Snap.
- **Sim:** Bank is legal only after a zero. The zero play does not decrease Pot.
- **Playtest:** “Did you lose honey?” Must be no.

### Level 11 — Edge of the Jar

- **Role:** Teach Snap
- **Learning goal:** Past the end, the Pot is gone and the glass stays. The warned card is a choice.
- **Intended feeling:** Short adrenaline, then relief.
- **Board / data:**
  - `target: 9`
  - `maxSnaps: 2`, `showChances: true` — two hearts
  - `deck: [1, 20, 4, 6, 22, 2]` → hand `+2, −1, +5`, refill `+7, −3, +3`
  - `initialHandSize: 3`
  - Swing and Flip on. Flip stays available (the reserve can be Flipped). No Jackpot.
  - Do not open on `+2, −2` (that is Zero again).
- **Safe line (pulse `+2`):**
  1. `+2`, `−1` → Pot 3, BANK → **3** secured. Hand still holds `+5`.
  2. `+5` → meter `+5`, Pot 5. Hand refills to `+7, −3, +3`.
  3. `+7` would land on 12. Red `!`, ghost past the end. `−3` lands on `+2`. `+3` lands on `+8` (the edge, legal).
  4. Play `−3` → Pot 8, BANK. Total **11**.
- **Taught Snap:** Play `+7` from that `+5`. Pot 5 dies. Banked **3** stays. One heart empty. Copy: `Pot lost. Bank safe.`
  - Left in hand: `−3, +3`. Either order lands on 0 and banks **6**. Total **9**.
  - That zero is the L10 rule again (Pot holds, pills reset). No fracture.
- **Near-miss:** Taking the red `+7` for more honey, then climbing back to exactly 9.
- **Fail routes:** A Snap from a fatter Pot can leave too little to reach 9. A second Snap ends the level. No path that never Snaps is a forced loss.
- **Juice:** Snap negative, fast; Banked glass does not shake.
- **Sim:** Safe line banks 11. Taught Snap banks 9 on both leftover orders. 0 forced losses among states with zero Snaps.
- **Playtest:** After the Snap, do they still point at the glass as safe? Can they say the red card was a choice?

### Level 12 — The Big Jar

- **Role:** Light test (not a boss)
- **Learning goal:** Flip across a plus. A full-looking Pot can still be short.
- **Intended feeling:** “This is the game.” No pointers.
- **Board / data:**
  - `target: 24`
  - `deck: [3, 0, 25]` → hand `+4, +1`, Flip `−6`
  - `initialHandSize: 2`
  - Swing and Flip on. `flipOnly: true`. `script: []`
  - Hearts stay on screen from L11. Nothing in this deck can Snap.
- **Wins:**
  - `+4` then Flip `−6` → cross, M = 4, add 24, Pot **28**. Bank.
  - `+1` then Flip `−6` → Pot **25**
  - `+4`, `+1`, then Flip from `+5` → Pot **29**
- **Near-miss:** Flip `−6` first (from 0, Flip× `×2`, Swing stays `×1`, Pot 12). `+4` adds 8 (Pot **20**). `+1` adds 2 (Pot **22**). Short by 2. Banking the 20 and then playing `+1` from 0 totals **21**.
- **Other miss:** Bank `+4` and `+1` (Pot 5, glass shows `5 / 24`) and then Flip from 0: 5 + 12 = **17**. Obvious, not “almost.”
- **Fail routes:** Flip-first, whatever they do after it. Best is 22. No Snap.
- **Juice:** Biggest win so far, then **Lower Orchard** door, not Replay.
- **Sim:** Opening `+4` best is 32. Opening `+1` best is 41. Opening Flip best is 22. No other doomed branch.
- **Playtest:** Would they tap NEXT into a new garden? Can they say why 22 was not enough?

---

## 6. Juice hierarchy

| Event | Tier | Must show |
|---|---|---|
| Normal card | 1 | Meter move + multiplied add into Pot |
| First-ever tap | 2 | Extra pop, still < 300ms |
| Cross / Flip× | 3 | Pill tick **then** `+N` into Pot. A crossing Flip ticks Swing and Flip. Cross only if Swing is on and the play was a strict cross |
| Bank | 4 | Pour; Pot and glass use the same integer |
| Zero | Neutral | Pills dim; Pot holds; no crack |
| Snap | Negative | Pot empties; glass unchanged |
| Win L1–11 | 5a | Short; NEXT ≤ 2.5s |
| Win L12 | 5b + 6 | Orchard unlock, skippable |

Tap skips motion. Sound-off and reduced-motion still communicate add, Bank, Zero vs Snap.

Idle copy (on the control, not a banner):

| Event | Word |
|---|---|
| Bank legal | `BANK` + number |
| Crossing add | `CROSS` |
| Flip factor | `×2` / `×3` on the pill |
| Zero | `Pot safe.` |
| Snap | `Pot lost. Bank safe.` |

---

## 7. Garden 2 (required so L12 is not a lie)

No new mechanics. Same scoring. `flipOnly` off — this is the real refill rule. New backdrop only.

| Lv | Role | Target band |
|---:|---|---|
| 13–14 | Relief / variety | 16–24 |
| 15 | Light test | ~30, near-miss Bank |
| 16 | Relief | Easy |
| 17–18 | Mix Zero + Snap as known tools | Designer’s choice, fair recovery |
| 19 | First labeled hard | Telegraphed |
| 20 | Relief + chapter gift | Easy + cosmetic / bottle |

L13 is playable immediately after L12. Optional non-blocking 7-day drop calendar after L12; last day a bottle skin. Do not gate L13 behind tomorrow.

---

## 8. Skip, help, persistence

- Skip (overflow, after L3): jump to **L13**. L12 is the test, not the exit. Do not dump anyone into a Replay.
- Help: short animated glossary (card → meter, Bank, each pill, Zero vs Snap). Not paragraphs.
- Persist session after every committed action. Reset is a **dev** control, gated before launch.

---

## 9. Implementation order

1. Casual payout = per-card `Pot += M × rank`, with `M = (W + 1) × flipFactor`. A strict cross grows Swing for Steer and Flip. A crossing Flip also takes the Flip step and does not reset the streak. Jackpot stays off. Overswing defaults, including Jackpot, stay unchanged.
2. `flipOnly` skips `refillEmptyHand` for that level's undealt cards. Flip stays legal.
3. Simulator + tests for every Garden 1 deck under the **new** rule:
   - L1–L9 except L4 and L7: 0 forced losses (a state is a forced loss when every continuation banks under the target)
   - L4, L7: 0 forced losses; L4's quiet line is 11; L7's non-cross line is 10 and its cross line is 13
   - L10: Bank only after Zero; the zero play does not drop Pot
   - L11: safe line banks 11; taught Snap banks 9; 0 forced losses with zero Snaps
   - L12: `+4` then Flip banks 28; Flip-first caps at 22
4. Dock animations. Neutral Zero vs Snap FX. No cross FX while Swing is off.
5. Stub L13–20 so the L12 door opens onto L13.
6. Five cold iPhones. No coaching.

### Playtest questions (5 cold players)

1. After L1: what did BANK do?
2. After L2: what does a left card do to the glass?
3. After L3, pulsed line: why was the flying number bigger than the card?
4. After L5: is Flip a card or a skip?
5. After L8, pulsed line: did both pills move, and why was the flying number 24?
6. After L10 vs L11: what is destroyed in each?

Stop polishing copy until those answers are right. A win at L3 or L8 does not prove they saw the pill.

---

## 10. Evidence

| Claim | Rung |
|---|---|
| New scoring fixes Pot-shrink confusion | Design intent |
| Payouts and “0 forced losses” in this doc | Enumerated under `Pot += M × rank`, `M = (W + 1) × flipFactor`, engine strict-cross, `floor(\|S\| / 3)` Swing gain, Flip step on a crossing Flip, Bank-after-two-plays, and refill-unless-`flipOnly`. |
| Fun / first-try % | Opinion until 5 cold players |
| Solvability in the build | Must be re-simulated **after** the engine change |

Do not treat current `simulate:casual` results (old `sum × M`, 10-level file) as proof of this plan.

### What this pass refused

Three solvability cuts would have made a level winnable by erasing the new pill. They are not in these decks.

- Lowering L6 to 9, L7 to 9, or L8 to 12 on the old cards. Emptying the hand drew the Flip pile in as Steers, so the streak and the crossing Flip never fired. `flipOnly` keeps that card a Flip. The targets sit on the real floor of the lines that still show the pill (L6 **13**, L7 **10**, L8 **17**).
- Keeping L4's old six-row table and only “fixing the fail.” Plus-then-minus did not cross. The new deck crosses whenever `−5` is played after a plus, and nothing loses.
- Treating L12's Bank of 7 as a near-miss. That continuation could still pass 24. The miss is now Flip-first at **22**.
