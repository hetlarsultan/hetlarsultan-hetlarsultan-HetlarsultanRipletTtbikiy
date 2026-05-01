import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface Avatar3DProps {
  modelUrl?: string;
  lipSyncLevel: number;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'serene';
}

// ─────────────────────────────────────────────────────────────────────────────
// Arabic-aware phoneme sequencer:
// Arabic speech has a high ratio of: فتحة(A), ضمة(U/O), كسرة(E), م/ب(M)
// We cycle through these phases using time so the mouth never stays on one shape.
// ─────────────────────────────────────────────────────────────────────────────
type VisemeKey = 'aa' | 'ee' | 'oh' | 'ou' | 'ih';

interface VisemeTarget {
  primary: VisemeKey;
  secondary?: VisemeKey;
  primaryWeight: number;
  secondaryWeight: number;
  jawOpen: number;
  lipCornerPull: number; // "smile" during ee
  lipPucker: number;     // "pucker" during ou
}

// Bilabial consonants (م، ب، ف) → mouth almost closed
// Dental/alveolar (ن، ل، ت، د) → slightly open
// Wide vowels (ا، فتحة) → aa wide
// E vowels (كسرة، ي) → ee spread
// O/U vowels (ضمة، و) → ou/oh rounded
const ARABIC_VISEME_SEQUENCE: VisemeTarget[] = [
  { primary: 'aa', primaryWeight: 1.0, secondaryWeight: 0,   jawOpen: 0.85, lipCornerPull: 0.1, lipPucker: 0.0 }, // ا wide
  { primary: 'oh', primaryWeight: 0.8, secondary: 'aa', secondaryWeight: 0.2, jawOpen: 0.7, lipCornerPull: 0.0, lipPucker: 0.3 }, // و mid
  { primary: 'aa', primaryWeight: 0.9, secondaryWeight: 0,   jawOpen: 0.8, lipCornerPull: 0.15, lipPucker: 0.0 }, // فتحة
  { primary: 'ih', primaryWeight: 0.9, secondaryWeight: 0,   jawOpen: 0.05, lipCornerPull: 0.0, lipPucker: 0.0 }, // م bilabial
  { primary: 'ee', primaryWeight: 0.85, secondary:'ih', secondaryWeight: 0.15, jawOpen: 0.4, lipCornerPull: 0.6, lipPucker: 0.0 }, // ي
  { primary: 'ou', primaryWeight: 0.9, secondaryWeight: 0,   jawOpen: 0.5, lipCornerPull: 0.0, lipPucker: 0.7 }, // ضمة rounded
  { primary: 'aa', primaryWeight: 0.7, secondary: 'ee', secondaryWeight: 0.3, jawOpen: 0.6, lipCornerPull: 0.3, lipPucker: 0.0 }, // كسرة spread
  { primary: 'ih', primaryWeight: 0.5, secondaryWeight: 0,   jawOpen: 0.15, lipCornerPull: 0.0, lipPucker: 0.1 }, // ن dental
];

// ─────────────────────────────────────────────────────────────────────────────
// VRM Viseme Engine — multi-channel smooth blending
// ─────────────────────────────────────────────────────────────────────────────
const VRMVisemeEngine: React.FC<{ vrm: VRM; level: number; emotion: string }> = ({ vrm, level, emotion }) => {
  const smooth = useRef(0);
  const phaseRef = useRef(0);
  const prevIdx = useRef(0);
  const blendRef = useRef(1);
  const channelWeights = useRef<Record<VisemeKey, number>>({ aa: 0, ee: 0, oh: 0, ou: 0, ih: 0 });

  useFrame((state, delta) => {
    if (!vrm.expressionManager) return;

    // ── Smooth the amplitude signal ──────────────────────────────────────────
    smooth.current = THREE.MathUtils.lerp(smooth.current, level, 0.18);
    const lv = smooth.current;
    const isSpeaking = lv > 0.04;

    // ── Phoneme sequencer ────────────────────────────────────────────────────
    // Advance phase when speaking; speed proportional to amplitude
    if (isSpeaking) phaseRef.current += delta * (2.5 + lv * 4.0);

    const seqLen = ARABIC_VISEME_SEQUENCE.length;
    const rawIdx = Math.floor(phaseRef.current) % seqLen;
    const fracIdx = phaseRef.current % 1;           // blend between frames
    const nextIdx = (rawIdx + 1) % seqLen;

    const frameA = ARABIC_VISEME_SEQUENCE[rawIdx];
    const frameB = ARABIC_VISEME_SEQUENCE[nextIdx];

    // Cross-fade jaw target
    const jawTarget = isSpeaking
      ? (THREE.MathUtils.lerp(frameA.jawOpen, frameB.jawOpen, fracIdx) * lv)
      : 0;

    // ── Build target weights for this frame ─────────────────────────────────
    const targets: Record<VisemeKey, number> = { aa: 0, ee: 0, oh: 0, ou: 0, ih: 0 };

    if (isSpeaking) {
      // Primary blend A→B
      const blendA = (v: VisemeKey, w: number) => { targets[v] = (targets[v] || 0) + w * lv * (1 - fracIdx); };
      const blendB = (v: VisemeKey, w: number) => { targets[v] = (targets[v] || 0) + w * lv * fracIdx; };

      blendA(frameA.primary, frameA.primaryWeight);
      if (frameA.secondary) blendA(frameA.secondary, frameA.secondaryWeight);
      blendB(frameB.primary, frameB.primaryWeight);
      if (frameB.secondary) blendB(frameB.secondary, frameB.secondaryWeight);

      // Clamp
      (Object.keys(targets) as VisemeKey[]).forEach(k => {
        targets[k] = Math.min(1, targets[k]);
      });
    }

    // ── Smooth channel weights (different speeds for open vs close) ──────────
    const cw = channelWeights.current;
    (Object.keys(targets) as VisemeKey[]).forEach(k => {
      const speed = targets[k] > cw[k] ? 0.22 : 0.12; // open fast, close slow
      cw[k] = THREE.MathUtils.lerp(cw[k], targets[k], speed);
      vrm.expressionManager!.setValue(k as VRMExpressionPresetName, cw[k]);
    });

    // ── Jaw (separate from visemes in VRM 1.0) ───────────────────────────────
    const mgr = vrm.expressionManager as any;
    if (mgr.setValue) {
      // Some VRM rigs expose jaw via 'jawOpen' others via blendshape proxy
      try { mgr.setValue('jawOpen' as VRMExpressionPresetName, jawTarget); } catch {}
    }

    // ── Lip corner (smile tension) for ee ────────────────────────────────────
    const lipCorner = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(frameA.lipCornerPull, frameB.lipCornerPull, fracIdx) * lv,
      0, isSpeaking ? 0 : 0.1
    );
    try { vrm.expressionManager.setValue('happy' as VRMExpressionPresetName, lipCorner * 0.35); } catch {}

    // ── Natural blink every 3-6s ─────────────────────────────────────────────
    const time = state.clock.getElapsedTime();
    const bc = time % 4.5;
    const blinkVal = (bc > 4.35 || (bc > 1.5 && bc < 1.62)) ? 1 : 0;
    vrm.expressionManager.setValue('blink' as VRMExpressionPresetName, blinkVal);

    // ── Emotion base layer ────────────────────────────────────────────────────
    const emotionMap: Partial<Record<string, VRMExpressionPresetName>> = {
      happy: 'happy', sad: 'sad', angry: 'angry', surprised: 'surprised',
      neutral: 'relaxed', serene: 'relaxed', excited: 'happy',
    };
    const eKey = emotionMap[emotion] || 'relaxed';
    const eIntensity = isSpeaking ? 0.15 : 0.3;
    vrm.expressionManager.setValue(eKey, eIntensity);

    vrm.expressionManager.update();
    vrm.update(delta);
  });

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// GLB / VRM loader
// ─────────────────────────────────────────────────────────────────────────────
const ModelWithUrl: React.FC<{ url: string; lipSyncLevel: number; emotion: string }> = ({ url, lipSyncLevel, emotion }) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const smoothLevel = useRef(0);

  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  useFrame((_, delta) => {
    smoothLevel.current = THREE.MathUtils.lerp(smoothLevel.current, lipSyncLevel, 0.2);
    const lv = smoothLevel.current;

    // GLB morph-target fallback (for non-VRM glb files)
    gltf.scene.traverse((child: any) => {
      if (!child.isMesh || !child.morphTargetDictionary) return;
      const setMorph = (name: string, val: number) => {
        const i = child.morphTargetDictionary[name];
        if (i !== undefined) {
          child.morphTargetInfluences[i] = THREE.MathUtils.lerp(child.morphTargetInfluences[i], val, 0.15);
        }
      };
      // Standard ARKit / Ready Player Me keys
      setMorph('mouthOpen',        lv * 1.1);
      setMorph('jawOpen',          lv * 1.0);
      setMorph('mouthStretchLeft', lv * 0.3);
      setMorph('mouthStretchRight',lv * 0.3);
      setMorph('viseme_aa',        lv > 0.5 ? lv : 0);
      setMorph('viseme_E',         lv > 0.25 && lv < 0.6 ? lv : 0);
      setMorph('viseme_O',         lv > 0.4 ? lv * 0.7 : 0);
      setMorph('viseme_U',         lv > 0.3 ? lv * 0.5 : 0);
      setMorph('viseme_PP',        lv < 0.15 ? (1 - lv * 6) : 0); // M/B/P closure
    });

    // Extract VRM once loaded
    if (gltf.userData.vrm && !vrm) {
      const v: VRM = gltf.userData.vrm;
      VRMUtils.rotateVRM0(v);
      setVrm(v);
    }
  });

  return (
    <group>
      <primitive object={gltf.scene} />
      {vrm && <VRMVisemeEngine vrm={vrm} level={lipSyncLevel} emotion={emotion} />}
    </group>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Procedural head — used when no model URL is supplied
// ─────────────────────────────────────────────────────────────────────────────
const ProceduralHead: React.FC<{ lipSyncLevel: number }> = ({ lipSyncLevel }) => {
  const smooth = useRef(0);
  const jawRef = useRef<THREE.Mesh>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  const lowerLipRef = useRef<THREE.Mesh>(null);
  const teethRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    smooth.current = THREE.MathUtils.lerp(smooth.current, lipSyncLevel, 0.2);
    const lv = smooth.current;
    if (jawRef.current)      jawRef.current.position.y      = -0.16 - lv * 0.06;
    if (upperLipRef.current) upperLipRef.current.position.y = -0.10 - lv * 0.02;
    if (lowerLipRef.current) lowerLipRef.current.position.y = -0.22 + lv * 0.03;
    if (teethRef.current)    (teethRef.current.material as THREE.MeshStandardMaterial).opacity = Math.min(1, lv * 3);
  });

  return (
    <group position={[0, 1.4, 0]}>
      {/* Skull */}
      <mesh>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Jaw */}
      <mesh ref={jawRef} position={[0, -0.16, 0.05]}>
        <sphereGeometry args={[0.28, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Upper lip */}
      <mesh ref={upperLipRef} position={[0, -0.10, 0.36]}>
        <torusGeometry args={[0.07, 0.018, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#c47560" roughness={0.5} />
      </mesh>
      {/* Lower lip */}
      <mesh ref={lowerLipRef} position={[0, -0.22, 0.35]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.075, 0.022, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#c0624e" roughness={0.5} />
      </mesh>
      {/* Teeth */}
      <mesh ref={teethRef} position={[0, -0.16, 0.37]}>
        <boxGeometry args={[0.10, 0.025, 0.02]} />
        <meshStandardMaterial color="#f5f0e8" transparent opacity={0} />
      </mesh>
      {/* Mouth interior glow */}
      <pointLight position={[0, -0.18, 0.42]} intensity={lipSyncLevel * 4} color="#ff4466" />
    </group>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Avatar3D export
// ─────────────────────────────────────────────────────────────────────────────
export const Avatar3D: React.FC<Avatar3DProps> = ({ modelUrl, lipSyncLevel, emotion = 'neutral' }) => {
  return (
    <div className="w-full h-full bg-zinc-950 rounded-2xl overflow-hidden relative border border-zinc-800 shadow-2xl">
      <Canvas shadows gl={{ antialias: true, alpha: false }}>
        <PerspectiveCamera makeDefault position={[0, 1.4, 1.2]} fov={35} />
        <OrbitControls
          target={[0, 1.4, 0]}
          minDistance={0.5}
          maxDistance={3}
          enablePan={false}
          maxPolarAngle={Math.PI / 1.5}
        />
        <ambientLight intensity={0.6} />
        <spotLight position={[3, 5, 4]} angle={0.18} penumbra={1} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
        <pointLight position={[-4, 2, -2]} intensity={0.5} color="#4488ff" />
        <pointLight position={[2, 0.5, 3]} intensity={0.4} color="#ffaa66" />
        <Environment preset="studio" />

        <React.Suspense fallback={<ProceduralHead lipSyncLevel={lipSyncLevel} />}>
          {modelUrl
            ? <ModelWithUrl url={modelUrl} lipSyncLevel={lipSyncLevel} emotion={emotion} />
            : <ProceduralHead lipSyncLevel={lipSyncLevel} />
          }
        </React.Suspense>

        <mesh position={[0, 2, -5]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#080808" roughness={1} />
        </mesh>
      </Canvas>

      <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/5 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
        <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
          VISEME_ENGINE v5 · {Math.round(lipSyncLevel * 100)}%
        </span>
      </div>
    </div>
  );
};
