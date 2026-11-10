import React,{useEffect,useRef} from 'react';
import {gsap} from 'gsap';
import {publicUrl} from './publicUrl.js';

export function GardenScene(){
 return <img className="sg-garden" src={publicUrl('bg2.webp')} alt="" draggable="false"/>;
}

export function Corgi(){
 return <svg className="sg-corgi" viewBox="0 0 120 117" aria-hidden="true">
  <defs><linearGradient id="dog-fur" x2="0" y2="1"><stop stopColor="#ffbe65"/><stop offset="1" stopColor="#e88a4e"/></linearGradient></defs>
  <path d="M14 30 30 0 47 29Q60 22 74 29L91 0 108 28 105 79Q95 105 60 107 19 105 15 78Z" fill="url(#dog-fur)" stroke="#fff8df" strokeWidth="6" strokeLinejoin="round"/>
  <path d="M21 27 32 10 39 32M82 30 90 10 101 29" fill="#ffdfba"/>
  <path d="M23 62Q33 88 60 92Q87 89 100 62Q84 68 61 70Q42 68 23 62Z" fill="#fffbec"/>
  <ellipse cx="60" cy="67" rx="12" ry="9" fill="#fff0d4"/>
  <path d="M37 58q7-8 14 0M69 58q7-8 14 0" stroke="#67443e" strokeWidth="5" strokeLinecap="round" fill="none"/>
  <circle cx="60" cy="65" r="5" fill="#6e4541"/><path d="M50 76q10 12 20 0" stroke="#7a4440" strokeWidth="3" strokeLinecap="round" fill="none"/>
  <ellipse cx="29" cy="73" rx="9" ry="6" fill="#f59c9c"/><ellipse cx="91" cy="73" rx="9" ry="6" fill="#f59c9c"/>
  <path d="M17 91Q54 108 96 92L106 112 86 105 64 114 43 104 29 115Z" fill="#a275df" stroke="#fff5e9" strokeWidth="3"/>
  <path d="M98 84Q116 80 115 93L112 107Q104 112 99 101Z" fill="#fff7e9" stroke="#e8a06b" strokeWidth="3"/>
  <circle cx="108" cy="95" r="3" fill="#f5a4a5"/>
 </svg>;
}

export function SwingGauge({position,limit=8}){
 const marker=useRef(null);
 useEffect(()=>{
  if(!marker.current)return;
  const x=Math.max(-limit,Math.min(limit,position))/limit*145;
  const tween=gsap.to(marker.current,{x,y:x*x/330,duration:.6,ease:'back.out(1.55)',overwrite:true});
  return ()=>tween.kill();
 },[position,limit]);
 return <div className="sg-gauge-wrap" role="img" aria-label={'Swing '+position+', safe between minus '+limit+' and plus '+limit}>
 <svg viewBox="0 0 440 280" className="sg-gauge" preserveAspectRatio="none">
 <defs>
  <linearGradient id="sw-gold" x2="0" y2="1"><stop stopColor="#ffeeb0"/><stop offset=".28" stopColor="#d79857"/><stop offset=".78" stopColor="#f4bb63"/><stop offset="1" stopColor="#a56037"/></linearGradient>
  <linearGradient id="sw-purple" x2="0" y2="1"><stop stopColor="#ad75db"/><stop offset=".7" stopColor="#7847b7"/><stop offset="1" stopColor="#503391"/></linearGradient>
  <linearGradient id="sw-lime" x2="0" y2="1"><stop stopColor="#d6ff62"/><stop offset=".6" stopColor="#8afe3c"/><stop offset="1" stopColor="#2de15b"/></linearGradient>
  <radialGradient id="sw-goldcap"><stop stopColor="#ffe99e"/><stop offset=".8" stopColor="#eab05c"/><stop offset="1" stopColor="#985b3e"/></radialGradient>
  <filter id="sw-glow"><feGaussianBlur stdDeviation="10"/></filter>
 </defs>
 <ellipse cx="220" cy="253" rx="128" ry="14" fill="#587c68" opacity=".28"/>
 <path d="M66 221Q71 202 101 204H339Q369 203 373 221L363 237H75Z" fill="#785579" opacity=".3"/>
 <path d="M135 206Q175 183 220 192Q270 183 309 207L316 238H123Z" fill="#75638d" stroke="#a29aba" strokeWidth="5"/>
 <path d="M156 230Q155 215 175 213H264Q285 214 284 230Z" fill="#bb7650" stroke="#e7b375" strokeWidth="6"/>
 <circle cx="220" cy="196" r="34" fill="url(#sw-goldcap)" stroke="#a76235" strokeWidth="7"/>
 <path d="m220 178 6 11 13 2-10 9 3 12-12-7-11 7 2-12-10-9 13-2Z" fill="#ffed76" stroke="#ffbe48" strokeWidth="3"/>
 <path d="M28 160Q220 -1 412 160" fill="none" stroke="#fff2b7" strokeWidth="58" strokeLinecap="round" opacity=".42" transform="translate(0 7)"/>
 <path d="M28 160Q220 -1 412 160" fill="none" stroke="#b36d3d" strokeWidth="61" strokeLinecap="round"/>
 <path d="M28 160Q220 -1 412 160" fill="none" stroke="url(#sw-gold)" strokeWidth="54" strokeLinecap="round"/>
 <path d="M28 160Q220 -1 412 160" fill="none" stroke="#fff8c8" strokeWidth="43" strokeLinecap="round"/>
 <path d="M28 160Q220 -1 412 160" fill="none" stroke="url(#sw-purple)" strokeWidth="37" strokeLinecap="round"/>
 <path d="M28 160Q220 -1 412 160" fill="none" stroke="#d8a9f3" strokeWidth="5" strokeLinecap="round" opacity=".5" transform="translate(0 -13)"/>
 <path d="M157 86Q220 65 283 86" fill="none" stroke="#7cff3d" strokeWidth="58" filter="url(#sw-glow)" opacity=".83"/>
 <path d="M158 86Q220 65 282 86" fill="none" stroke="url(#sw-lime)" strokeWidth="36" strokeLinecap="butt"/>
 <path d="M158 86Q220 65 282 86" fill="none" stroke="#e5ff94" strokeWidth="5" opacity=".86" transform="translate(0 -12)"/>
 <g stroke="#fffdf3" strokeWidth="4" strokeLinecap="round" opacity=".92"><path d="m67 161-11-14M108 124l-9-19M148 100l-5-21M292 100l5-21M332 124l9-19M373 161l11-14"/></g>
 <g transform="translate(220 123)">
  <g ref={marker} className="sg-pointer">
   <path d="M0-29Q5-30 10-20L26 15Q30 27 16 32H-16Q-30 27-26 15L-10-20Q-5-30 0-29Z" fill="#aa693f" stroke="#fff7bc" strokeWidth="9" strokeLinejoin="round"/>
   <path d="M0-22 19 20H-19Z" fill="#f34e8f" stroke="#f6a6a6" strokeWidth="5" strokeLinejoin="round"/>
   <path d="M-7 15 0-7 7 15Z" fill="#ff8aae" opacity=".7"/>
  </g>
 </g>
 <g fill="none" stroke="#e5fcff" strokeWidth="5" strokeLinecap="round"><path d="M123 191q-16-5-30-17m0 0 3 19m-3-19 20 1"/><path d="M317 191q16-5 30-17m0 0-3 19m3-19-20 1"/></g>
 <g className="sg-twinkles" fill="#fffabc"><path d="m167 46 5 12 12 5-12 5-5 12-5-12-12-5 12-5Z"/><path d="m286 48 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z"/></g>
 </svg>
 <div className="sg-swing-value" aria-live="polite">{position===0?'CENTER':position>0?'+'+position:String(position)}</div>
 </div>;
}

export function ScoreJar({banked,pending,goal,burst,burstId}){
 const jar=useRef(null);
 useEffect(()=>{
  if(!jar.current||!['bank','win'].includes(burst))return;
  const tween=gsap.fromTo(jar.current,{scale:.94,rotate:-3},{scale:1,rotate:0,duration:.65,ease:'elastic.out(1,.45)',overwrite:true});
  return ()=>tween.kill();
 },[burstId]);
 const stars=Math.min(15,Math.ceil(banked/3));
 return <div className="sg-score-cluster">
  <div className="sg-jar" ref={jar}>
   <svg className="sg-jar-art" viewBox="0 0 410 270" aria-label={'Collected '+banked+' of '+goal+' stars'}>
    <defs>
     <linearGradient id="jar-glass" x2="1" y2="0"><stop stopColor="#8abbe0" stopOpacity=".7"/><stop offset=".16" stopColor="#f9ffff" stopOpacity=".88"/><stop offset=".55" stopColor="#b0e6fe" stopOpacity=".34"/><stop offset=".84" stopColor="#dcf4fa" stopOpacity=".77"/><stop offset="1" stopColor="#79b0df" stopOpacity=".86"/></linearGradient>
     <linearGradient id="jar-wood" x2="0" y2="1"><stop stopColor="#ffdb95"/><stop offset=".47" stopColor="#e8ad64"/><stop offset="1" stopColor="#a96033"/></linearGradient>
     <linearGradient id="jar-plaque" x2="0" y2="1"><stop stopColor="#fffdf1"/><stop offset="1" stopColor="#ffe8c8"/></linearGradient>
     <radialGradient id="jar-star"><stop stopColor="#fff4a2"/><stop offset=".85" stopColor="#ffc836"/><stop offset="1" stopColor="#e8a324"/></radialGradient>
    </defs>
    <ellipse cx="205" cy="246" rx="190" ry="20" fill="#807a81" opacity=".2"/>
    <path d="M55 220Q205 198 355 220L381 234Q395 254 352 256H63Q20 253 29 234Z" fill="#b3a6bd" stroke="#ddd1d9" strokeWidth="7"/>
    <path d="M44 235Q205 211 365 235" fill="none" stroke="#e4d8dd" strokeWidth="6" opacity=".75"/>
    <rect x="88" y="61" width="234" height="165" rx="49" fill="url(#jar-glass)" stroke="#b1d7fa" strokeWidth="8"/>
    <path d="M100 83Q205 95 308 84" fill="none" stroke="#fff" strokeWidth="8" opacity=".6"/>
    <path d="M110 99Q108 163 121 192" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" opacity=".67"/>
    <path d="M293 94Q305 145 290 187" fill="none" stroke="#ffffff" strokeWidth="5" opacity=".6"/>
    <g className="sg-jar-starfield">
      {Array.from({length:stars},(_,i)=>{
       const x=125+(i*53)%154,y=196-Math.floor(i/5)*22;
       return <g key={i} transform={'translate('+x+' '+y+') rotate('+(i*29%35-18)+')'}>
        <path d="m0-18 6 11 13 2-10 8 3 13-12-7-12 7 3-13-10-8 13-2Z" fill="url(#jar-star)" stroke="#ffdd62" strokeWidth="3"/>
       </g>;
      })}
    </g>
    <path d="M113 57H295Q324 53 327 72L311 87H99L85 72Q87 53 113 57Z" fill="url(#jar-wood)" stroke="#fff0b7" strokeWidth="5"/>
    <rect x="81" y="49" width="248" height="27" rx="11" fill="url(#jar-wood)" stroke="#e2b47f" strokeWidth="5"/>
    <path d="M94 56Q190 48 315 57" fill="none" stroke="#fff3c8" strokeWidth="4" opacity=".84"/>
    <rect x="122" y="144" width="172" height="62" rx="21" fill="#b57e5d" opacity=".25" transform="translate(0 6)"/>
    <rect x="118" y="138" width="176" height="66" rx="21" fill="url(#jar-plaque)" stroke="#d89c5d" strokeWidth="6"/>
    <rect x="122" y="141" width="168" height="57" rx="17" fill="none" stroke="#fff9e1" strokeWidth="4"/>
    <path d="m145 158 5 9 10 1-7 7 2 10-10-5-9 5 2-10-7-7 10-1Z" fill="#ffc83e" stroke="#a36a35" strokeWidth="2"/>
    <text x="174" y="182" fill="#724331" fontSize="31" fontWeight="1000" letterSpacing="-1.5">{banked}<tspan fill="#94654d">/{goal}</tspan></text>
    <g className="sg-jar-glints" fill="#fff8b8"><path d="m82 119 5 11 11 5-11 5-5 11-5-11-11-5 11-5Z"/><path d="m329 147 5 10 10 5-10 5-5 10-5-10-10-5 10-5Z"/></g>
   </svg>
  </div>
  <span className="sg-pot-pill" aria-live="polite">★ POT <strong>{pending}</strong></span>
 </div>;
}

export function TileGlyph({type}){
 if(type==='leaf')return <svg viewBox="0 0 64 40" aria-hidden="true"><path d="M31 37V22" stroke="#279d54" strokeWidth="5" strokeLinecap="round"/><path d="M31 25Q10 25 8 7Q27 7 31 25Z" fill="#40cf5f" stroke="#169b4d" strokeWidth="3"/><path d="M32 25Q52 25 56 5Q37 7 32 25Z" fill="#4be175" stroke="#169b4d" strokeWidth="3"/></svg>;
 if(type==='drop')return <svg viewBox="0 0 64 42" aria-hidden="true"><path d="M32 3Q24 16 16 27Q11 39 32 40Q53 39 48 27Q42 17 32 3Z" fill="#2aabef" stroke="#087fd8" strokeWidth="3"/><path d="M25 31q-4-7 5-18" stroke="#c8f4ff" strokeWidth="4" strokeLinecap="round" fill="none"/></svg>;
 return <svg viewBox="0 0 64 42" aria-hidden="true"><path d="M12 30Q3 25 12 17Q18 13 22 16Q25 4 38 7Q49 8 51 20Q60 28 50 35H18Q12 35 12 30Z" fill="#ff8eb8" stroke="#e95292" strokeWidth="3"/><path d="M25 16q5-6 12-3" stroke="#ffd1e5" strokeWidth="4" strokeLinecap="round" fill="none"/></svg>;
}
