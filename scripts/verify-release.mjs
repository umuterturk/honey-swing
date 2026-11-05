// Checks the Swing Casual site artifact. Gameplay rules are covered by npm test.
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const out=resolve(process.argv[2]||'dist');
for(const file of ['index.html','manifest.webmanifest','icon.svg'])
  assert.ok(existsSync(join(out,file)),`Missing ${file}`);
const html=readFileSync(join(out,'index.html'),'utf8');
assert.match(html,/id="swing-visible-build"/,'Always-visible build label missing');
assert.match(html,/(?:Swing\s+)?v0\.6\.0\s*·\s*(?:[a-f0-9]{8}|local)/,
  'Casual build SHA was not injected into the page');
assert.ok(!html.includes('__CASUAL_COMMIT__'),'Unreplaced build marker');
assert.match(html,/manifest\.webmanifest/,'PWA manifest link missing');
const manifest=JSON.parse(readFileSync(join(out,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.display,'standalone');
assert.equal(manifest.start_url,'./');
assert.ok(manifest.icons?.length,'Manifest needs an icon');
console.log('Swing Casual release artifact ok');
