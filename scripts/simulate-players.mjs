import {pathToFileURL} from 'node:url';
import {runPlayerSim} from './players/run.mjs';
import {renderReport} from './players/report.mjs';

function integerOption(argv,index,name){
  const value=Number(argv[index])
  if(!Number.isInteger(value)||value<1)throw new Error(name+' must be a positive integer')
  return value
}

export function parsePlayerArgs(argv){
  const options={}
  for(let index=2;index<argv.length;index++){
    const arg=argv[index]
    if(arg==='--attempts')options.attempts=integerOption(argv,++index,'--attempts')
    else if(arg==='--sessions')options.sessions=integerOption(argv,++index,'--sessions')
    else throw new Error('Unknown argument '+arg)
  }
  return options
}

export function main(argv=process.argv){
  process.stdout.write(renderReport(runPlayerSim(parsePlayerArgs(argv))))
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main()
}
