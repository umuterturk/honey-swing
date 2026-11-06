# Swing Casual — Master Project Document

**Product brief · game rules · onboarding specification · implementation status · engineering handoff · delivery roadmap**

| Field | Value |
|---|---|
| Document version | 1.0 |
| Snapshot date | **6 November 2026** |
| Product | **Swing Casual** — a single-player, mobile-first casual card puzzle derived from Overswing |
| Stage | **Playable development prototype; onboarding implemented in code, not validated with new players** |
| Source repository | [umuterturk/card-game-lab](https://github.com/umuterturk/card-game-lab) |
| Playable URL | [Swing Casual on GitHub Pages](https://umuterturk.github.io/card-game-lab/casual.html) |
| Last verified successful deployment | [`e713694` — GitHub Actions run 42114162134](https://github.com/umuterturk/card-game-lab/actions/runs/42114162134) |
| HTML version label | `v0.6.0` plus deployed commit identifier (label has not been renamed for the onboarding milestone) |
| Long-term content ambition | Approximately **200 levels**, conditional on early-game validation |

> **Reading rule:** The *Current implementation* sections describe the inspected `main` branch and latest successful deployment. The *Plan* sections describe intended or proposed work. Older briefs, screenshots and design documents are historical inputs, **not** proof that their exact UI or values remain current. For runtime behavior, `src/external/engines.js` and `src/casual/onboardingLevels.js` are authoritative.

---

## 1. Executive summary

Swing Casual aims to deliver an instantly approachable, commercially promising mobile puzzle based on a compact **push-your-luck** decision. Players tap cards with directional values, move a horizontal meter, accumulate **pending** value in a Pot, earn multipliers as mechanics unlock, and decide when to **Bank** that value into a permanently secured glass container. A Snap loses the pending Pot, while already-banked value remains safe.

The design benchmark is the **clarity, touch responsiveness, short first success, and reward satisfaction** of high-performing casual puzzle games such as Magic Sort. Swing Casual is **not** a clone of Magic Sort, nor is it intended to inherit the horror/roguelike complexity of the original Overswing campaign.

The immediate product objective is **not** to produce 200 levels. It is to prove that new players can:

1. Tap immediately without reading a tutorial.
2. Understand what a signed card does to the meter and why its absolute value helps the Pot.
3. Distinguish **Pot (at risk)** from **Bank (secured)**.
4. Discover multiplier, Zero Break and Snap consequences as they are introduced.
5. Complete the onboarding ladder and voluntarily want another puzzle.

The project has moved beyond the old single-level prototype. **Ten deterministic onboarding levels, engine-level mechanic gates, a simulator and a progress-reset affordance are in the repository.** Their business and usability effectiveness is still unproven. The right next milestone is a **real iPhone interaction audit followed by unbriefed player observation and targeted fixes**, before content-scale or monetization work.

### Non-negotiable product principles

- **Keep the recognizable game board visible from Level 1:** header, numbered meter, actual playable hand, pending Pot, secured Bank and a dedicated Bank action. Simplify *rules and choices*, not the existence of the board.
- **First win quickly:** Level 1 takes two card taps and one Bank tap; different opening choices still succeed.
- **One mechanic at a time:** Flip is unavailable early; multiplier pills appear only when their scoring system has been taught; chances and risk indicators arrive later.
- **Honest movement and scoring:** a card adds to the pending Pot, never directly to the secured Bank. Only an engine-authorized Bank transfers value. No UI-only multiplier calculation.
- **Fair learning:** no forced surprise loss just to demonstrate Snap. Decisions become increasingly independent rather than requiring scripted tapping forever.
- **Mobile first:** portrait, safe areas, large touch targets, stable layout, working reduced-motion path and no external-audio interruption.
- **Evidence over polish theater:** source-level tests/builds are necessary, but they cannot validate whether a new player understands or enjoys the interaction.

---

## 2. Product identity and intended audience

**Genre:** single-player, level-based, casual card/meter puzzle with push-your-luck and light resource accumulation.

**Platform direction:** portrait-first mobile browsers initially; possible web portals and installable/offline packaging later. iOS Safari is a primary quality target. No native iOS/Android app is evidenced as shipped.

**Session structure:** one self-contained, deterministic level with a target, an ordered deck/hand, a meter, pending/secured values, and an eventual win or retry. Success leads to the next onboarding level. The broader map, campaign economy and post-Level-10 experience are not yet built.

**Audience hypothesis:** casual mobile players who like fast, legible decisions and satisfying physical reward feedback, including people unfamiliar with card roguelikes. This is a design hypothesis; no verified cohorts, retention or willingness-to-pay data currently exist.

**Art and tone:** bright garden setting, rounded toy-like surfaces, playful colored cards, horizontal instrument-like meter, clear glass bottles, fluid/droplet transfer and tactile but restrained motion. No horror campaign aesthetics, boss characters or relic economy in this casual onboarding.

**Primary loop:**

```text
Choose a signed card (or later FLIP an unseen card)
                ↓
Move the meter left/right; check Snap / crossing / exact zero
                ↓
If safe, add absolute card value to pending Pot
                ↓
Apply engine-authorized multiplier change, if unlocked
                ↓
BANK now, or continue risking the Pot
                ↓
BANK: transfer actual payout → secured glass
                ↓
Meet target → level complete → next level
```

---

## 3. Core game rules — current casual behavior

These are the essential player-facing rules derived from the shared Overswing engine and the casual onboarding configuration. The original Overswing game has additional systems; **they are not automatically part of Swing Casual**.

### 3.1 Cards and direction

- Ordinary card IDs encode signed ranks. A `+4` card moves the Swing position **four right**; a `−3` moves it **three left**.
- In the casual configuration, each **safe** card play contributes its **absolute rank** to the pending Pot. A `−3` adds **3**, not −3, to the pending total.
- The arrow/color helps players understand direction; the card’s number indicates magnitude. The UI uses large arrow-and-magnitude card faces rather than a long written explanation.
- **Steer / play from hand** lets the player select a visible card. The engine, not the UI, decides whether it is a legal move.
- **Flip** draws the next ordinary card from the ordered deck and applies its movement/score result. Flip is hidden until onboarding Level 4.

### 3.2 Meter, crossings, Zero Break and Snap

- The current onboarding Snap boundary is **±8**. Positions inside or **at** −8/+8 are legal; a move **beyond** either edge Snaps.
- A **strict crossing of zero** means moving from one nonzero sign to the opposite nonzero sign. This can earn a Swing multiplier when enabled.
- **Landing exactly on zero** is **Zero Break**, not a Snap. It resets earned multipliers but **preserves the pending Pot**.
- **Snap** destroys the **unbanked** Pot and resets its associated risk state; previously secured Bank value remains intact. Onboarding permits **two Snaps per level**, although hearts/edge warnings are not presented until Level 9.
- Edge danger and the red moving marker must not create the impression that the center is the true failure boundary.

### 3.3 Pot, Bank and objective

There are two different quantities:

| Concept | What it means | What changes it |
|---|---|---|
| **Pending Pot** | Value currently at risk, not yet secured | Safe card/Flip adds value; multiplier changes alter the *projected payout*; Snap loses the underlying pending collection; Bank empties it |
| **Secured Bank** | Score permanently secured within the current level | An actual Bank action increases it; later Steer/Flip or Snap must not reduce it |
| **Target** | Minimum secured value required to finish the level | Configured per level; victory checks secured total, not prospective/pending reward |

**Important current UI detail:** the bottle labeled **POT** currently renders the engine's **projected Bank payout** (`visiblePotPayout(overswingPayout(...))`), rather than always showing only raw absolute card ranks. During a pour, that projected amount drains proportionally with pending value. The Bank glass shows the actual secured total and target. The engine separately tracks the raw Pot and potential payout. This presentation choice **needs comprehension testing** because the word “Pot” may suggest raw value rather than prospective payout.

The physical arrangement is **two adjacent containers**: smaller Pot on the left, larger secured Bank on the right. **Current onboarding uses a separate BANK button** in the lower controls. The Pot bottle is display-only in the active screen; historical guidance to tap the Pot itself has been superseded.

**Bank eligibility** is determined by `overswingActions`; it generally requires pending value and sufficient actions since the last reset, with engine-specific exceptions. The onboarding layer may additionally require a teaching action first (e.g., a Flip or Zero Break). The button must remain disabled until both the engine and tutorial allow it.

### 3.4 Multipliers

The original Overswing engine has three independent factors. Campaign defaults (`enableJackpotFactor: true`, `runningPot: false`) are unchanged:

| Factor | Engine value | Cause |
|---|---|---|
| **Swing** | `W + 1` | Strict nonzero sign crossing |
| **Flip** | `flipFactor` | Safe non-crossing Flip streak |
| **Jackpot** | `jackpotFactor` | Strict crossing performed by a Flip. The Flip streak resets; Flip does not grow on that play |

A crossing Flip in that mode awards **Swing and Jackpot together**. Do not show a Flip-factor increase unless the engine awards it.

Garden 1 (`runningPot: true`, `enableJackpotFactor: false` on every level) does not teach Jackpot. `M = (W + 1) × flipFactor`. A strict-crossing Flip grows Swing and takes the same Flip step as a safe Flip, and the streak is not reset. A Steer still clears the streak and does not clear `flipFactor`. A board with no Flip shows Swing only. Pills are compact numbers, sourced from the engine, shown only once that factor is enabled.

The canonical payout is computed by `overswingPayout`, not duplicated in React. Campaign, before modifiers/tax:

```text
Gross payout = floor((sum of absolute ranks in Pot + resonance points)
                     × Swing factor × Flip factor × Jackpot factor)
```

Garden 1 banks a running total: each safe card adds `M × rank`, and Bank transfers that integer as-is.

Per-level rules and any engine modifiers/tax are applied by the engine. During **all current onboarding levels**, resonance is **disabled**; bank capacity loss is `0`; bank tax is not introduced; the casual `steerAlwaysToPot` behavior is enabled; and noncrossing penalties are disabled. The `enableSwingFactor`, `enableFlipFactor` and `enableJackpotFactor` rules explicitly gate each multiplier. **Full original Overswing defaults remain unchanged** outside opted-in casual rules.

### 3.5 Win, loss and retry

- A level completes when **secured Bank ≥ level target**.
- A level ends without success if its snap allowance is exhausted or the engine reaches its terminal state.
- A win displays a completion overlay and **NEXT LEVEL**; Level 10 instead offers **REPLAY CHALLENGE**.
- Retry/restarter state uses the level's deterministic data. The current level seed is generated as `20261104 + levelId`, so the scripted/onboarding deck is intentionally reproducible. There is no production random level-generation service.
- **Development Reset Progress** is a distinct operation: it clears the saved onboarding checkpoint and unlocked-level marker, then starts Level 1 again. It does not wipe unrelated preferences or other games’ data.

---

## 4. The current Level 1: first-touch contract

**This section supersedes both the original one-card mockup and the legacy Level 1 target of 24.**

| Item | Current implementation |
|---|---|
| Level name | **First Treasure** |
| Target secured total | **5** |
| Ordered deck IDs | `[1, 22, 3]` |
| Starting hand | **`+2`, `−3`, `+4`** — all three visible and playable |
| Meter | **Visible**, starts at zero; Snap limit ±8 |
| Pot | **Visible** at zero, always distinct from Bank |
| Bank | **Visible** secured bottle with target and separate BANK button |
| Flip | **Hidden / unavailable** |
| Multipliers | **Hidden and genuinely disabled**; no secretly boosted Bank payout |
| Hearts / edge warning | Not exposed yet |
| First win | **Play any two hand cards, tap BANK** — three gameplay taps |
| First-hand safety | All six ordered two-card combinations reach target without Snap, according to automated engine tests |

**What the player should see immediately:** a recognizable full game screen, not a giant empty background with one floating card. From top to bottom: **Level header + score + Reset → numbered meter → separate Pot and Bank bottles → three playable cards → Bank action**. Flip and multiplier pills wait for their lessons.

**Expected causal sequence:**

1. Tap one of three cards. The meter moves in that direction; the pending Pot grows by that card’s absolute value. Secured Bank remains unchanged.
2. Tap a second card. The meter changes again and pending Pot grows. Bank becomes legal. The available payout meets or exceeds 5 for all first two-card choices.
3. Tap **BANK**. The small Pot pours into the secured Bank; the secured total counts up, and the level-complete state appears.

A light attention cue can activate after inactivity, but Level 1 must not require reading a tutorial panel. Do not force a single preselected card order or hide the remaining real hand cards.

**Device-validation caveat:** tests prove engine outcomes and source structure, not the actual ease of tapping or absence of overlap in iPhone Safari. Keep an on-device first-frame screenshot as a release gate.

---

## 5. Ten-level progressive onboarding — actual current data

The table below comes from the current `src/casual/onboardingLevels.js` rather than the superseded original ten-level proposal. Targets and opening cards are **implementation values**, not a balanced-content promise.

| Lv | Name | Target | Opening hand | New lesson / unlock | Notes |
|---:|---|---:|---|---|---|
| **1** | First Treasure | **5** | `+2, −3, +4` | First card taps; Pot vs Bank; meter visible | Any two cards, then Bank; no Flip/pills |
| **2** | Left and Right | **6** | `+4, −2` | Both directions grow pending value | Meter remains visible; signed direction matters |
| **3** | Your Choice | **6** | `+2, −4, +5` | More than one starting choice | Multiple viable paths; no multipliers |
| **4** | Hidden Card | **2** | `+1, −2` | **Flip** becomes available | Must perform at least one Flip before Bank |
| **5** | Crossing Bonus | **16** | `+3, −5` | **Swing ×** unlocks | Scripted crossing/Bank teaching sequence |
| **6** | Flip Streak | **10** | `+2, −2` | **Flip ×** unlocks | Safe noncrossing Flip increases its factor |
| **7** | Jackpot Flip | **40** | `+4, −2` | **Jackpot ×** unlocks | A crossing Flip can earn Swing and Jackpot |
| **8** | Exactly Zero | **10** | `+3, −5, +2` | **Zero Break** distinction | Must trigger exact zero; Pot survives factor reset |
| **9** | Edge Danger | **12** | `+2, −2, +5` | **Snap/chances/edge danger** | Real risk with winning safe and recovery paths |
| **10** | Your First Puzzle | **80** | `+3, −4, +6` | Combine the enabled rules without a forced script | Multiple strategies; replayable capstone |

### How progressive disclosure works in the implementation

- **Level 1 onward:** header, horizontal meter, playable hand, pending Pot, secured Bank, dedicated Bank control.
- **Level 4 onward:** Flip control.
- **Level 5 onward:** Swing factor; **Level 6** adds Flip factor; **Level 7** adds Jackpot factor.
- **Level 9 onward:** visible chance/hearts and edge danger guidance.
- **Levels 5–9:** some actions are scripted/gated to guarantee a specific teaching outcome. Some earlier levels also hide extra hand slots for focus, though the meter/Pot/Bank/header remain present.
- **Level 10:** no mandatory script; all three factors and Flip are available.
- **Throughout:** `enableResonance:false` and no royalty/relic/ability/shop mechanics.

### The onboarding teaching contract

1. **Introduce before testing:** a control/pill appears when its action or effect is relevant.
2. **No concealed score surprises:** gameplay multipliers not yet shown are genuinely disabled at the engine level.
3. **Carry forward learned UI:** do not remove the meter, Pot, Bank or header for supposed simplicity.
4. **Do not teach through fake loss:** optional Snap is real, but safe play and recovery must be available.
5. **Contextual hints, not instructional walls:** inactivity prompts, control highlights and event-linked effects; expose Help/Skip later instead of filling Level 1 with text.
6. **Capstone mastery:** Level 10 should require real decisions about when to Bank rather than just repeating a scripted gesture.

### Outstanding design issues to validate

- **Levels 1–3:** verify whether three cards from first launch are immediately understood, and whether the dedicated Bank button’s disabled/enabled transition is obvious.
- **Level 4:** ensure “Flip” reads as the intended card action without new-player confusion or accidental Bank attempts.
- **Levels 5–7:** the three factors appear one by one, but actual comprehension must be observed. The difference between swing crossing and crossing specifically on Flip is subtle.
- **Level 8:** the exact-zero reset should not feel like a penalty as severe as Snap; the Pot must visibly persist.
- **Level 9:** ensure early encounters are recoverable and not overly punitive; the Snap allowance exists in earlier levels but its UI arrives here.
- **Level 10:** the current target **80** is intentionally more ambitious; balance and path clarity need real-play review. A scripted simulator success does not establish a satisfying difficulty curve.
- **Level 11:** does not yet exist. Completing onboarding currently leads to replaying the Level 10 challenge, not a real campaign.

---

## 6. Screen layout and interaction design

### Persistent visual hierarchy

1. **Header:** level indicator, secured score, compact **Reset** developer control. Hearts appear later. After Level 5, Help and Skip are accessible through a compact overflow menu.
2. **Meter:** horizontally numbered from −8 to +8, red moving position marker and shared tick geometry; multiplier pills appear only when unlocked.
3. **Middle:** smaller pending **POT** bottle beside larger secured **BANK** bottle; visually distinct liquid and progress presentation.
4. **Hand:** large tappable directional cards on the wooden shelf; generally near the bottom thumb zone.
5. **Actions:** dedicated **BANK** button; **FLIP** introduced at Level 4. Snap is an automatic outcome, never a button.
6. **Completion overlay:** level result, Next/Retry, and secondary **RESET PROGRESS** action (because the overlay covers the header).
7. **Tiny version label:** `v0.6.0` and short build identifier, useful for screenshot-to-release comparison.

### Reward animation hierarchy

| Event | Intensity | Must communicate |
|---|---|---|
| Ordinary card | Light / fast | Actual signed meter movement; positive absolute contribution to pending Pot |
| Multiplier award | Medium | The particular factor earned and the reason; no generic bonus for every action |
| Zero Break | Neutral / distinct | Reset multipliers while pending Pot survives |
| Snap | Negative / controlled | Attempt exceeded edge; pending Pot emptied, chance lost; secured Bank unchanged |
| Bank | Main reward | Physical Pot lift/tilt/stream → drain → Bank fill/count-up → small impact/glint |
| Level complete | Short celebration | The secured target was achieved; clear next action |

Animations are implemented using GSAP and engine-derived action presentations, with reduced-motion fallbacks. **Perceived timing and usability are not yet certified by a real-device recording.** The design should not rely on audio for understanding.

### Development Reset Progress

The top-right **Reset** control is intentionally visible on every level, including the first. On very narrow screens, the label may collapse into a circular arrow. It resets onboarding only, **not** other games or volume preferences. The reset also appears on the completion modal.

Current storage keys:

```text
swing-casual-onboarding-session-v2     current saved session
swing-casual-onboarding-unlocked-v1    unlock/checkpoint marker
swing-casual-onboarding-session-v1     old session key cleared on reset
```

After clearing, the app immediately creates/saves a fresh Level 1 session; do not expect the current session key to remain absent while the game is open.

---

## 7. Current implementation status — verified versus unverified

**Snapshot basis:** current GitHub `main` inspected on 6 November 2026; latest verified successful workflow is **[42114162134](https://github.com/umuterturk/card-game-lab/actions/runs/42114162134)**, commit **[`e713694`](https://github.com/umuterturk/card-game-lab/commit/e713694613dee5161138073fa2a97caceb2ca641)**. That workflow completed successfully, including automated tests, production build, release validation, Pages deployment, offline check and packaging steps. This is **release evidence**, not human gameplay evidence.

| Capability / milestone | Status | Basis / qualification |
|---|---|---|
| Separate casual entry and pastel garden presentation | **Implemented** | `casual.html`, `src/casual-main.jsx`, `CasualArt.jsx`, `minimal.css` |
| Header, hand, numbered meter, Pot, Bank from Level 1 | **Implemented** | Board fix in [PR #27](https://github.com/umuterturk/card-game-lab/pull/27); source-level regression checks |
| Dedicated Bank CTA and physical Pot-to-Bank pour | **Implemented** | Current `SimplifiedGame.jsx` and `minimalMotion.js` |
| Three authoritative multiplier factors | **Implemented / gated by level** | Shared engine; pills L5/L6/L7 |
| Snap and Zero Break distinct effects | **Implemented in code** | Motion and engine event handling; perceived clarity not yet validated |
| Ten explicit onboarding levels | **Implemented** | `onboardingLevels.js`, current targets/decks above |
| Tutorial-only engine factor and resonance gates | **Implemented** | `engines.js`; original mode default behavior preserved in regression tests |
| Deterministic onboarding state-space simulator | **Implemented** | `scripts/simulate-casual-onboarding.mjs`; bounded explorer |
| Persistence, replay and Next Level | **Implemented** | LocalStorage session, level transitions, replay Level 10 |
| Top-header Reset Progress | **Implemented / deployed** | [PR #28](https://github.com/umuterturk/card-game-lab/pull/28), storage helper/tests |
| CI and GitHub Pages deployment | **Latest run succeeded** | [GitHub Actions run](https://github.com/umuterturk/card-game-lab/actions/runs/42114162134); intermittent artifact-indexing issue previously encountered |
| Fast taps, animation cancellation, safe-area and iPhone touch QA | **Not fully validated** | Automated tests do not substitute for device interaction/recording |
| Five unbriefed new-player comprehension sessions | **Not evidenced** | M2 research gate pending |
| Measured onboarding funnel, D1/D7 retention or revenue | **Not evidenced** | Browser event dispatch exists, but no verified measurement cohort/analytics backend |
| Balanced progression and Levels 11–200 | **Not implemented** | Ten onboarding prototypes only |
| Standalone Swing Casual GitHub repository | **Not implemented** | Code still lives inside multi-game `card-game-lab` |
| Casual-specific offline/TWA/native app/store shipping | **Not verified as shipped** | Shared lab/Original Overswing offline and packaging checks are not proof of a standalone casual app |
| Full casual audio / store monetization / ad integration | **Not delivered or verified** | Remain future product decisions |

### Important historical corrections

A new contributor should **not** inadvertently revert the current product to older instructions:

| Older document/screenshot says | Current decision / source of truth |
|---|---|
| Level 1 hides the header, meter and Pot, shows only one card | **Rejected after actual player-view screenshot.** Show header, meter, all three starting hand cards, Pot and Bank from the first frame |
| First-level target is 24 and deck has 10 ordinary cards | That is the **legacy** `src/casual/firstLevel.js`. Active onboarding Level 1 target is **5**, deck `[1,22,3]` |
| Tap the Pot bottle to Bank | Superseded in the active onboarding screen: **separate BANK button**, decorative/noninteractive Pot |
| The Pot always displays raw sum of card ranks | Current screen displays **projected engine payout** in the Pot bottle; decide whether that presentation is sufficiently clear in usability testing |
| Only one tutorial level exists | Ten playable onboarding configurations exist; **quality and balance are not validated** |
| Proposed onboarding hides the meter until Level 2 | Meter is **always visible** under current `onboardingLevels.js` |
| Build passed, therefore game is live | False: deployment must be checked separately. Current latest workflow is successful, but future runs can fail |
| Full Overswing rules/royals are all part of this casual launch | They are **out of scope** unless explicitly adopted in future level design |

**Documentation maintenance task:** the existing `docs/swing-casual-onboarding.md` still begins with the superseded first-screen proposal; `docs/swing-casual-next-iterations.md` retains an earlier tappable-Pot contract; `casual.html` still has one-level-oriented title/description. This master document records the corrected current state. Consolidate or label the older documents as historical before inviting new contributors.

---

## 8. Repository architecture and key files

The repository is a **multi-game lab**, not a dedicated Swing Casual application. Current stack: **React 19, Vite 7, GSAP 3**, JavaScript/JSX and CSS; PixiJS is a dependency of the wider lab and should not be presumed a direct requirement of the active casual screen.

| Path | Responsibility |
|---|---|
| [`casual.html`](https://github.com/umuterturk/card-game-lab/blob/main/casual.html) | Current standalone browser entry and visible release identifier |
| [`src/casual-main.jsx`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual-main.jsx) | React mount and active casual styling entry |
| [`src/casual/SimplifiedGame.jsx`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/SimplifiedGame.jsx) | Active UI; game actions, animations, events, save/resume, reset, navigation |
| [`src/casual/onboardingLevels.js`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/onboardingLevels.js) | **Active ten-level definitions**; rules, ordered decks, unlocks, guidance, legality filtering |
| [`src/casual/onboardingProgress.js`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/onboardingProgress.js) | Local progress-key ownership and development reset helper |
| [`src/casual/MinimalBoard.jsx`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/MinimalBoard.jsx) | Meter, factors, Pot, Bank vessel, visual cards |
| [`src/casual/minimal.css`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/minimal.css) | **Active stylesheet**, layout, animations, mobile/safe-area styling |
| [`src/casual/minimalMotion.js`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/minimalMotion.js) | GSAP card, factor, Pot pour, Snap and Zero Break choreography |
| [`src/casual/presentation.js`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/presentation.js) | Engine-to-visual action deltas, payout display and fluid progress helpers |
| [`src/casual/multiplierView.js`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/multiplierView.js) | Maps real engine factor values and awards to pill presentation |
| [`src/casual/meterScale.js`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/meterScale.js) | Shared meter coordinate/tick calculation |
| [`src/casual/cardDirection.js`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/cardDirection.js) | Direction arrow and card accent helpers |
| [`src/casual/CasualArt.jsx`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/CasualArt.jsx) | Garden/environment artwork |
| [`src/external/engines.js`](https://github.com/umuterturk/card-game-lab/blob/main/src/external/engines.js) | **Authoritative game state, rules, legal actions and Bank payout** |
| [`src/external/overswingRoyals.js`](https://github.com/umuterturk/card-game-lab/blob/main/src/external/overswingRoyals.js) | Wider Overswing dependency; not a casual onboarding feature |
| [`src/casual/firstLevel.js`](https://github.com/umuterturk/card-game-lab/blob/main/src/casual/firstLevel.js) | **Legacy v0.6 single-level config**, still used by historical tests; **not** the live onboarding definition |
| [`scripts/simulate-casual-onboarding.mjs`](https://github.com/umuterturk/card-game-lab/blob/main/scripts/simulate-casual-onboarding.mjs) | Bounded deterministic state-space exploration across all ten levels |
| [`tests/casual-onboarding.test.mjs`](https://github.com/umuterturk/card-game-lab/blob/main/tests/casual-onboarding.test.mjs) | Level completion, factor gates, Snap/Zero/Flip behavior and simulator checks |
| [`tests/casual-onboarding-progress.test.mjs`](https://github.com/umuterturk/card-game-lab/blob/main/tests/casual-onboarding-progress.test.mjs) | Reset storage and UI visibility tests |
| [`tests/casual-ui-currency.test.mjs`](https://github.com/umuterturk/card-game-lab/blob/main/tests/casual-ui-currency.test.mjs) | UI/currency/pour and Pot-vs-Bank regression assertions |
| [`vite.config.js`](https://github.com/umuterturk/card-game-lab/blob/main/vite.config.js) | Multi-entry build configuration |
| [`.github/workflows/pages.yml`](https://github.com/umuterturk/card-game-lab/blob/main/.github/workflows/pages.yml) | Build, test, Pages deployment, offline verification and wider-lab packaging |

### Architecture invariants

- `engines.js` owns **all** action legality, movement, crossings, Snap, Zero Break, factor calculations and Bank payouts.
- `onboardingLevels.js` supplies immutable level facts plus an action filter; it does **not** compute a separate version of payouts.
- `SimplifiedGame.jsx` dispatches engine-backed actions and commits state **before** the animation begins, allowing interruption/reload without inventing another move.
- `presentation.js` turns state differences/engine action facts into visual parameters, including raw-Pot-to-projected-payout display and pour counters.
- `minimalMotion.js` is presentational. Cancellation must remove temporary DOM nodes, timers and GSAP transforms; animations cannot be allowed to alter actual game score.
- Avoid copying unrelated Overswing royal/ability/shop systems into the casual game without a product decision.
- Tests should check both **engine invariants** and **visible/interaction contract**. Human iPhone sessions are the ultimate UI validation.

---

## 9. Local development, tests and deployment

### Prerequisites and local run

Node.js **22** matches GitHub Actions. Use npm and a modern browser.

```bash
git clone https://github.com/umuterturk/card-game-lab.git
cd card-game-lab
npm install
npm run dev
# Open the Vite address and navigate to /casual.html
```

### Verification

```bash
npm test                    # Engine, onboarding, progression and UI-source regression tests
npm run simulate:casual     # Bounded state-space explorer, all 10 levels
npm run build               # Full multi-entry Card Game Lab site
npm run verify:release      # Validate built site artifact
npm run verify:offline      # Wider lab's offline release check
```

For optional manual browser smoke, inspect the existing `scripts/verify-casual-demo.mjs` and its browser prerequisites. **Do not assume it is part of Pages CI.** Browser tests were intentionally excluded from automatic release runs at the user's request.

### Release path

`main` push → GitHub Actions **Publish Card Game Lab** → npm install → **unit tests** → Vite build → release verification → upload Pages artifact → brief artifact-indexing wait → GitHub Pages deploy → offline verification → wider-lab packaging → commit status report.

**Recent release reliability note:** GitHub Pages intermittently failed to discover its just-uploaded artifact; a later repair added explicit indexing time. Old failed runs should not be conflated with source defects. The **last checked** run [`42114162134`](https://github.com/umuterturk/card-game-lab/actions/runs/42114162134) completed **successfully**. A future PR or deployment must be checked anew.

**Published entry:** <https://umuterturk.github.io/card-game-lab/casual.html>.

### Event hooks and persistence

The active React screen dispatches `swing-casual-event` browser `CustomEvent`s such as `level_start`, `first_action`, `card_play`, `flip`, `bank`, `snap`, `zero_break`, `factor_changed`, `hint_shown`, `level_complete`, `onboarding_complete`, `tutorial_skip`, and `onboarding_reset`. This is an **instrumentation hook**, not evidence of a connected production analytics pipeline or measured retention.

Current sessions are stored locally and can be reset for repeat first-touch testing. Do not rely on this storage model as production cloud save or cross-device synchronization.

---

## 10. Master roadmap — prioritized from the current state

### M0 — Separate Swing Casual into its own repository (architectural milestone)

**Status: NOT DONE.** The broader Card Game Lab hosts both casual and original Overswing. A migration was originally planned before further polish, but subsequent UX work proceeded in the existing repo. Do **not** block immediate onboarding research on a large migration; schedule the split when the core experience is stable or when standalone distribution makes it necessary.

**Deliverables:** one-app repository, minimal tested engine dependencies, dedicated `index.html`, dedicated PWA/Pages config, same replay determinism and payout results, tests, and working deployment. Avoid mass refactoring before verified equivalence.

### M1 — Core interaction quality and P0 UX validation (NEXT)

**Code status:** most visual building blocks exist; **human/device validation pending**.

1. Reproduce a complete session on iPhone Safari: open screen, positive/negative card, Pot growth, Flip, factor gain, Bank pour, Zero Break, Snap and win.
2. Check **320×568, 375×667, 390×844 and 430×932 CSS-pixel targets**; rotate browser chrome/safe area; verify no clipped meter labels, overlapping bottles, obscured controls or score jumps.
3. Rapid-tap/double-tap each action; Reset during a card flight or Bank pour; reload during an animation; check for duplicate engine actions, stranded effects or locked inputs.
4. Validate `prefers-reduced-motion` and silent-mode behavior.
5. Make sound-off video prove the sequence: **card → meter → pending Pot → actual multiplier award → Bank → secured glass**.
6. Fix unclear Pot projected-payout labeling and check whether the Bank button reads as enabled/disabled without a verbose tutorial.

**Exit criterion:** critical flows work on a real iPhone, screenshots/recordings correspond to deployed SHA, and there are no high-priority overlaps, mis-taps, or animation-state failures. A passing CI run alone does **not** satisfy M1.

### M2 — Unbriefed five-player onboarding comprehension test (NEXT after M1)

**Status: NOT DONE / no player-study evidence.** Observe at least **five** players unfamiliar with the game or card roguelikes attempting **Levels 1–10 without prior explanation**.

- Measure time to first meaningful tap, first Bank, each level completion/quit, retries, hints and total onboarding completion.
- Ask what negative cards do to **both** meter and Pot; what Bank secures; how much remains toward the target; why Swing, Flip and Jackpot changed; how Zero Break differs from Snap.
- Note first hesitation or incorrect action and whether interaction feedback rescues it without narration.
- Use the provisional **4/5 accurately explaining each key idea** threshold as a **formative heuristic**, not a statistically reliable retention benchmark.
- Revise confusing levels and test again. Be especially alert at L4 (Flip), L7 (two-factor event), L8 (zero) and L9 (risk).

**Exit criterion:** observable comprehension, minimal unexplained failure, and evidence that players can complete the capstone unaided. Keep anonymized notes/video with explicit consent where appropriate.

### M3 — Level system and balancing; content beyond onboarding

**Status: PARTIALLY DONE.** Immutable 10-level configuration, rule gating, a bounded deterministic simulator, and completion tests exist. **The levels are not proven enjoyable or properly difficult, and no Levels 11–200 exist.**

**Near-term work:**

1. Convert/protect the current level configuration as a clearly documented, validated contract: `id`, teaching goal, deck IDs/order, target, starting hand, snap bound, snap chances, allowed controls, factor unlocks, special restrictions, seed/replay rules.
2. Add explicit **level-design invariants**: starting cards legal, target achievable, alternative winning routes where intended, no accidental tutorial soft lock, no hidden score factor, potential Snap recoverability, no premature engine `over`.
3. Extend simulations beyond a bounded proof of *some* win: path-length distribution, percentage of dead ends, payout distribution, tolerance to untrained choices, Snap occurrence and required Banking strategies. Do not infer human difficulty directly from simulator results.
4. Balance Levels 1–10 using player observation, particularly the Level 10 target of 80.
5. Design and validate Levels **11–20** with the full learned control set and controlled variation. Expand to 20–50 only after the progression feels consistent; scale toward 200 **only after** quality and retention evidence.
6. Decide how/when to introduce optional complexity such as bank tax or hand-cap rules. Introduce one rule at a time in a named teaching context, not via invisible scoring changes.

**Exit criterion:** tested repeatable content authoring, winnability with reasonable player agency, an observed difficulty curve and clear replay behavior.

### M4 — Launch readiness and distribution

**Status: NOT DONE for Swing Casual as a separate product.**

- **Distribution:** decide web portal, PWA/TWA and later store channels. Each needs platform-specific QA, metadata, assets, loading behavior and compliance.
- **Offline:** implement and verify a casual-specific manifest, asset pre-cache, offline launch, install/update, cache migration and recovery from stale versions. Shared Overswing offline checks do not prove casual coverage.
- **Audio:** short optional tap/factor/Bank/Snap/zero cues with sound settings, reduced intrusiveness and no interruption of background YouTube/music; never initialize audio when muted.
- **Accessibility:** hit targets, readable numerals, contrast, semantic labels, reduced motion, non-color-only differentiation, screen reader/keyboard fallback as practical.
- **Performance:** older iPhones and low-end Android, large/short screens, throttled CPU/network, 60 FPS aspiration where practical, bounded DOM/GSAP and memory cleanup.
- **Reliability:** crash/error capture, release tagging, no lost/duplicated transactions, recoverable failed update, exact build SHA on screen.
- **Analytics/privacy:** event schema, consent/privacy decisions, error funnels, playable-session analysis, D1/D7 cohort retention only after actual releases and consent-aware collection.
- **Business model:** ad/monetization/boosters should be **tested after** successful first-session understanding and retention; no relic/shop/royal sprawl during onboarding.

---

## 11. Validation and measurement plan

### Research protocol (first five users)

**Setup:** fresh state via the top **Reset** control; one real phone; no verbal tutorial; screen/video observation when consented. Have the player launch from the real deployed URL, not a staged internal gameplay screen.

| Moment | What to observe | Interpretation |
|---|---|---|
| First 5 seconds | Does the player discover a playable card without instruction? | First-touch affordance and hierarchy |
| After first card | Do they notice meter direction and pending Pot growth? | Causal clarity |
| After second card | Can they find the newly enabled Bank? | Decision and eligibility feedback |
| First win | Do they understand that the secured glass grows only after Bank? | Reward-loop correctness |
| Level 4 | Do they identify Flip and distinguish it from choosing a hand card? | New-control onboarding |
| Levels 5–7 | Can they point to the factor that changed and explain why? | Multiplier comprehension |
| Levels 8–9 | Do they understand Zero Break vs Snap and what can be lost? | Risk comprehension |
| Level 10 | Do they choose Bank vs continue intentionally, without prompts? | Independent mastery |

### Proposed analytics schema (partially hooked, not fully collected)

| Event | Minimum useful properties |
|---|---|
| `onboarding_start` | session identifier, release, device class, first/opened |
| `level_start` | level ID, retry count, unlocked systems |
| `first_action` | level ID, seconds since screen ready, action kind |
| `card_play` / `flip` | level ID, step, signed card, meter before/after, added Pot, Snap flag |
| `bank_available` | level ID, step, projected payout, secured before |
| `bank` | level ID, payout, pending before, secured after, elapsed time |
| `factor_changed` | kind, before/after values, crossing/flip cause |
| `zero_break` / `snap` | level ID, pending lost/retained, remaining chances |
| `hint_shown` | level ID, step, seconds idle, type |
| `level_complete` | level ID, moves, time, score, Snap count |
| `level_exit` / `level_retry` | last action, elapsed time, failed/completed reason |
| `onboarding_complete` / `tutorial_skip` / `onboarding_reset` | level ID, total time, release, explicit action |

**Observed in code today:** a subset of browser events is dispatched. **Proposed for later:** full event shape, durations, persistence and dashboards. Never report an event name being wired as proof that telemetry is reaching a server.

### Provisional outcome hypotheses — *not measured benchmarks*

- Most first-time players should make a meaningful tap rapidly, ideally within **5 seconds**.
- Target high **Level 1 completion** among people who launch; treat **90%+** as an initial hypothesis, not a result.
- Seek strong end-to-end onboarding completion (an initial **80%+** goal can be tested, not promised).
- Detect disproportionate abandonment on Levels 4, 7 and 9.
- After launch-scale acquisition, measure voluntary next-level starts, D1/D7 return behavior, actual drop-off, replay and conversion. Do not extrapolate those from five interviews or deterministic simulations.

---

## 12. Current risks, technical debt and open decisions

| Risk / decision | Why it matters | Recommendation / owner action |
|---|---|---|
| No in-person iPhone signoff | A screenshot or unit test cannot expose touch/motion faults | Record and inspect complete real-phone interaction flow |
| Pot displays projected payout under a generic “POT” label | Users may misread future gain as already held gold | Test whether wording/animation clarifies; adjust presentation without changing engine |
| Old docs conflict with current code | Contributors may remove header/meter again or restore tappable-Pot pattern | Mark outdated sections as historical and point to this document/current source |
| Onboarding action scripts vs genuine choice | Too rigid can feel like a fake game; too open can create failure | Protect first win; increase freedom deliberately; simulator + observations |
| Snap exists in engine before explicit risk teaching | Edge-risk rules may be discoverable before hearts/danger appear | Audit every early legal path and avoid unexplained punishment |
| Level 10 target 80 | Could be an unnecessary onboarding wall | Balance against unbriefed users; prioritize successful independence over arbitrary difficulty |
| No Levels 11+ | Completing tutorial leads to replay, not a long-term loop | Plan Levels 11–20 after M2, with genuine puzzle variation |
| Multiple game sources in one repo | Shared engine changes can regress original Overswing | Preserve rule defaults and broad regression tests; split carefully |
| Shared offline/portal build versus casual shipping | Wider lab artifact does not establish casual installability | Dedicated offline/browser QA and eventual standalone packaging |
| Development Reset in production header | Excellent for testing, inappropriate for final player UX | Gate/hide behind debug switch before launch, without losing test access |
| Release version label still `v0.6.0` | Version name understates onboarding implementation | Introduce semantic casual release tag after UX baseline is accepted |
| No player evidence or live analytics | Commercial conclusions would be speculation | Instrument and validate before promising best-seller potential |

### Scope explicitly deferred

- Full Overswing Royals, abilities, relic shops, horror characters, campaign bosses, loan/economy systems or complex menus.
- Ad design, offers, paid boosts, leaderboards, PvP, social accounts and monetization work before first-session comprehension.
- A 200-level bulk content generator without a balanced 10–20-level reference set.
- Large UI rebuilds that remove the essential board to make the first screen artificially minimal.

---

## 13. Prioritized next execution plan (concrete tickets)

### Sprint A — Make the shipped onboarding trustworthy

**A1. Capture latest iPhone screen sequence.** Save screenshots/videos of first frame, card, pending Pot, enabled Bank, Bank pour, first Flip, first factor, Zero Break, Snap and win; record model, OS/browser, viewport and deployed SHA. **Exit:** zero blocking visual/interaction defects.

**A2. Gesture and transition torture test.** Rapid taps, double Bank, Reset during Bank flight, reset/reload during card action, returning from background and reduced-motion path. **Exit:** one engine action per accepted user interaction, no stranded glass/stream/card, stable HUD.

**A3. Confirm first win messaging.** New user sees three cards, meter, both bottles and Bank; after two card taps the Bank affordance becomes unmistakable. Confirm negative cards grow pending value. **Exit:** demonstrable first-touch success without an instructional popup.

**A4. Fix contradictory content.** Update legacy `docs/swing-casual-onboarding.md`, `casual.html` title/description, earlier tap-to-bank docs and onboarding versioning as needed. **Exit:** a new engineer can find one current source of truth.

### Sprint B — Prove learning through play

**B1. Five unbriefed sessions, full 10-level ladder.** Capture confusion and time to action, not just win. **Exit:** critical concepts can be explained by at least four of five participants as a provisional formative target.

**B2. Resolve hardest lessons.** Improve event timing/tooltips for crossing, Flip factor, Jackpot, Zero Break and Snap; no new clutter. **Exit:** each cause and result understood without coached narration.

**B3. Calibrate the capstone.** Compare simulator paths to actual player actions; retune L10 target/deck if it blocks mastery. **Exit:** skillful independent completion rather than accidental brute force.

### Sprint C — Create a sustainable puzzle game

**C1. Harden data schema and simulation reports** with dead-end/recovery/path distributions and reusable acceptance tests.

**C2. Prototype Levels 11–20** using one intentional variation at a time, varied puzzle geometry and honest constraints.

**C3. Add minimal anonymous funnel measurement** with release/source/device dimensions and privacy choices.

**C4. Evaluate standalone repo extraction** once core UX is stable, keeping engine parity and tests during migration.

### Sprint D — Distribution and product-market evidence

Casual-specific PWA/offline checks, audio that respects external playback, accessibility, performance QA, app/portal compliance and measurable early-cohort retention. Only then explore business-model experiments and scaling toward ~200 levels.

---

## 14. Resources, repository history and design references

### Live product and engineering

- **Repository:** <https://github.com/umuterturk/card-game-lab>
- **Playable Swing Casual:** <https://umuterturk.github.io/card-game-lab/casual.html>
- **Latest validated deployment at document snapshot:** <https://github.com/umuterturk/card-game-lab/actions/runs/42114162134>
- **Working implementation commit:** <https://github.com/umuterturk/card-game-lab/commit/e713694613dee5161138073fa2a97caceb2ca641>
- **Historical original handoff commit:** <https://github.com/umuterturk/card-game-lab/commit/11acc66bdc75e5b4e4f9a18032c3c763b65a0e09>
- **Historical handoff archive:** <https://github.com/umuterturk/card-game-lab/archive/11acc66bdc75e5b4e4f9a18032c3c763b65a0e09.zip>

### Relevant merged work

| PR | What changed |
|---|---|
| [#26 — Progressive onboarding](https://github.com/umuterturk/card-game-lab/pull/26) | Ten level definitions, engine-backed teaching rules, simulator and progressive UI |
| [#27 — Essential Level 1 board](https://github.com/umuterturk/card-game-lab/pull/27) | Restored persistent header, meter, three-card hand, Pot and Bank; separate Bank CTA |
| [#28 — Reset Progress](https://github.com/umuterturk/card-game-lab/pull/28) | Top-header reset, completion-screen fallback, local progress clearing and tests |
| [#29 — Pages workflow repair](https://github.com/umuterturk/card-game-lab/pull/29) | Initial deployment-workflow artifact-indexing changes; followed by a YAML correction on `main` |
| [#30 — Bank interaction tests](https://github.com/umuterturk/card-game-lab/pull/30) | Align legacy assertions to separate Bank CTA; eliminate misleading decorative-Pot shine |

### Planning and UX documents in repository

- [Next iterations / original master roadmap](https://github.com/umuterturk/card-game-lab/blob/main/docs/swing-casual-next-iterations.md) — **historical sequence and decisions; some details superseded**.
- [Prior onboarding design](https://github.com/umuterturk/card-game-lab/blob/main/docs/swing-casual-onboarding.md) — **initial proposal; not the current Level 1 UI**.
- [Comprehensive UX audit and backlog](https://github.com/umuterturk/card-game-lab/blob/main/docs/swing-casual-ux-review.md) — prioritization and research criteria.
- [Original iPhone P0 visual review](https://github.com/umuterturk/card-game-lab/blob/main/docs/swing-casual-iphone-p0-review.md) — historical screenshot issues and device QA targets.
- [v0.6 engine rules and multiplier parity](https://github.com/umuterturk/card-game-lab/blob/main/docs/swing-casual-v06-implementation.md) — factor model, absolute value rule.
- [Original Overswing game rules V14](https://github.com/umuterturk/card-game-lab/blob/main/docs/OVERSWING_GAME_RULES_V14.md) — **reference only**; do not import all systems into Casual.

### External design references

- [Apple — Onboarding for Games](https://developer.apple.com/app-store/onboarding-for-games/) — immediate interaction, progressive teaching and contextual onboarding reference.
- [Magic Sort onboarding capture (Gamedexy)](https://www.gamedexy.com/games/magic-sort) — **qualitative inspiration**, not a verified performance benchmark or a mechanics template.

**Resource caution:** Third-party examples are inspiration. No claim is made that Swing Casual is associated with or made by Magic Sort’s creators, that its level designs reproduce Magic Sort, or that any external onboarding performance metric transfers to this game.

---

## 15. Handoff instructions for the next engineer/designer/agent

1. **Read this document; inspect latest GitHub `main`; check the actual deployed SHA.** Do not assume the handoff commit or `v0.6.0` label represents the newest code.
2. **Preserve the current Level 1 board:** header + meter + three cards + pending Pot + secured Bank + Bank action. Never repeat the design mistake of hiding the structure to minimize first exposure.
3. **Use the authoritative engine.** Do not calculate payouts, Snap, crossing or multipliers independently in JSX or animation code. Casual-only rule changes must be opt-in and backed by original-mode regression tests.
4. **Treat the current ten levels as prototypes, not balanced content.** Check the exact target and deck in `onboardingLevels.js`; the old `firstLevel.js` is a legacy test fixture.
5. **For UI changes, test on phone.** Unit/build success does not prove animation timing, touch targets, safe-area layout or comprehension. Ask for actual first-frame and transaction recordings when needed.
6. **Prefer small, measurable iterations.** Prioritize clear Pot/Bank semantics, first touch, Bank reward and multiplier comprehension before adding decorative effects or more systems.
7. **For implementation:** update tests and docs together; run `npm test`, `npm run simulate:casual`, `npm run build`, `npm run verify:release`; inspect Actions to verify the actual deploy. Do not claim a merge alone means the site is live.
8. **Do not add unrelated systems by default.** This is casual Swing, not the original roguelike’s royal cards, abilities, relic economy or horror campaign.
9. **Maintain a decision log** when a screenshot or unbriefed user test changes the approved UI; mark earlier contradictory guidance as superseded.
10. **Always report evidence limits:** distinguish *implemented in source*, *CI verified*, *real-device observed*, *new-player validated* and *commercially validated*.

---

## 16. Final current-state assessment

The game has a credible **playable engineering foundation**: authentic engine-based mechanics, physically separate Pot and Bank, an always-visible first board, a ten-level teaching ladder, deterministic level simulation, resettable local progression and a working published build.

The largest risks are now **human-facing** rather than missing UI decorations: how quickly new players understand card direction and pending-versus-secured values; whether the early tutorial feels satisfying rather than scripted; whether the multiplier lesson sequence is digestible; and whether the Level 10 target/risk decisions are enjoyable rather than merely solvable.

**Recommended next action: run the full real-device interaction QA, then the five-player unbriefed onboarding study.** Use those results to decide the first serious gameplay/UX tuning sprint. Only after that should the product proceed to Levels 11–20 and any future 200-level expansion.

---

*Prepared from the original Swing Casual project brief supplied for this project, the progressive onboarding plan, the current GitHub repository files and the latest successful GitHub Pages workflow visible at the snapshot date. This is a versioned project handoff, not a claim of user-tested gameplay quality or launch readiness.*
