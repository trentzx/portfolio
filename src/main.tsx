import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, ArrowUpRight, MoveHorizontal, RotateCcw, Tv, Volume2, VolumeX } from 'lucide-react';
import { Screen } from './Screen';
import { channels, portfolio } from './content';
import type { MotionState } from './Television';
import './style.css';
const Television = lazy(() => import('./Television'));
const Console = lazy(() => import('./Console'));
function validRoute() {const value = location.hash.slice(1); const [id, project] = value.split('/'); return id === 'channels' || (channels.some(c => c.id === id) && (!project || (id === 'projects' && portfolio.projects.some(p => p.id === project)))) ? value : '';}
function useMedia(query:string) {const [value, set] = useState(() => matchMedia(query).matches); useEffect(() => { const media = matchMedia(query); const change = () => set(media.matches); media.addEventListener('change',change); return () => media.removeEventListener('change',change);},[query]); return value;}
function supportsWebGL() {try {const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true;}catch {return false;}}
class SceneBoundary extends Component<{children:React.ReactNode;fallback:React.ReactNode},{failed:boolean}> {state={failed:false}; static getDerivedStateFromError(){return {failed:true};} render(){return this.state.failed ? this.props.fallback : this.props.children;}}
function App() {
 const [route,setRoute] = useState(validRoute);
 const entered = !!route;
 const mobile = useMedia('(max-width: 759px)');
 const reduced = useMedia('(prefers-reduced-motion: reduce)');
 const [webgl,setWebgl] = useState(supportsWebGL);
 const [lite,setLite] = useState(false);
 const [sound,setSound] = useState(false);
 const [power,setPower] = useState<'idle'|'charging'|'waking'|'shutdown'>('idle');
 const powerTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
 const cancelPower = useCallback(() => {powerTimers.current.forEach(clearTimeout);powerTimers.current=[];setPower('idle');},[]);
 useEffect(() => () => powerTimers.current.forEach(clearTimeout),[]);
 const audio = useRef<AudioContext | null>(null);
 const initialIntro = useRef(!entered);
 const [intro,setIntro] = useState(initialIntro.current && !entered && !reduced);
 const motion = useRef<MotionState>({x:.10,y:-.62,vx:0,vy:0,dragging:false,intro:initialIntro.current,wake:()=>{}});
 const pointer = useRef({x:0,y:0,startX:0,startY:0,moved:false});
 const go = useCallback((path:string) => { if(location.hash.slice(1) !== path) {if(path) location.hash = path; else {history.pushState(null,'',location.pathname+location.search); setRoute('');}} },[]);
 const chime = useCallback(() => {if(!sound) return; try {audio.current ||= new AudioContext(); void audio.current.resume(); const osc = audio.current.createOscillator(); const gain=audio.current.createGain(); osc.connect(gain); gain.connect(audio.current.destination); osc.type='sine'; osc.frequency.setValueAtTime(660,audio.current.currentTime); osc.frequency.exponentialRampToValueAtTime(880,audio.current.currentTime+.1); gain.gain.setValueAtTime(.035,audio.current.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audio.current.currentTime+.18); osc.start(); osc.stop(audio.current.currentTime+.2);}catch {/* Audio is optional. */}},[sound]);
 const navigate = (path:string) => {
  if (!entered && path === 'channels' && !reduced) {
   if (power !== 'idle') return;
   chime(); setIntro(false); setPower('charging');
   motion.current.dragging=false; motion.current.vx=0;motion.current.vy=0;
   void import('./Television');
   powerTimers.current = [setTimeout(() => {setPower('waking');go('channels');},420),setTimeout(() => {setPower('idle');powerTimers.current=[];},1120)];
   return;
  }
  cancelPower(); chime(); go(path);
 };
 useEffect(() => { const update = () => {setRoute(validRoute()); if(!location.hash) cancelPower();}; window.addEventListener('hashchange',update); window.addEventListener('popstate',update); return () => {window.removeEventListener('hashchange',update); window.removeEventListener('popstate',update);};},[]);
 useEffect(() => {const title = channels.find(c => c.id === route.split('/')[0])?.name; document.title = `${title || 'Signal'} — ${portfolio.name} · Portfolio`;},[route]);
 useEffect(() => {try{sessionStorage.setItem('signal-intro','1');}catch{/* Storage may be unavailable. */} const timer = setTimeout(() => setIntro(false),1500); return () => {clearTimeout(timer); void audio.current?.close();};},[]);
 useEffect(() => {const escape = (e:KeyboardEvent) => {if(e.key !== 'Escape') return; if(power !== 'idle'){cancelPower();go('channels');return;} if(route.includes('/')) go('projects'); else if(route && route !== 'channels') go('channels'); else if(route) go('');}; window.addEventListener('keydown',escape); return () => window.removeEventListener('keydown',escape);},[route,go,power,cancelPower]);
 const previousEntered = useRef(entered);
 useEffect(() => {if(previousEntered.current && !entered) {motion.current.x=.10;motion.current.y=-.62;motion.current.wake(); setTimeout(() => document.querySelector<HTMLButtonElement>('.enter-button')?.focus(),50);} previousEntered.current=entered;},[entered]);
 const turnOff = () => {
  cancelPower(); chime();
  if(reduced){go('');return;}
  setPower('shutdown');
  powerTimers.current=[setTimeout(()=>{go('');setPower('idle');powerTimers.current=[];},320)];
 };
 const changeChannel = (step:number) => {
  const index=channels.findIndex(c=>c.id===route.split('/')[0]);
  navigate(channels[index<0 ? (step>0 ? 0 : channels.length-1) : (index+step+channels.length)%channels.length].id);
 };
 const hardware = {onPower:turnOff,onPrevious:()=>changeChannel(-1),onNext:()=>changeChannel(1)};
 const flat = (mobile && entered) || !webgl || lite;
 const screen = <Screen route={route} go={navigate} sound={sound} toggleSound={() => setSound(v=>!v)} active={entered && power !== 'waking' && power !== 'shutdown'}/>;
 const flatTV = <div className={`flat-tv ${entered ? 'flat-entered' : ''}`}><div className="flat-bezel">{screen}</div><div className="flat-hardware"><div className="flat-speaker"/><span>signal</span><div className="flat-controls"><button aria-label="Previous channel" onClick={hardware.onPrevious}>−</button><button aria-label="Next channel" onClick={hardware.onNext}>+</button><button aria-label="Turn off TV and return to Wii" onClick={turnOff}>⏻</button></div><b/></div></div>;
 const flatConsole = <button className="flat-console-launch" onClick={() => navigate('channels')} aria-label="Turn on console and enter portfolio"><span className="flat-console"><i className="console-slot"/><i className="console-power"/><span>wii</span></span><span className="console-stand"/></button>;
 return <div className={`app ${entered ? 'is-entered' : ''} ${flat ? 'is-flat' : ''} is-${power}`}><a className="skip-link" href="#channels">Skip to portfolio</a><header className="site-header"><a className="brand" href="#" aria-label="Signal home" onClick={e=>{e.preventDefault();go('');}}><span className="brand-icon"><Tv size={19}/></span>signal<span className="brand-dot">®</span></a>{entered && <span className="header-middle">A PERSONAL PORTFOLIO, TUNED TO YOU.</span>}<button className="header-contact" onClick={()=>navigate('contact')}>Say hello<ArrowUpRight size={16}/></button></header>
 <main>{entered ? <div className="intro-copy"><div className="eyebrow"><span/>YOU’RE ON THE RIGHT CHANNEL</div><h1>Make yourself at home.</h1><p>A collection of work, play, and everything in between.</p></div> : <h1 className="visually-hidden">Your personal portfolio. Press the Wii to begin.</h1>}
 <section className="stage" aria-label={entered ? "CRT television portfolio" : "Interactive Wii-style console"}><div className="stage-halo"/>
 {flat ? (entered ? flatTV : flatConsole) : <SceneBoundary fallback={entered ? flatTV : flatConsole}><Suspense fallback={<div className="scene-loading"><Tv/>Tuning in…<button onClick={()=>setLite(true)}>Open lightweight view</button></div>}><div className="scene-transition" key={entered ? "crt" : "console"}>{entered ? <Television {...hardware} entered={entered} motion={motion} reduced={reduced} onFailure={()=>setWebgl(false)}>{screen}</Television> : <Console motion={motion} reduced={reduced} mobile={mobile} powering={power === 'charging'} onFailure={()=>setWebgl(false)}/>}</div></Suspense></SceneBoundary>}
 {!entered && !flat && <div className="drag-surface" role="group" tabIndex={0} aria-label="Rotate Wii-style console. Drag or use arrow keys. Press Enter to turn on the CRT portfolio." onPointerDown={e=>{if(power !== 'idle')return;e.currentTarget.setPointerCapture(e.pointerId); const m=motion.current; m.dragging=true;m.vx=0;m.vy=0;pointer.current={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};setIntro(false);m.wake();}} onPointerMove={e=>{if(!motion.current.dragging)return; const prev=pointer.current; const dx=e.clientX-prev.x,dy=e.clientY-prev.y; if(Math.hypot(e.clientX-prev.startX,e.clientY-prev.startY)>6)prev.moved=true; if(prev.moved){motion.current.y+=dx*.009;motion.current.x=Math.max(-.55,Math.min(.55,motion.current.x+dy*.005));motion.current.vy=dx*.0018;motion.current.vx=dy*.001;motion.current.wake();}prev.x=e.clientX;prev.y=e.clientY;}} onPointerUp={e=>{if(power !== 'idle')return;motion.current.dragging=false; if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);motion.current.wake();if(!pointer.current.moved)navigate('channels');}} onPointerCancel={()=>{motion.current.dragging=false;motion.current.vx=0;motion.current.vy=0;}} onKeyDown={e=>{if(e.key==='Enter'){navigate('channels');return;} const m=motion.current; if(e.key.startsWith('Arrow')){e.preventDefault(); if(e.key==='ArrowLeft')m.y-=.3;if(e.key==='ArrowRight')m.y+=.3;if(e.key==='ArrowUp')m.x=Math.max(-.55,m.x-.15);if(e.key==='ArrowDown')m.x=Math.min(.55,m.x+.15);m.wake();}}}/>}</section>
 <div className="stage-actions">{entered ? null : <><div className="rotate-hint">{!flat ? <><MoveHorizontal size={17}/><span>Drag to explore</span><button aria-label="Reset console rotation" onClick={()=>{motion.current.x=.10;motion.current.y=-.62;motion.current.vx=0;motion.current.vy=0;motion.current.wake();}}><RotateCcw size={14}/></button></> : <span>Six channels. One little world.</span>}</div><button disabled={power !== 'idle'} className="primary enter-button" onClick={()=>{setIntro(false);navigate('channels');}}>{power === 'charging' ? 'Powering on…' : 'Press to start'}<ArrowRight size={16}/></button><span className="action-caption">{intro ? <button className="skip-intro" onClick={()=>{setIntro(false);navigate('channels');}}>Skip intro →</button> : ''}</span></>}</div></main>
 <div className="visually-hidden" role="status">{power === 'charging' ? 'Console powering on.' : power === 'waking' ? 'Television waking up.' : ''}</div><footer className="site-footer"><span>© {new Date().getFullYear()} {portfolio.name}<span className="sample-label">SAMPLE CONTENT</span></span><span className="footer-note">A little nostalgia. A space of my own.</span><div><button aria-label={sound?'Turn sound off':'Turn sound on'} aria-pressed={sound} onClick={()=>setSound(v=>!v)}>{sound?<Volume2 size={15}/>:<VolumeX size={15}/>}Sound {sound?'on':'off'}</button></div></footer></div>;
}
createRoot(document.getElementById('root')!).render(<App/>);


