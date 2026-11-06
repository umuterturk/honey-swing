import {readFile} from 'node:fs/promises';

// Node's test runner has no JSX parser. FxLayer.jsx is plain createElement,
// so treating that extension as a module lets the render test import it.
export async function load(url,context,nextLoad){
  if(url.endsWith('.jsx')){
    const source=await readFile(new URL(url),'utf8');
    return {format:'module',source,shortCircuit:true};
  }
  return nextLoad(url,context);
}
