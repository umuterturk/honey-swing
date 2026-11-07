import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {Window} from 'happy-dom';

const win=new Window({url:'https://honey.test/components'});
globalThis.window=win;
globalThis.document=win.document;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
register('./jsx-loader.mjs',import.meta.url);

const {act,createElement}=await import('react');
const {createRoot}=await import('react-dom/client');
const {OnboardingHud}=await import('../src/casual/OnboardingHud.jsx');
const {OnboardingControls}=await import('../src/casual/OnboardingControls.jsx');
const {newOnboardingRound,onboardingLevel,onboardingActions}=await import('../src/casual/onboardingLevels.js');

after(()=>win.happyDOM.abort());

async function mount(Component,props){
  const host=document.createElement('div');
  document.body.appendChild(host);
  const root=createRoot(host);
  const render=async next=>act(async()=>root.render(createElement(Component,next)));
  await render(props);
  return {host,render,dispose:async()=>{await act(async()=>root.unmount());host.remove();}};
}

test('header reset and tools remain clickable across onboarding levels',async()=>{
  const events=[];
  const props={
    level:onboardingLevel(1),shownGold:9,hearts:2,docking:false,
    devMenuOpen:false,help:false,onReset:()=>events.push('reset'),
    onToggleMenu:()=>events.push('menu'),onGoToLevel:()=>events.push('go'),
    onToggleHelp:()=>events.push('help'),onSkip:()=>events.push('skip')
  };
  const ui=await mount(OnboardingHud,props);
  try{
    assert.match(ui.host.querySelector('.sgv-gold-counter').textContent,/9/);
    await act(async()=>ui.host.querySelector('.sgv-reset-progress').click());
    await act(async()=>ui.host.querySelector('.sgv-dev-menu-toggle').click());
    assert.deepEqual(events,['reset','menu']);
    await ui.render({...props,devMenuOpen:true});
    const actions=[...ui.host.querySelectorAll('.sgv-dev-menu button')];
    assert.equal(actions.length,3);
    for(const button of actions)await act(async()=>button.click());
    assert.deepEqual(events,['reset','menu','go','help','skip']);
    await ui.render({...props,level:onboardingLevel(20),devMenuOpen:true});
    assert.equal(ui.host.querySelectorAll('.sgv-dev-menu button').length,2);
  }finally{await ui.dispose();}
});

test('cards, SAVE and FLIP forward exactly one action and preserve disabled controls',async()=>{
  const round=newOnboardingRound(5);
  const level=onboardingLevel(5);
  const actions=[];
  const source=document.createElement('div');
  const props={
    shownHand:round.game.deal.hand,level,round,pulseIndex:null,
    finished:false,animating:false,available:onboardingActions(round),
    onPlay:(action,element)=>actions.push({action,element}),
    bankPulse:false,canBank:false,potDisplay:0,bankMessage:'Play more cards',
    bankLive:'',remaining:round.game.deal.deck.length-round.game.deal.pos,
    docking:false,flipPulse:false,canFlip:true,getBankSource:()=>source
  };
  const ui=await mount(OnboardingControls,props);
  try{
    assert.equal(ui.host.querySelector('.sgv-bank-command').disabled,true);
    await act(async()=>ui.host.querySelector('.sgv-bank-command').click());
    assert.equal(actions.length,0);
    await act(async()=>ui.host.querySelector('.sgv-card').click());
    assert.equal(actions[0].action.type,'steer');
    assert.equal(actions[0].action.index,0);
    await act(async()=>ui.host.querySelector('.sgv-flip').click());
    assert.equal(actions[1].action.type,'flip');
    await ui.render({...props,canBank:true,potDisplay:7});
    assert.match(ui.host.querySelector('.sgv-bank-command').textContent,/SAVE 7/);
    await act(async()=>ui.host.querySelector('.sgv-bank-command').click());
    assert.equal(actions[2].action.type,'bank');
    assert.equal(actions[2].element,source);
  }finally{await ui.dispose();}
});
