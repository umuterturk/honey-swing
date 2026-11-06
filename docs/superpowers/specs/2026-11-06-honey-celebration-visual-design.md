# Honey Celebration Visual Design

**Date:** 6 November 2026  
**Status:** Approved for implementation planning  
**Target:** Bring the current win screen toward the mood and polish of `public/reference.png` while preserving the current jar artwork, jar geometry, content, and interaction.

## 1. Scope and constraints

The implementation is a layered CSS/DOM lighting pass over the existing celebration. It may use the existing images under `public/celebration/`, but it must not create, regenerate, repaint, crop, or overwrite image assets.

Preserve exactly:

- The rendered position and dimensions of `.sgv-honey-hero-art`.
- `public/empty-complete-jar.png`, `public/empty-front-jar.png`, and `public/honey-fill-mask.png`.
- The settled honey fill height of 78%.
- The existing “Hiveful!” copy and its layout slot.
- The existing background geometry, Reset geometry, NEXT geometry, safe-area behavior, and NEXT interaction.
- Existing win semantics, dismissal behavior, accessibility announcement, score, target, and praise tier.

Allowed changes:

- DOM layers used only for decorative presentation.
- CSS masks, gradients, filters, opacity, shadows, blend treatment, animations, and responsive safeguards.
- Existing foliage images from `public/celebration/`.
- CSS-generated confetti and four-point sparkles.

The implementation must not substitute the reference jar, title, or background. The reference defines mood, focus, depth, and reward intensity rather than literal asset replacement.

## 2. Visual hierarchy

The eye path is:

1. “Hiveful!” praise
2. Filled jar and its luminous honey
3. One-pass shine and celebration particles
4. NEXT
5. Reset

NEXT remains the only primary action. Reset remains readable and tappable but visually secondary. Decorative foliage, flowers, confetti, and sparkles are non-interactive and cannot obscure or compete with either control.

## 3. Layer architecture

Inside the win overlay, render from back to front:

1. Existing gameplay garden
2. Cool dark celebration scrim
3. Warm radial light centered behind the jar
4. Rear celebration foliage
5. Existing praise title
6. Jar back PNG
7. Masked honey body and surface
8. Masked internal honey lighting
9. Masked diagonal reflection and moving gleam
10. Jar front PNG
11. Exterior glass glints
12. Foreground celebration foliage and daisies
13. Confetti and peripheral sparkles
14. Reset and NEXT

All decorative layers use `pointer-events: none`. Reset and NEXT keep their current pointer behavior and z-order above decoration.

## 4. Jar coordinate contract

The jar container retains its existing CSS variables and rendered rectangle:

- `--honey-jar-left`
- `--honey-jar-top`
- `--honey-jar-width`
- `--honey-jar-height`

The jar back image, honey wrapper, internal-light wrapper, moving gleam, and jar front image all use the same jar-local coordinate system:

- `position: absolute`
- `inset: 0`
- `width: 100%`
- `height: 100%`
- no independent translation or scale

No responsive rule may alter one jar layer without applying the same coordinate mapping to every other jar layer.

## 5. Mask alignment

Use `public/honey-fill-mask.png` unchanged. Define one shared mask declaration and apply it identically to:

- the honey body and surface;
- the static internal-light layer;
- the diagonal reflection;
- the moving gleam.

The declaration must include:

- `mask-image` and `-webkit-mask-image`;
- `mask-size: 100% 100%`;
- `-webkit-mask-size: 100% 100%`;
- `mask-position: 50% 50%`;
- `-webkit-mask-position: 50% 50%`;
- no-repeat for both implementations.

The mask wrapper remains `inset: 0`. It must not use an extra aspect-ratio correction, transform, or breakpoint-specific offset. Honey and internal light must not appear in the mouth opening, outside the glass wall, or below the base.

## 6. Honey rendering

Retain the settled fill height at 78%. Replace the current flat appearance with layered CSS color:

- Surface: pale cream-gold `#fff2ad`.
- Upper liquid: saturated yellow-gold `#ffc83d`.
- Mid-body: warm amber `#ff9d0a`.
- Base: deeper orange-gold `#e97800`.

Use `linear-gradient(180deg, #fff2ad 0%, #ffc83d 18%, #ff9d0a 58%, #e97800 100%)` as the base. Add:

- a central `#fff6a8` radial glow at 22% opacity;
- `#9d4e00` edge shading at no more than 18% opacity;
- a lower-center `#fff06a` bloom at 24% opacity;
- a shallow elliptical surface at the existing fill boundary.

The surface ellipse has a `#fff8c7` center, `#f49a00` edge, and `0 0 14px #ffc83d99` glow. It stays inside the shared mask and does not move independently from the fill boundary.

The front-glass PNG remains unchanged and renders at `opacity: .72`. Retain the blue rim and white painted highlights and do not expose hard PNG edges.

## 7. Shine and glass lighting

Add two internal treatments above honey and below the front glass:

1. A broad diagonal reflection, rotated `-14deg`, using a `16%`-wide white-to-transparent band at 18% opacity and rising from lower-left to upper-right.
2. A narrow `22%`-wide moving gleam that crosses left-to-right once after the fill settles.

Both treatments use the same full-size mask and coordinate system as the honey. The diagonal reflection remains visible in the final state. The moving gleam:

- starts after the main fill/reveal motion;
- lasts 760 ms;
- uses an ease-out curve;
- runs once;
- ends fully transparent;
- never loops while the player waits.

Keep the two existing exterior sparkle nodes. Render them as four-point glints at 72% opacity above the front-glass layer. Add `0 0 55px #ffa82066` behind the jar and a tighter `0 0 12px #68d9ff88` rim shadow around the jar edge. These effects cannot alter the jar’s bounding box or shift its perceived baseline.

Under `prefers-reduced-motion: reduce`, show the final honey, diagonal reflection, glow, and glints immediately and disable the moving gleam.

## 8. Background focus

Keep the gameplay background and its geometry visible. Place a `rgb(9 34 43 / 44%)` scrim above it. Add a radial opening centered on the jar, transparent through the inner 24% and reaching the full scrim color at 68%, so the center remains warmer and brighter than the edges.

The treatment includes:

- an edge vignette capped at 24% black;
- bottom darkening capped at 18% black behind foreground foliage;
- warm amber light behind the jar;
- no backdrop replacement;
- no duplicated waterfall asset.

The existing right-side waterfall remains the only waterfall. `public/celebration/waterfall.png` is excluded because a second waterfall would compete with the reward.

## 9. Existing celebration assets

Use only existing files. The intended foliage composition is:

- `bush-long-1.png`: broad rear foliage across the lower background.
- `bush-big.png`: lower side depth, partially cropped by a viewport edge.
- `green-plant-1.png`: lower-corner accent.
- `leaf-biggest.png`, `leaf-big.png`, and `leaf-medium.png`: sparse edge framing.
- `daisy-1.png`, `daisy-2.png`, and `daisy-small.png`: lower-corner flower accents.

Asset rules:

- Rear `bush-long-1.png` spans 112% of the viewport width, begins at `left: -6%`, and sits above the NEXT clearance zone. It uses `brightness(.62) saturate(.8)` and 82% opacity.
- `bush-big.png` occupies no more than 34% of viewport width and is cropped by one lower side edge.
- `green-plant-1.png` occupies no more than 28% of viewport width in the opposite lower corner.
- Rear foliage is darker, softer, and lower contrast than the jar.
- Foreground foliage uses `brightness(.86) saturate(.95)` and remains sharper than rear foliage.
- Side leaves are cropped by viewport edges and point inward.
- Foliage cannot cover the jar mouth, praise title, Reset, or NEXT.
- Daisies remain concentrated near the lower corners.
- Do not place decoration in the central NEXT tap corridor.
- Do not use every available asset merely because it exists.

The composition must remain stable from 320×568 through 430×932 portrait viewports. Smaller screens may hide secondary leaves or daisies, but must not scale or move the jar.

## 10. Praise, particles, and controls

Keep “Hiveful!” in its existing slot. Increase its reward presence through CSS only:

- cream-to-gold fill;
- dark plum outline;
- shallow drop shadow;
- `0 4px 12px #f0a51f66` amber glow.

Do not replace it with “NECTAR!”.

Add a limited set of CSS-generated confetti pieces around the upper half of the jar and a few peripheral four-point sparkles. Confetti stays clear of praise and Reset and does not form a continuous particle loop.

Reset keeps its current rectangle and label. Slightly lower its contrast against the celebration so it remains secondary without becoming unreadable.

NEXT keeps its current rectangle, text, safe-area inset, and tap behavior. Enrich its existing gold treatment with:

- brighter top highlight;
- saturated center;
- deeper amber lower edge;
- warm exterior glow;
- unchanged pressed scale and clear pressed depth.

NEXT must remain visually louder than Reset and available within 2.5 seconds.

## 11. Motion sequence

The intended sequence is:

1. Darken the background over 180 ms.
2. Fade rear and foreground foliage into their final positions over 250 ms.
3. Settle the existing praise reveal.
4. Complete the existing honey fill at the unchanged 78% level.
5. Run the internal gleam once.
6. Resolve confetti and sparkles into the final composition.
7. Bring NEXT to full emphasis no later than 2.5 seconds after the win starts.

Animations do not shift layout or delay interaction locks beyond existing behavior. A settled, skipped, or reduced-motion state renders the same final composition without requiring a partially completed animation.

## 12. Accessibility and interaction

- Preserve the existing dialog semantics and live status announcement.
- Decorative images use empty alt text or are hidden from assistive technology.
- Decorative DOM cannot receive focus.
- Keep Reset and NEXT at least 44 CSS pixels in both dimensions.
- Preserve visible keyboard focus.
- Do not convey completion or action availability by color alone.
- Reduced motion displays the final state immediately.

## 13. Acceptance criteria

Implementation is accepted when:

1. The jar’s rendered left, top, width, and height match the pre-change screen pixel-for-pixel at the reference viewport.
2. No existing image file has changed and no new image file has been created.
3. The mask maps identically across honey, internal lighting, diagonal reflection, and gleam.
4. Honey and internal light never leak outside the jar interior.
5. Honey remains saturated after the front-glass PNG is composited.
6. The moving gleam crosses once and does not loop.
7. Existing celebration foliage frames the screen without covering the title, jar mouth, Reset, or NEXT.
8. The right-side waterfall is not duplicated.
9. NEXT is visible, tappable, and fully emphasized within 2.5 seconds.
10. Settled, skipped, and reduced-motion states all produce the same final layout.
11. The final screen reads as a reward reveal at thumbnail size while retaining the original game scene and jar.
12. The layout remains usable at 320×568, the current screenshot viewport, and 430×932.

## 14. Verification

Verify with:

- before/after screenshots at the current viewport;
- portrait screenshots at 320×568 and 430×932;
- pixel comparison of the jar container rectangle before and after;
- visual inspection of the jar mouth, side walls, and base for mask leakage;
- animation observation through reveal, settled, skipped, and reduced-motion states;
- keyboard focus and pointer checks for Reset and NEXT;
- a real-device check for glare, contrast, safe-area clearance, and one-handed NEXT access.

