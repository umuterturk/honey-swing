# Swing Casual

Single-player, mobile-first card puzzle extracted from [card-game-lab](https://github.com/umuterturk/card-game-lab) at `e713694`. This repository is only Swing Casual. The lab’s other games, campaign art, and Overswing portal packaging stay in the original repo.

The playable screen is `index.html` → `src/casual-main.jsx` → `src/casual/SimplifiedGame.jsx`. Scoring, Snap, crossings, and Bank payouts still come from `src/external/engines.js`. That file is copied unchanged, including the other lab engines that share it, so casual payouts stay equivalent to the source commit. Royal helpers and the original tutorial deck are the only extra engine modules it imports.

## Develop

Node.js 22.

```bash
npm ci
npm test
npm run simulate:casual
npm run dev
```

Open the Vite URL. The app is served from `/`.

```bash
npm run build
npm run verify:release
```

`scripts/verify-casual-demo.mjs` is an optional Chromium smoke test and is not part of CI.

## Layout

- `src/casual/` — onboarding levels, board, motion, and the legacy single-level screen (`CasualGame.jsx`, not mounted).
- `src/external/engines.js` — authoritative rules. Do not recompute payouts in the UI.
- `tests/` — the casual engine, onboarding, progress, and UI-source checks from the lab.
- `docs/SWING_CASUAL_MASTER_PROJECT_DOCUMENT.md` — product handoff. Older docs in `docs/` are historical.

GitHub Actions publishes `dist` to GitHub Pages on pushes to `main`. In the repository settings, Pages source must be **GitHub Actions**.
