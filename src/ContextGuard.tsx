import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
// Remove the listener before Canvas disposes its context during scene changes.
export function ContextGuard({ onFailure }: { onFailure: () => void }) {
 const gl = useThree(state => state.gl);
 useEffect(() => { const canvas=gl.domElement; canvas.addEventListener('webglcontextlost',onFailure); return () => canvas.removeEventListener('webglcontextlost',onFailure); },[gl,onFailure]);
 return null;
}
