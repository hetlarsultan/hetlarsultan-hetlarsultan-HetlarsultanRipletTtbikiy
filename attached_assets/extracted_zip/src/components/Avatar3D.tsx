import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface Avatar3DProps {
  modelUrl?: string;
  lipSyncLevel: number; // 0 to 1
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'serene';
}

const DEFAULT_VRM = 'https://pixiv.github.io/three-vrm/examples/models/VRM1_Constraint_Sample.vrm';

const VisemeComponent: React.FC<{ vrm: VRM; level: number; emotion: string }> = ({ vrm, level, emotion }) => {
  const lastLevel = useRef(0);
  const smoothLevel = useRef(0);

  useFrame((state) => {
    if (!vrm.expressionManager) return;

    // 1. Physically Based Smoothing
    smoothLevel.current = THREE.MathUtils.lerp(smoothLevel.current, level, 0.25);
    const lv = smoothLevel.current;
    const time = state.clock.getElapsedTime();
    
    // 2. Viseme Mapping Logic (Phoneme Detection Simulation)
    // We categorize the amplitude into specific mouth shapes to avoid "circular" look
    let currentViseme: VRMExpressionPresetName = 'relaxed';
    
    if (lv > 0.05) {
      if (lv > 0.7) currentViseme = 'aa';       // High Volume -> Wide Open (A)
      else if (lv > 0.5) currentViseme = 'oh';  // Med-High -> Rounded (O)
      else if (lv > 0.3) currentViseme = 'ee';  // Med -> Spread (E)
      else currentViseme = 'ih';                // Low -> Subtle (I/M)
    }

    // Reset visemes
    const visemes: VRMExpressionPresetName[] = ['aa', 'ih', 'ou', 'ee', 'oh'];
    visemes.forEach(v => vrm.expressionManager?.setValue(v, 0));

    // Apply Active Viseme with precision scaling
    if (lv > 0.01) {
      vrm.expressionManager.setValue(currentViseme, lv * 1.1);
      
      // Add a secondary blend for natural "Arabic" lip rounding (Damma)
      if (currentViseme === 'oh') vrm.expressionManager.setValue('ou', lv * 0.4);
    }

    // 3. Muscle Tension & Micro-Expressions
    const muscleIntensity = 0.3 + lv * 0.2;
    const targetEmotion = (emotion === 'neutral' ? 'relaxed' : emotion) as VRMExpressionPresetName;
    vrm.expressionManager.setValue(targetEmotion, muscleIntensity);

    // 4. Natural Stochastic Blinking
    const blinkCycle = time % 5;
    vrm.expressionManager.setValue('blink', (blinkCycle > 4.8 || (blinkCycle > 1.2 && blinkCycle < 1.3)) ? 1 : 0);

    vrm.expressionManager.update();
  });

  return null;
};

const Model: React.FC<{ url: string; lipSyncLevel: number; emotion: string }> = ({ url, lipSyncLevel, emotion }) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const smoothLevel = useRef(0);

  // Load GLTF / VRM
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  useFrame((state) => {
    // 1. Morph Target Driver
    smoothLevel.current = THREE.MathUtils.lerp(smoothLevel.current, lipSyncLevel, 0.25);
    const lv = smoothLevel.current;

    gltf.scene.traverse((child: any) => {
      if (child.isMesh && child.morphTargetDictionary) {
        const mapping: Record<string, number> = {
          'mouthOpen': lv * 1.2,
          'jawOpen': lv * 1.1,
          'vowel_a': lv > 0.6 ? lv : 0,
          'vowel_e': lv > 0.3 && lv < 0.6 ? lv : 0,
          'vowel_o': lv > 0.5 ? lv : 0,
        };
        Object.entries(mapping).forEach(([key, value]) => {
          const index = child.morphTargetDictionary[key];
          if (index !== undefined) {
            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(child.morphTargetInfluences[index], value, 0.2);
          }
        });
      }
    });

    // 2. Extracted VRM Expression Driver
    if (gltf.userData.vrm && !vrm) {
       const vrmData = gltf.userData.vrm;
       VRMUtils.rotateVRM0(vrmData);
       setVrm(vrmData);
       setIsLoading(false);
    }
  });

  if (isLoading && !vrm && !url.includes('vrm')) {
    // Cinematic Fallback Proxy (Sphere-based)
    return (
      <group position={[0, 1.4, 0]}>
        <mesh>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color="#27272a" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Mouth simulation */}
        <mesh position={[0, -0.15, 0.35]}>
           <boxGeometry args={[0.15, lipSyncLevel * 0.15 + 0.02, 0.05]} />
           <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={lipSyncLevel * 2} />
        </mesh>
        <pointLight position={[0, -0.15, 0.5]} intensity={lipSyncLevel * 5} color="#f43f5e" />
      </group>
    );
  }

  return (
    <group>
      <primitive object={gltf.scene} />
      {vrm && <VisemeComponent vrm={vrm} level={lipSyncLevel} emotion={emotion} />}
    </group>
  );
};

export const Avatar3D: React.FC<Avatar3DProps> = ({ modelUrl, lipSyncLevel, emotion = 'neutral' }) => {
  return (
    <div className="w-full h-full bg-zinc-950 rounded-2xl overflow-hidden relative border border-zinc-800 shadow-2xl">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 1.4, 1.2]} fov={35} />
        <OrbitControls 
          target={[0, 1.4, 0]} 
          minDistance={0.5} 
          maxDistance={3}
          enablePan={false}
          maxPolarAngle={Math.PI / 1.5}
        />
        
        {/* Cinematic Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight 
          position={[5, 5, 5]} 
          angle={0.15} 
          penumbra={1} 
          intensity={1} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-5, 2, -2]} intensity={0.5} color="#4488ff" />
        <pointLight position={[2, 1, 3]} intensity={0.4} color="#ff8844" />
        
        <Environment preset="studio" />

        <React.Suspense fallback={null}>
          <Model url={modelUrl || DEFAULT_VRM} lipSyncLevel={lipSyncLevel} emotion={emotion} />
        </React.Suspense>
        
        {/* Background Atmosphere */}
        <mesh position={[0, 2, -5]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#0a0a0a" roughness={1} />
        </mesh>
      </Canvas>
      
      {/* HUD Info */}
      <div className="absolute top-4 left-4 flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 pointer-events-none">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">3D_VOICE_CORE: {Math.round(lipSyncLevel * 100)}%</span>
      </div>
      
      <div className="absolute bottom-4 right-4 text-[10px] font-mono text-zinc-600 uppercase tracking-tighter">
        Physically Based Viseme Engine v4.2
      </div>
    </div>
  );
};
