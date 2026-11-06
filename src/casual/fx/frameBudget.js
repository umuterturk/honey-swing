// Plan §d: after 8 slow frames drop decorative particles to half, then to none.
export function createFrameBudget(){
  let slow=0;
  let scale=1;
  return {
    scale(){return scale;},
    sample(ms){
      if(ms>20){
        slow+=1;
        if(slow>=16)scale=0;
        else if(slow>=8)scale=0.5;
      }else{
        slow=0;
        scale=1;
      }
    }
  };
}
