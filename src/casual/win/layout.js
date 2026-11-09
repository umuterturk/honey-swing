const HUD_PAD=10;
const HUD_H=54;
// Native score-board.png size. Box must match this aspect or object-fit:contain
// letterboxes and % text misses the yellow ribbon.
export const SCOREBOARD_ART_ASPECT=1398/584;

export function honeyLayout(width,height,insets={}){
  const top=Number(insets.top)||0;
  const right=Number(insets.right)||0;
  const bottom=Number(insets.bottom)||0;
  const left=Number(insets.left)||0;
  const safeW=width-left-right;
  const safeH=height-top-bottom;
  const short=safeH<520;
  const compact=safeH<700;
  const hud={x:left,y:top+HUD_PAD,w:safeW,h:HUD_H,bottom:top+HUD_PAD+HUD_H};
  const praiseH=64;
  // Keep slogan + side drops clear of the notch and Reset hit target.
  const praiseFloor=top+12;
  const praiseX=left+16;
  const reset={x:width-right-16-44,y:top+16,w:44,h:44};
  let praiseW=safeW-32;
  if(praiseFloor<reset.y+reset.h&&praiseX+praiseW>reset.x)
    praiseW=Math.max(120,reset.x-8-praiseX);
  const jarW=Math.min(compact?200:220,(compact?0.56:0.62)*safeW);
  const naturalH=jarW*1.25;
  const contentW=safeW-32;
  // Prefer full-width board; height follows the art aspect exactly.
  const preferredBoardH=contentW/SCOREBOARD_ART_ASPECT;
  const boardBudget=short?Math.min(preferredBoardH,136):compact?Math.min(preferredBoardH,160):preferredBoardH;
  const praiseGap=compact?12:10;
  const jarGap=compact?14:12;
  const ctaH=70;
  // Raise NEXT above the home indicator. Short phones lift less so the jar
  // stays readable; keep in sync with .sgv-honey-cta-wrap in styles/honey-win.css.
  const ctaLift=short?36:ctaH;
  const ctaY=height-bottom-16-ctaH-ctaLift;
  const limit=ctaY-12;
  let jarH=naturalH;
  if(short)jarH=Math.min(jarH,Math.max(110,safeH-(boardBudget+praiseH+praiseGap+jarGap+ctaLift+24)));
  const minJarY=praiseFloor+praiseH+praiseGap;
  const maxBody=limit-minJarY-jarGap-boardBudget;
  if(maxBody>0)jarH=Math.min(jarH,maxBody);
  const maxJarY=Math.max(minJarY,limit-boardBudget-jarGap-jarH);
  // Prefer the jar's vertical center slightly above mid-screen, then clamp.
  const idealJarY=top+safeH*0.44-jarH/2;
  const jarY=Math.min(maxJarY,Math.max(minJarY,idealJarY));
  // Sit the slogan just above the jar; never above the safe floor.
  const praiseTop=Math.max(praiseFloor,jarY-praiseGap-praiseH);
  const scoreboardY=jarY+jarH+jarGap;
  const maxBoardH=Math.max(96,limit-scoreboardY);
  let scoreboardW=contentW;
  let scoreboardH=scoreboardW/SCOREBOARD_ART_ASPECT;
  if(scoreboardH>maxBoardH){
    scoreboardH=maxBoardH;
    scoreboardW=scoreboardH*SCOREBOARD_ART_ASPECT;
  }
  const scoreboardX=left+(safeW-scoreboardW)/2;
  const jarX=left+(safeW-jarW)/2;
  return {
    safeW,safeH,short,hud,
    praise:{
      x:praiseX,y:praiseTop,w:praiseW,h:praiseH,
      font:Math.min(48,Math.max(40,40+(safeW-320)*8/70))
    },
    jar:{x:jarX,y:jarY,w:jarW,h:jarH},
    scoreboard:{
      x:scoreboardX,y:scoreboardY,w:scoreboardW,h:scoreboardH,
      font:Math.min(44,Math.max(32,0.11*scoreboardW))
    },
    cta:{
      x:left+(safeW-contentW*0.5)/2,y:ctaY,w:contentW*0.5,h:ctaH
    },
    reset
  };
}

// Names written by applyHoneyLayout. Fallback values live in styles/honey-win.css.
export const HONEY_LAYOUT_VARS=Object.freeze({
  praiseTop:'--honey-praise-top',
  praiseLeft:'--honey-praise-left',
  praiseWidth:'--honey-praise-width',
  praiseHeight:'--honey-praise-height',
  praiseFont:'--honey-praise-font',
  jarTop:'--honey-jar-top',
  jarLeft:'--honey-jar-left',
  jarWidth:'--honey-jar-width',
  jarHeight:'--honey-jar-height',
  scoreboardTop:'--honey-scoreboard-top',
  scoreboardLeft:'--honey-scoreboard-left',
  scoreboardWidth:'--honey-scoreboard-width',
  scoreboardHeight:'--honey-scoreboard-height',
  countFont:'--honey-count-font',
  resetTop:'--honey-reset-top',
  resetRight:'--honey-reset-right'
});

export function applyHoneyLayout(node,width,height,insets){
  if(!node||!(width>0)||!(height>0))return null;
  const layout=honeyLayout(width,height,insets);
  const set=(name,value)=>node.style.setProperty(name,value);
  const vars=HONEY_LAYOUT_VARS;
  set(vars.praiseTop,layout.praise.y+'px');
  set(vars.praiseLeft,layout.praise.x+'px');
  set(vars.praiseWidth,layout.praise.w+'px');
  set(vars.praiseHeight,layout.praise.h+'px');
  set(vars.praiseFont,layout.praise.font+'px');
  set(vars.jarTop,layout.jar.y+'px');
  set(vars.jarLeft,layout.jar.x+'px');
  set(vars.jarWidth,layout.jar.w+'px');
  set(vars.jarHeight,layout.jar.h+'px');
  set(vars.scoreboardTop,layout.scoreboard.y+'px');
  set(vars.scoreboardLeft,layout.scoreboard.x+'px');
  set(vars.scoreboardWidth,layout.scoreboard.w+'px');
  set(vars.scoreboardHeight,layout.scoreboard.h+'px');
  set(vars.countFont,layout.scoreboard.font+'px');
  set(vars.resetTop,layout.reset.y+'px');
  set(vars.resetRight,(width-layout.reset.x-layout.reset.w)+'px');
  return layout;
}
