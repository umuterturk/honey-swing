#!/usr/bin/env bash
# Regenerate mobile-sized PNGs in public/ from assets/originals/.
# Originals are repo reference only — outside public/, so Vite never packages them.
# See docs/superpowers/specs/2026-11-07-mobile-image-optimization-design.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/originals"
DST="$ROOT/public"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick 'magick' is required" >&2
  exit 1
fi

if [[ ! -d "$SRC" ]]; then
  echo "Missing originals at $SRC" >&2
  exit 1
fi

# Long-edge caps (~3× on-screen). Never upscale (geometry trailing '>').
cap_for() {
  case "$1" in
    wasp-looking-right.png) echo 160 ;;
    needle-honeycomb-cell.png) echo 160 ;;
    honey-tap.png) echo 180 ;;
    bee-smiling-closed-eyes.png) echo 96 ;;
    celebration/daisy-1.png|celebration/daisy-2.png|celebration/daisy-small.png) echo 96 ;;
    celebration/*) echo 480 ;;
    empty-complete-jar.png|empty-front-jar.png|honey-fill-mask.png) echo 750 ;;
    honeycomb.png|score-board.png) echo 1200 ;;
    victory-slogan-underline.png) echo 720 ;;
    victory-slogan-side-drops-left.png) echo 200 ;;
    drop1.png) echo 128 ;;
    *) echo 1200 ;;
  esac
}

# Shipped runtime set only (unused masters stay in assets/originals/).
SHIPPED=(
  bee-smiling-closed-eyes.png
  empty-complete-jar.png
  empty-front-jar.png
  honey-fill-mask.png
  honey-tap.png
  honeycomb.png
  needle-honeycomb-cell.png
  score-board.png
  victory-slogan-side-drops-left.png
  victory-slogan-underline.png
  wasp-looking-right.png
  drop1.png
  celebration/bush-big.png
  celebration/bush-long-1.png
  celebration/daisy-1.png
  celebration/daisy-2.png
  celebration/daisy-small.png
  celebration/green-plant-1.png
  celebration/leaf-big.png
  celebration/leaf-biggest.png
  celebration/leaf-medium.png
)

optimize_one() {
  local rel="$1"
  local src="$SRC/$rel"
  local dst="$DST/$rel"
  local cap
  cap="$(cap_for "$rel")"

  if [[ ! -f "$src" ]]; then
    echo "skip missing original: $rel" >&2
    return 1
  fi

  mkdir -p "$(dirname "$dst")"
  magick "$src" \
    -strip \
    -resize "${cap}x${cap}>" \
    -define png:compression-level=9 \
    -define png:compression-filter=5 \
    "$dst"

  local before after
  before="$(wc -c < "$src" | tr -d ' ')"
  after="$(wc -c < "$dst" | tr -d ' ')"
  printf '%s  %s -> %s  (cap %spx)\n' "$rel" "$before" "$after" "$cap"
}

echo "Optimizing ${#SHIPPED[@]} shipped PNGs from assets/originals -> public"
for rel in "${SHIPPED[@]}"; do
  optimize_one "$rel"
done

echo "Done. public PNG total:"
find "$DST" -type f -name '*.png' -print0 | xargs -0 du -ch | tail -1
