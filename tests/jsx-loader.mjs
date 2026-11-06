import {readFile} from 'node:fs/promises';
import {transformSync} from 'esbuild';

// Node's test runner has no JSX parser. createElement files pass through.
// Files that contain JSX are transformed so a mounted SimplifiedGame can load.
export async function load(url,context,nextLoad){
  if(url.endsWith('.jsx')){
    let source=await readFile(new URL(url),'utf8');
    if(source.includes('<')){
      source=transformSync(source,{
        loader:'jsx',format:'esm',jsx:'automatic',sourcefile:new URL(url).pathname,
        define:{
          'import.meta.env.DEV':'false',
          'import.meta.env.PROD':'true',
          'import.meta.env.MODE':'"test"'
        }
      }).code;
    }
    return {format:'module',source,shortCircuit:true};
  }
  return nextLoad(url,context);
}
