import {readFile} from 'node:fs/promises';

// Vite follows the @import lines in minimal.css. Happy-dom does not, so tests
// inline the same chapters in the same order.
export async function loadCasualCss(entry = new URL('../../src/casual/minimal.css', import.meta.url)){
  const css = await readFile(entry, 'utf8');
  const base = new URL('./', entry);
  const pattern = /@import\s+['"]([^'"]+)['"]\s*;\n?/g;
  let out = '';
  let last = 0;
  let found = false;
  for(const match of css.matchAll(pattern)){
    found = true;
    out += css.slice(last, match.index);
    out += await loadCasualCss(new URL(match[1], base));
    last = match.index + match[0].length;
  }
  out += css.slice(last);
  return found ? out : css;
}
