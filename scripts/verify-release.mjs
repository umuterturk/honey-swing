// Checks the Swing Casual site artifact. Gameplay rules are covered by npm test.
import assert from 'node:assert/strict';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
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
// Root-absolute /foo.png breaks on GitHub Pages project URLs (base ./).
const assetsDir=join(out,'assets');
const bundles=existsSync(assetsDir)
  ?readdirSync(assetsDir).filter(name=>/\.(js|css)$/.test(name)).map(name=>join(assetsDir,name))
  :[];
for(const file of bundles){
  const text=readFileSync(file,'utf8');
  assert.doesNotMatch(text,/(?:src|href)=["']\/[A-Za-z0-9._/-]+\.(?:png|jpg|webp|svg|gif)/,
    'Root-absolute media URL in '+file);
  assert.doesNotMatch(text,/url\(\s*['"]?\/[A-Za-z0-9._/-]+\.(?:png|jpg|webp|svg|gif)/,
    'Root-absolute CSS url() in '+file);
}
for(const asset of [
  'honey-tap.webp','honeycomb.webp','honey-fill-mask.webp',
  'empty-complete-jar.webp','empty-front-jar.webp','celebration/daisy-2.webp'
])assert.ok(existsSync(join(out,asset)),'Missing public asset '+asset);
console.log('Swing Casual release artifact ok');
