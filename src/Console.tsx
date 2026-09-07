import { ContextGuard } from './ContextGuard';
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import type { MotionState } from './Television';

function Part({at, size, color='#f3f3ee', radius=.035}: {at:[number,number,number];size:[number,number,number];color?:string;radius?:number}) {
 return <RoundedBox position={at} args={size} radius={radius} smoothness={3}><meshStandardMaterial color={color} roughness={.28} metalness={.08}/></RoundedBox>;
}
function FaceLabels() {
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=1024;const c=canvas.getContext('2d')!;c.clearRect(0,0,256,1024);c.fillStyle='#929b9e';c.textAlign='center';c.font='17px Arial';c.fillText('POWER',128,104);c.fillText('RESET',128,227);c.fillText('EJECT',128,798);c.font='52px Arial';c.fillText('wii',128,930);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;},[]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={[0,0,1.649]}><planeGeometry args={[.72,4.12]}/><meshBasicMaterial map={texture} transparent depthWrite={false}/></mesh>;
}
function ConsoleModel({motion,reduced,mobile,powering}:{motion:MutableRefObject<MotionState>;reduced:boolean;mobile:boolean;powering:boolean}) {
 const glow=useRef<THREE.MeshStandardMaterial>(null!); const glowTime=useRef(0); const group=useRef<THREE.Group>(null!);const {invalidate,camera,size}=useThree();const first=useRef(true);
 useEffect(()=>{motion.current.wake=invalidate;invalidate();},[invalidate,motion,size,reduced,mobile,powering]);
 useFrame((_,delta)=>{const m=motion.current,dt=Math.min(delta,.04);if(first.current){group.current.rotation.set(.10, reduced||mobile||!m.intro ? -.62 : -1.5,0);m.x=.10;m.y=-.62;m.intro=false;first.current=false;}
 if(powering){m.vx=0;m.vy=0;m.x=.06;m.y=-.40;} if(glow.current){glowTime.current=powering?Math.min(1,glowTime.current+dt*3):0;glow.current.emissiveIntensity=powering?2+glowTime.current*5:.35;} if(!m.dragging){m.x=THREE.MathUtils.clamp(m.x+m.vx,-.55,.55);m.y+=m.vy;m.vx*=Math.exp(-dt*7);m.vy*=Math.exp(-dt*7);}
 const alpha=reduced?1:1-Math.exp(-dt*5);const tx=mobile?.06:m.x,ty=mobile?-.52:m.y;
 group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,tx,alpha);group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,ty,alpha);
 const z=Math.max(9.1,4.6/(size.width/size.height));camera.position.z=THREE.MathUtils.lerp(camera.position.z,z,alpha);
 if(Math.abs(group.current.rotation.x-tx)+Math.abs(group.current.rotation.y-ty)+Math.abs(camera.position.z-z)+Math.abs(m.vx)+Math.abs(m.vy)>.0002||m.dragging||powering)invalidate();
 });
 return <><group ref={group}><group rotation={[0,0,0]} position={[0,.12,0]}>
 <Part at={[0,0,0]} size={[.88,4.3,3.26]} radius={.065}/>
 {/* Separate glossy side panels, hairline seams, and a narrow front face. */}
 <Part at={[-.451,0,-.01]} size={[.026,4.18,3.12]} color="#e0e5e5" radius={.012}/>
 <Part at={[.451,0,-.01]} size={[.026,4.18,3.12]} color="#f8f8f3" radius={.012}/>
 <Part at={[0,0,1.624]} size={[.78,4.19,.035]} color="#fafbf8" radius={.025}/>
 <Part at={[.10,.11,1.65]} size={[.09,2.65,.012]} color="#82d6f1" radius={.015}/>
 <mesh position={[.10,.11,1.66]}><boxGeometry args={[.065,2.59,.012]}/><meshStandardMaterial ref={glow} color="#68d5ff" emissive="#44bfff" emissiveIntensity={1.5} roughness={.2}/></mesh>
 <Part at={[.10,.11,1.673]} size={[.024,2.54,.013]} color="#31464c" radius={.009}/>
 <Part at={[-.20,1.84,1.665]} size={[.20,.13,.026]} color="#e0e5e2" radius={.035}/>
 <mesh position={[-.2,1.84,1.685]}><circleGeometry args={[.027,16]}/><meshBasicMaterial color="#85c9a3"/></mesh>
 <Part at={[-.20,1.37,1.661]} size={[.18,.065,.025]} color="#d6dedd" radius={.018}/>
 <Part at={[.10,-1.40,1.66]} size={[.18,.07,.025]} color="#d4dddc" radius={.018}/>
 <Part at={[-.25,-.35,1.65]} size={[.003,1.05,.008]} color="#cdd6d4" radius={.001}/>
 <FaceLabels/>
 {/* Top expansion covers. */}
 <Part at={[0,2.156,-.60]} size={[.69,.012,1.72]} color="#dde2de" radius={.015}/>
 <Part at={[0,2.168,-.60]} size={[.65,.008,1.67]} color="#f1f2ec" radius={.012}/>
 <Part at={[0,2.16,.61]} size={[.68,.012,.58]} color="#e4e8e3" radius={.012}/>
 {/* Back ventilation and connector panel. */}
 <Part at={[0,-.1,-1.644]} size={[.70,3.6,.032]} color="#d7dedd" radius={.025}/>
 {Array.from({length:13},(_,i)=><Part key={i} at={[0,1.42-i*.10,-1.67]} size={[.46,.035,.024]} color="#667779" radius={.009}/>)}
 {[-.17,.17].map(x=><Part key={x} at={[x,-.30,-1.68]} size={[.20,.10,.04]} color="#3f5053" radius={.012}/>)}
 <Part at={[0,-.66,-1.68]} size={[.40,.13,.035]} color="#828b86" radius={.01}/><Part at={[0,-.98,-1.68]} size={[.28,.09,.035]} color="#8c6d53" radius={.01}/><Part at={[0,-1.32,-1.68]} size={[.28,.16,.04]} color="#525d59" radius={.02}/>
 {Array.from({length:11},(_,i)=><Part key={`side${i}`} at={[.47,-1.6,-1.0+i*.19]} size={[.012,.16,.038]} color="#b1bcb8" radius={.004}/>)}
 </group><Part at={[0,-2.18,0]} size={[1.4,.30,3.55]} color="#b2bdc0" radius={.09}/><Part at={[0,-2.35,0]} size={[2.05,.08,3.9]} color="#cbd5d5" radius={.04}/></group><ContactShadows position={[0,-2.55,0]} opacity={.22} scale={12} blur={2.6} far={5} resolution={256} frames={1}/></>;
}
export default function Console({motion,reduced,mobile,onFailure,powering}:{motion:MutableRefObject<MotionState>;reduced:boolean;mobile:boolean;onFailure:()=>void;powering:boolean}) {
 return <Canvas frameloop="demand" dpr={[1,1.6]} camera={{position:[0,0,10],fov:36}} gl={{antialias:true,alpha:true,powerPreference:'low-power'}}><ContextGuard onFailure={onFailure}/><ambientLight intensity={1.15}/><hemisphereLight args={['#f1faff','#8f9d94',1.25]}/><directionalLight position={[-3,6,5]} intensity={2.7}/><directionalLight position={[5,2,-4]} intensity={1.8} color="#b8dcf1"/><ConsoleModel motion={motion} reduced={reduced} mobile={mobile} powering={powering}/>{powering && <pointLight position={[-1,0,3]} color="#67cbff" intensity={2.5} distance={6}/>}</Canvas>;
}


