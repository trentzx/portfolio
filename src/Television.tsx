import { ContextGuard } from './ContextGuard';
import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, RoundedBox, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { ReactNode, MutableRefObject } from 'react';

export type MotionState = { x: number; y: number; vx: number; vy: number; dragging: boolean; intro: boolean; wake: () => void };
type HardwareControls = {onPower:()=>void;onPrevious:()=>void;onNext:()=>void};
const ivory = '#d7d4c6';
function Box({ position, size, color = ivory, radius = .08 }: {position: [number,number,number]; size: [number,number,number]; color?: string; radius?: number}) {
 return <RoundedBox args={size} position={position} radius={radius} smoothness={3}><meshStandardMaterial color={color} roughness={.48} metalness={.04}/></RoundedBox>;
}
function RoundButton({x, y, r = .08, color = '#777c74'}: {x:number;y:number;r?:number;color?:string}) {
 return <mesh position={[x,y,1.295]} rotation={[Math.PI / 2,0,0]}><cylinderGeometry args={[r,r,.07,24]}/><meshStandardMaterial color={color} roughness={.42}/></mesh>;
}
function Model({ children, entered, motion, reduced, onPower, onPrevious, onNext }: HardwareControls & {children: ReactNode; entered: boolean; motion: MutableRefObject<MotionState>; reduced:boolean}) {
 const group = useRef<THREE.Group>(null!);
 const screen = useRef<HTMLDivElement>(null);
 const { camera, invalidate, size } = useThree();
 const first = useRef(true);
 const enteredCameraZ = useRef<number | null>(null);
 useEffect(() => {motion.current.wake = invalidate; invalidate();}, [invalidate, motion, entered, reduced, size]);
 useFrame((_, delta) => {
  const m = motion.current;
  const dt = Math.min(delta,.04);
  if (first.current) { group.current.rotation.set(reduced ? 0 : -.07, reduced ? 0 : m.intro ? -.95 : -.18, 0); first.current = false; }
  if (entered || reduced) { m.x = 0; m.y = 0; m.vx = 0; m.vy = 0; }
  else if (!m.dragging) {m.x = THREE.MathUtils.clamp(m.x + m.vx, -.55, .55); m.y += m.vy; m.vx *= Math.exp(-dt*6); m.vy *= Math.exp(-dt*6);}
  const alpha = reduced ? 1 : 1-Math.exp(-dt * (m.dragging ? 18 : 4.5));
  group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, m.x, alpha);
  group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, m.y, alpha);
  // Fit to both dimensions, then move closer in menu mode.
  const fit = Math.max(9.8, 6.8 / (size.width / size.height));
  if (!entered) enteredCameraZ.current = null;
  if (entered && enteredCameraZ.current === null) enteredCameraZ.current = fit - .95;
  const targetZ = entered ? enteredCameraZ.current! : fit + .7;
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, alpha);
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, entered ? -.12 : 0, alpha);
  if (screen.current) screen.current.style.visibility = Math.cos(group.current.rotation.y) > .15 ? 'visible' : 'hidden';
  const moving = Math.abs(group.current.rotation.y-m.y) + Math.abs(group.current.rotation.x-m.x) + Math.abs(camera.position.z-targetZ) + Math.abs(m.vx) + Math.abs(m.vy) > .00015;
  if(moving || m.dragging) invalidate();
 });
 return <><group ref={group}>
  {/* A broad molded front, tapered-looking rear shell, and a visible case seam. */}
  <Box position={[0,0,-.28]} size={[5.65,4.16,2.35]} radius={.33} color="#b4b6aa"/>
  <Box position={[0,.06,-1.25]} size={[4.8,3.52,1.35]} radius={.3} color="#c3c4b8"/>
  <Box position={[0,0,.7]} size={[6.05,4.5,1.04]} radius={.29}/>
  <Box position={[-.22,.22,1.226]} size={[5.18,3.69,.12]} radius={.25} color="#8a8d81"/>
  <Box position={[-.22,.22,1.294]} size={[5.03,3.55,.16]} radius={.24} color="#252f2c"/>
  <Box position={[-.22,.22,1.38]} size={[4.75,3.22,.075]} radius={.21} color="#e5edf0"/>
  <Html transform position={[-.22,.22,1.43]} distanceFactor={2} zIndexRange={[20,10]} style={{width:900,height:600}}><div ref={screen} className="glass-surface">{children}</div></Html>
  {/* Fine speaker slots are physical recess-colored geometry, not a flat texture. */}
  {Array.from({length:18}, (_,i) => <Box key={`speaker${i}`} position={[-2.48+i*.118,-1.82,1.232]} size={[.042,.24,.026]} color="#73796f" radius={.015}/>)}
  <Html transform position={[.01,-1.81,1.265]} distanceFactor={1} style={{pointerEvents:'none'}}><div className="hardware-brand">signal<span>COLOR SYSTEM / 06</span></div></Html>
  <RoundButton x={1.24} y={-1.81}/><RoundButton x={1.53} y={-1.81}/><RoundButton x={2.22} y={-1.80} r={.16} color="#a4a89d"/>
  {([{x:1.24,label:'Previous channel',symbol:'−',action:onPrevious},{x:1.53,label:'Next channel',symbol:'+',action:onNext},{x:2.22,label:'Turn off TV and return to Wii',symbol:'⏻',action:onPower}]).map(control => <Html key={control.label} transform position={[control.x,-1.80,1.345]} distanceFactor={1} center zIndexRange={[21,20]}><button className={`crt-control ${control.action === onPower ? 'crt-power' : ''}`} aria-label={control.label} title={control.label} onClick={control.action}>{control.symbol}</button></Html>)}
  <mesh position={[2.56,-1.81,1.258]}><sphereGeometry args={[.036,12,8]}/><meshStandardMaterial color="#9bddae" emissive="#5fd589" emissiveIntensity={1.1}/></mesh>
  <Html transform position={[2.23,-2.06,1.267]} distanceFactor={.6} style={{pointerEvents:'none'}}><span className="power-label">POWER</span></Html>
  {/* Side ventilation, a back panel, RCA inputs, antenna and screws. */}
  {[-1,1].map(side => <group key={side}>{Array.from({length:12}, (_,i) => <Box key={i} position={[side*2.83,.8-i*.125,-.25]} size={[.023,.045,1.03]} radius={.008} color="#81877c"/>)}</group>)}
  <Box position={[0,-.4,-1.94]} size={[2.7,1.35,.08]} radius={.08} color="#5b635b"/>
  {Array.from({length:13}, (_,i) => <Box key={`back${i}`} position={[-1.75+i*.29,.92,-1.935]} size={[.12,.42,.025]} radius={.022} color="#747c70"/>)}
  {['#e9ce68','#e1dfd5','#bf6554'].map((color,i) => <group key={color}><mesh position={[-.76+i*.45,-.3,-2.04]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.12,.12,.13,20]}/><meshStandardMaterial color={color} metalness={.3} roughness={.5}/></mesh><mesh position={[-.76+i*.45,-.3,-2.12]}><circleGeometry args={[.055,16]}/><meshBasicMaterial color="#202922" side={THREE.DoubleSide}/></mesh></group>)}
  <Box position={[.9,-.5,-2.02]} size={[.3,.37,.16]} color="#252e27" radius={.04}/>
  {[-2,2].map(x => [-1.4,1.4].map(y => <mesh key={`${x}${y}`} position={[x,y,-1.924]} rotation={[0,Math.PI,0]}><circleGeometry args={[.052,12]}/><meshStandardMaterial color="#5f675c" metalness={.8}/></mesh>))}
  <Box position={[-1.95,-2.3,.1]} size={[.6,.2,1.15]} color="#747b70" radius={.08}/><Box position={[1.95,-2.3,.1]} size={[.6,.2,1.15]} color="#747b70" radius={.08}/>
 </group></>;
}
export default function Television({children, entered, motion, reduced, onFailure, ...hardware}: HardwareControls & {children:ReactNode;entered:boolean;motion:MutableRefObject<MotionState>;reduced:boolean;onFailure:()=>void}) {
 return <Canvas resize={{scroll:false}} onWheel={event => event.stopPropagation()} frameloop="demand" dpr={[1,1.6]} camera={{position:[0,0,11.5],fov:36}} gl={{antialias:true,alpha:true,powerPreference:'low-power'}} fallback={<div>3D unavailable. Use the accessible channel view.</div>}><ContextGuard onFailure={onFailure}/><ambientLight intensity={1.5}/><hemisphereLight args={['#ffffff','#727b6e',1.1]}/><directionalLight position={[-5,8,6]} intensity={3.2} color="#fff6e5"/><directionalLight position={[6,2,-3]} intensity={2} color="#d3e6f0"/><Suspense fallback={null}><Model {...hardware} entered={entered} motion={motion} reduced={reduced}>{children}</Model></Suspense></Canvas>;
}

