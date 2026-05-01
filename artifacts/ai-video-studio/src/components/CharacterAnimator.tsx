import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { Character, ShotConfig } from '../types';
import { Clock, Zap, Box, Image as ImageIcon } from 'lucide-react';
import { Avatar3D } from './Avatar3D';

interface CharacterAnimatorProps {
  character: Character;
  lipSyncLevel: number;
  config: ShotConfig;
}

const ENVIRONMENTS = {
  desert: {
    bg: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&q=80&w=1200',
    overlay: 'bg-orange-950/20', lighting: 'bg-gradient-to-t from-orange-500/10 to-transparent',
  },
  city: {
    bg: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1200',
    overlay: 'bg-blue-950/30', lighting: 'bg-gradient-to-t from-blue-500/10 to-transparent',
  },
  house: {
    bg: 'https://images.unsplash.com/photo-1600585154340-be6199fbfd0b?auto=format&fit=crop&q=80&w=1200',
    overlay: 'bg-zinc-950/30', lighting: 'bg-gradient-to-t from-zinc-500/10 to-transparent',
  },
  mosque: {
    bg: 'https://images.unsplash.com/photo-1542661596-f6424564c781?auto=format&fit=crop&q=80&w=1200',
    overlay: 'bg-emerald-950/20', lighting: 'bg-gradient-to-t from-emerald-500/10 to-transparent',
  },
  studio: {
    bg: 'https://images.unsplash.com/photo-1524169220946-12efd782aab4?auto=format&fit=crop&q=80&w=1200',
    overlay: 'bg-black/60', lighting: 'bg-gradient-to-t from-blue-600/20 to-transparent',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Arabic viseme cycler — produces realistic Arabic speech mouth shape sequence
// ─────────────────────────────────────────────────────────────────────────────
interface VisemeFrame {
  jawOpen: number;       // 0..1 — how far jaw drops
  lipSpread: number;     // 0..1 — ي/E horizontal spread
  lipRound: number;      // 0..1 — و/O lip pucker
  upperLipRaise: number; // 0..1 — upper lip lifts for A
  lowerLipDrop: number;  // 0..1 — lower lip pulls down
  teethShow: number;     // 0..1 — opacity of teeth
  cheekRaise: number;    // 0..1 — cheek squint on E/smile
}

const ARABIC_FRAMES: VisemeFrame[] = [
  // فتحة عريضة  (A wide — ا)
  { jawOpen:0.90, lipSpread:0.20, lipRound:0.00, upperLipRaise:0.65, lowerLipDrop:0.75, teethShow:0.90, cheekRaise:0.10 },
  // ضمة (U rounded — و)
  { jawOpen:0.55, lipSpread:0.00, lipRound:0.85, upperLipRaise:0.10, lowerLipDrop:0.40, teethShow:0.15, cheekRaise:0.00 },
  // فتحة متوسطة (mid-open)
  { jawOpen:0.70, lipSpread:0.15, lipRound:0.05, upperLipRaise:0.50, lowerLipDrop:0.60, teethShow:0.75, cheekRaise:0.05 },
  // م / ب bilabial closure
  { jawOpen:0.03, lipSpread:0.00, lipRound:0.00, upperLipRaise:0.00, lowerLipDrop:0.00, teethShow:0.00, cheekRaise:0.00 },
  // كسرة (E spread — ي)
  { jawOpen:0.45, lipSpread:0.80, lipRound:0.00, upperLipRaise:0.30, lowerLipDrop:0.35, teethShow:0.55, cheekRaise:0.45 },
  // واو ضيق (W tight round)
  { jawOpen:0.35, lipSpread:0.00, lipRound:0.90, upperLipRaise:0.05, lowerLipDrop:0.25, teethShow:0.05, cheekRaise:0.00 },
  // ن / ل / ر (dental — slightly open)
  { jawOpen:0.30, lipSpread:0.05, lipRound:0.00, upperLipRaise:0.15, lowerLipDrop:0.25, teethShow:0.30, cheekRaise:0.00 },
  // هاء (H — open throat)
  { jawOpen:0.65, lipSpread:0.10, lipRound:0.10, upperLipRaise:0.40, lowerLipDrop:0.55, teethShow:0.65, cheekRaise:0.05 },
];

function lerpFrame(a: VisemeFrame, b: VisemeFrame, t: number): VisemeFrame {
  const l = (x: number, y: number) => x + (y - x) * t;
  return {
    jawOpen:        l(a.jawOpen, b.jawOpen),
    lipSpread:      l(a.lipSpread, b.lipSpread),
    lipRound:       l(a.lipRound, b.lipRound),
    upperLipRaise:  l(a.upperLipRaise, b.upperLipRaise),
    lowerLipDrop:   l(a.lowerLipDrop, b.lowerLipDrop),
    teethShow:      l(a.teethShow, b.teethShow),
    cheekRaise:     l(a.cheekRaise, b.cheekRaise),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Lip Engine — renders realistic lips + teeth from a VisemeFrame
// Coordinate space: 100x40 viewBox, mouth center at (50,20)
// ─────────────────────────────────────────────────────────────────────────────
const SVGMouth: React.FC<{ frame: VisemeFrame; color?: string }> = ({ frame, color = '#c06050' }) => {
  const { jawOpen, lipSpread, lipRound, upperLipRaise, lowerLipDrop, teethShow } = frame;

  // Lip geometry driven by frame values
  const W   = 38 + lipSpread * 18 - lipRound * 10;  // mouth width
  const H   = jawOpen * 18;                           // opening height (half)
  const uH  = 4 + upperLipRaise * 3;                 // upper lip height
  const lH  = 5 + lowerLipDrop  * 3.5;               // lower lip height

  const cx = 50;
  const cy = 20;
  const hw = W / 2;

  // Control points for upper lip (cupid's bow)
  const ulLeft  = cx - hw;
  const ulRight = cx + hw;
  const ulTop   = cy - H / 2 - uH;
  const ulMid   = cy - H / 2;
  const ulPeakL = cx - hw * 0.3;
  const ulPeakR = cx + hw * 0.3;
  const ulDip   = cy - H / 2 - uH * 0.3;
  const cpyUL   = cy - H / 2 - uH * 1.5;  // upper control

  // Upper lip path (cupid's bow shape)
  const upperPath = `
    M ${ulLeft} ${ulMid}
    C ${ulLeft + hw * 0.25} ${ulTop},
      ${ulPeakL} ${cpyUL},
      ${cx} ${ulDip}
    C ${ulPeakR} ${cpyUL},
      ${ulRight - hw * 0.25} ${ulTop},
      ${ulRight} ${ulMid}
    C ${ulRight - 2} ${ulMid + uH * 0.4},
      ${ulRight} ${ulMid + uH * 0.4},
      ${cx + hw * 0.5} ${ulMid + uH * 0.5}
    C ${cx} ${ulMid + uH * 0.8},
      ${cx} ${ulMid + uH * 0.8},
      ${cx - hw * 0.5} ${ulMid + uH * 0.5}
    C ${ulLeft} ${ulMid + uH * 0.4},
      ${ulLeft + 2} ${ulMid + uH * 0.4},
      ${ulLeft} ${ulMid}
    Z`;

  // Lower lip path (fuller, rounder)
  const llTop  = cy + H / 2;
  const llBot  = cy + H / 2 + lH;
  const llPath = `
    M ${ulLeft} ${ulMid}
    Q ${cx} ${llTop - 2}, ${ulRight} ${ulMid}
    C ${ulRight + 4} ${llTop + lH * 0.3},
      ${ulRight + 2} ${llBot - lH * 0.2},
      ${cx} ${llBot}
    C ${ulLeft - 2} ${llBot - lH * 0.2},
      ${ulLeft - 4} ${llTop + lH * 0.3},
      ${ulLeft} ${ulMid}
    Z`;

  // Mouth opening (dark interior)
  const openPath = jawOpen > 0.03 ? `
    M ${ulLeft} ${ulMid}
    Q ${cx} ${ulMid - H * 0.15}, ${ulRight} ${ulMid}
    Q ${cx} ${llTop + H * 0.15}, ${ulLeft} ${ulMid}
    Z` : null;

  // Corner shadow
  const cornerR = lipSpread > 0.5 ? 0.8 : 0.5;

  return (
    <svg
      viewBox="0 0 100 40"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))' }}
    >
      {/* Mouth cavity */}
      {openPath && (
        <path d={openPath} fill="#1a0a0a" />
      )}
      {/* Teeth — upper */}
      {teethShow > 0.05 && jawOpen > 0.15 && (
        <rect
          x={cx - hw * 0.65}
          y={cy - H / 2 + 0.5}
          width={hw * 1.3}
          height={H * 0.38}
          rx={2}
          fill={`rgba(240,232,215,${teethShow * 0.95})`}
        />
      )}
      {/* Teeth — lower */}
      {teethShow > 0.3 && jawOpen > 0.35 && (
        <rect
          x={cx - hw * 0.55}
          y={cy + H * 0.12}
          width={hw * 1.1}
          height={H * 0.3}
          rx={2}
          fill={`rgba(228,218,200,${teethShow * 0.7})`}
        />
      )}
      {/* Tongue hint (deep red when very open) */}
      {jawOpen > 0.65 && (
        <ellipse cx={cx} cy={cy + H * 0.35} rx={hw * 0.5} ry={H * 0.22}
          fill={`rgba(180,50,60,${(jawOpen - 0.65) * 1.8})`} />
      )}
      {/* Lower lip */}
      <path d={llPath} fill={color} />
      {/* Lower lip highlight */}
      <ellipse cx={cx} cy={cy + H / 2 + lH * 0.55} rx={hw * 0.4} ry={lH * 0.18}
        fill="rgba(255,255,255,0.18)" />
      {/* Upper lip */}
      <path d={upperPath} fill={color} />
      {/* Upper lip highlight (philtrum) */}
      <ellipse cx={cx} cy={cy - H / 2 - uH * 0.55} rx={hw * 0.18} ry={uH * 0.2}
        fill="rgba(255,255,255,0.22)" />
      {/* Corner accents */}
      <circle cx={ulLeft - 1} cy={ulMid} r={cornerR} fill="rgba(80,20,10,0.6)" />
      <circle cx={ulRight + 1} cy={ulMid} r={cornerR} fill="rgba(80,20,10,0.6)" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FaceMesh overlay — landmark dots when speaking
// ─────────────────────────────────────────────────────────────────────────────
const FaceMeshOverlay: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const points = [
    // Jaw line (approx positions in %)
    [50,72],[42,74],[34,70],[28,62],[26,50],[28,38],[34,32],
    [50,28],[66,32],[72,38],[74,50],[72,62],[66,70],[58,74],
    // Eye outline L
    [34,40],[38,37],[43,37],[47,40],[43,43],[38,43],
    // Eye outline R
    [53,40],[57,37],[62,37],[66,40],[62,43],[57,43],
    // Nose
    [50,48],[47,55],[53,55],[50,58],
    // Mouth corners
    [38,62],[62,62],
  ];
  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {points.map(([x, y], i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 1.5 + (i % 3) * 0.4, repeat: Infinity, delay: i * 0.05 }}
          className="absolute w-0.5 h-0.5 rounded-full bg-cyan-400"
          style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}
        />
      ))}
      {/* Connection lines — SVG overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-15">
        <line x1="38%" y1="62%" x2="50%" y2="63%" stroke="cyan" strokeWidth="0.5" />
        <line x1="62%" y1="62%" x2="50%" y2="63%" stroke="cyan" strokeWidth="0.5" />
        <ellipse cx="50%" cy="50%" rx="30%" ry="38%" fill="none" stroke="cyan" strokeWidth="0.4" strokeDasharray="2 4" />
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main CharacterAnimator
// ─────────────────────────────────────────────────────────────────────────────
export const CharacterAnimator: React.FC<CharacterAnimatorProps> = ({
  character,
  lipSyncLevel,
  config,
}) => {
  const [blink, setBlink] = useState(false);
  const [is3D, setIs3D] = useState(character.style === '3d-animation' || !!character.vrmUrl);
  const currentEnv = ENVIRONMENTS[config.environment as keyof typeof ENVIRONMENTS] || ENVIRONMENTS.studio;

  // Smooth signal
  const smoothRef  = useRef(0);
  const phaseRef   = useRef(0);
  const [frame, setFrame] = useState<VisemeFrame>(ARABIC_FRAMES[0]);

  // Animate frame via rAF (not React state loop, to avoid over-rendering)
  useEffect(() => {
    let rafId: number;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      const target = lipSyncLevel;
      smoothRef.current += (target - smoothRef.current) * (target > smoothRef.current ? 0.3 : 0.15);
      const lv = smoothRef.current;
      if (lv > 0.04) phaseRef.current += delta * (2.5 + lv * 4);
      const idx = Math.floor(phaseRef.current) % ARABIC_FRAMES.length;
      const frac = phaseRef.current % 1;
      const next = (idx + 1) % ARABIC_FRAMES.length;
      const blended = lerpFrame(ARABIC_FRAMES[idx], ARABIC_FRAMES[next], frac);
      // Scale all values by lv (silence = closed mouth)
      setFrame({
        jawOpen:        blended.jawOpen       * lv,
        lipSpread:      blended.lipSpread      * lv,
        lipRound:       blended.lipRound       * lv,
        upperLipRaise:  blended.upperLipRaise  * lv,
        lowerLipDrop:   blended.lowerLipDrop   * lv,
        teethShow:      blended.teethShow      * lv,
        cheekRaise:     blended.cheekRaise     * lv,
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [lipSyncLevel]);

  // Blinking
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 2500 + Math.random() * 2500);
    return () => clearInterval(id);
  }, []);

  const isSpeaking = lipSyncLevel > 0.04;
  const isLoud     = lipSyncLevel > 0.5;

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl flex items-center justify-center group">
      {is3D ? (
        <Avatar3D
          modelUrl={character.vrmUrl || character.glbUrl}
          lipSyncLevel={lipSyncLevel}
          emotion={config.emotion || 'neutral'}
        />
      ) : (
        <>
          {/* Background */}
          <motion.div key={config.environment} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-0">
            <img src={currentEnv.bg} className="w-full h-full object-cover grayscale-[0.2] brightness-[0.4]" alt="" />
            <div className={`absolute inset-0 ${currentEnv.overlay}`} />
            <div className={`absolute inset-0 ${currentEnv.lighting}`} />
          </motion.div>

          {/* Face mesh landmark overlay */}
          <FaceMeshOverlay active={isSpeaking} />

          {/* Character body */}
          <motion.div
            animate={{ y: [0, -2.5, 0], rotate: [0, 0.4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-20 flex flex-col items-center"
          >
            {/* Head container */}
            <div className="relative w-52 h-52 sm:w-64 sm:h-64">

              {/* Face photo — subtle animation */}
              <motion.div
                animate={{
                  scale: 1 + frame.jawOpen * 0.018,
                  filter: `brightness(${1 + lipSyncLevel * 0.12})`,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`w-full h-full rounded-full overflow-hidden border-4 bg-black ${
                  isSpeaking
                    ? 'border-blue-400/60 shadow-[0_0_50px_rgba(59,130,246,0.35)]'
                    : 'border-blue-500/15 shadow-[0_0_30px_rgba(37,99,235,0.1)]'
                }`}
              >
                <img
                  src={character.avatar}
                  className="w-full h-full object-cover"
                  alt={character.name}
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              {/* ── Blink overlay ── */}
              <motion.div
                animate={{ scaleY: blink ? 1 : 0 }}
                transition={{ duration: 0.07, ease: 'linear' }}
                className="absolute top-[33%] left-[8%] w-[84%] h-[12%] bg-gradient-to-b from-zinc-800/90 to-zinc-900/70 rounded-b-[50%] origin-top pointer-events-none z-10"
              />

              {/* ── SVG Lip Engine ── */}
              {/* Position: bottom 22% of face circle, centered */}
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  bottom: '18%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '52%',
                  height: '16%',
                }}
              >
                <SVGMouth frame={frame} color={character.style === 'cartoon' ? '#e05870' : '#b85040'} />
              </div>

              {/* ── Cheek flush when speaking loudly ── */}
              {isLoud && (
                <>
                  <motion.div
                    animate={{ opacity: [0, frame.cheekRaise * 0.25, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="absolute top-[42%] left-[8%] w-[22%] h-[12%] rounded-full bg-rose-400/40 blur-[6px] pointer-events-none"
                  />
                  <motion.div
                    animate={{ opacity: [0, frame.cheekRaise * 0.25, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                    className="absolute top-[42%] right-[8%] w-[22%] h-[12%] rounded-full bg-rose-400/40 blur-[6px] pointer-events-none"
                  />
                </>
              )}

              {/* Glow ring */}
              <motion.div
                animate={{ scale: [1, 1.04, 1], opacity: isSpeaking ? [0.2, 0.5, 0.2] : [0.05, 0.1, 0.05] }}
                transition={{ duration: isSpeaking ? 0.8 : 2, repeat: Infinity }}
                className="absolute inset-x-[-8%] inset-y-[-8%] rounded-full border border-blue-400/30 -z-10 blur-md"
              />
            </div>
          </motion.div>
        </>
      )}

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-5">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1.5 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-rose-500 animate-pulse' : 'bg-zinc-700'}`} />
              <span className="text-[8px] font-mono font-black text-zinc-500 uppercase">
                {is3D ? 'VRM_VISEME_v5' : 'SVG_LIP_ENGINE'} · {Math.round(lipSyncLevel * 100)}%
              </span>
            </div>
            <button
              onClick={() => setIs3D(!is3D)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 hover:bg-black/80 rounded-full border border-white/10 transition-all"
            >
              {is3D
                ? <ImageIcon className="w-2.5 h-2.5 text-zinc-400" />
                : <Box className="w-2.5 h-2.5 text-blue-400" />
              }
              <span className="text-[7px] font-bold text-zinc-300 uppercase tracking-tighter">
                {is3D ? '2D' : '3D'} وضع
              </span>
            </button>
          </div>
          <div className="text-[7px] font-mono text-zinc-600 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded">
            <Clock className="w-2 h-2" />
            {new Date().toLocaleTimeString('ar-SA')}
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="text-[7px] font-mono text-blue-500/70 uppercase">Arabic_Viseme_Active</div>
            <div className="w-28 h-1 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${lipSyncLevel * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[8px] font-mono text-white tracking-widest uppercase">{character.nameAr}</div>
              <div className="text-[6px] font-mono text-zinc-600 uppercase">
                {character.preferredDialect || character.role}
              </div>
            </div>
            <div className="w-7 h-7 rounded-full border border-blue-500/30 flex items-center justify-center bg-black/50">
              <Zap className={`w-3 h-3 transition-all ${isLoud ? 'text-yellow-400 scale-125' : 'text-blue-500'}`} fill="currentColor" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
