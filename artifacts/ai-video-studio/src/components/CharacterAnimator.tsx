import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Character, ShotConfig } from '../types';
import { Activity, Clock, MapPin, Zap, Box, Image as ImageIcon } from 'lucide-react';
import { Avatar3D } from './Avatar3D';

interface CharacterAnimatorProps {
  character: Character;
  lipSyncLevel: number;
  config: ShotConfig;
}

const ENVIRONMENTS = {
  desert: {
    bg: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&q=80&w=1200',
    overlay: 'bg-orange-950/20',
    lighting: 'bg-gradient-to-t from-orange-500/10 to-transparent',
    particles: 'animate-sand-drift'
  },
  city: {
    bg: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1200',
    overlay: 'bg-blue-950/30',
    lighting: 'bg-gradient-to-t from-blue-500/10 to-transparent',
    particles: 'animate-pulse'
  },
  house: {
    bg: 'https://images.unsplash.com/photo-1600585154340-be6199fbfd0b?auto=format&fit=crop&q=80&w=1200',
    overlay: 'bg-zinc-950/30',
    lighting: 'bg-gradient-to-t from-zinc-500/10 to-transparent',
    particles: 'hidden'
  },
  mosque: {
    bg: 'https://images.unsplash.com/photo-1542661596-f6424564c781?auto=format&fit=crop&q=80&w=1200',
    overlay: 'bg-emerald-950/20',
    lighting: 'bg-gradient-to-t from-emerald-500/10 to-transparent',
    particles: 'animate-gentle-dust'
  },
  studio: {
    bg: 'https://images.unsplash.com/photo-1524169220946-12efd782aab4?auto=format&fit=crop&q=80&w=1200',
    overlay: 'bg-black/60',
    lighting: 'bg-gradient-to-t from-blue-600/20 to-transparent',
    particles: 'animate-digital-scan'
  }
};

export const CharacterAnimator: React.FC<CharacterAnimatorProps> = ({
  character,
  lipSyncLevel,
  config
}) => {
  const [blink, setBlink] = useState(false);
  const [is3D, setIs3D] = useState(character.style === '3d-animation' || !!character.vrmUrl);
  const currentEnv = ENVIRONMENTS[config.environment as keyof typeof ENVIRONMENTS] || ENVIRONMENTS.studio;

  // Auto-blinking logic
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, Math.random() * 3000 + 2000);
    return () => clearInterval(blinkInterval);
  }, []);

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
          {/* Dynamic Background */}
          <motion.div 
            key={config.environment}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-0"
          >
            <img 
              src={currentEnv.bg} 
              className="w-full h-full object-cover grayscale-[0.2] brightness-[0.4]"
              alt="Environment"
            />
            <div className={`absolute inset-0 ${currentEnv.overlay}`} />
            <div className={`absolute inset-0 ${currentEnv.lighting}`} />
          </motion.div>

          {/* Atmospheric Particles */}
          <div className={`absolute inset-0 overflow-hidden pointer-events-none z-10 opacity-30 ${currentEnv.particles}`}>
            {currentEnv.particles !== 'hidden' && [...Array(20)].map((_, i) => (
              <div 
                key={i}
                className="absolute bg-white/20 rounded-full blur-[1px]"
                style={{
                  width: Math.random() * 4 + 2 + 'px',
                  height: Math.random() * 4 + 2 + 'px',
                  left: Math.random() * 100 + '%',
                  top: Math.random() * 100 + '%',
                  animationDelay: Math.random() * 10 + 's',
                }}
              />
            ))}
          </div>

          {/* Main Character Body Container */}
          <motion.div 
            animate={{
              y: [0, -3, 0],
              rotate: [0, 0.5, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative z-20 flex flex-col items-center"
          >
            {/* Head & Face */}
            <div className="relative w-48 h-48 sm:w-64 sm:h-64">
              <motion.div 
                animate={{
                  scale: 1 + lipSyncLevel * 0.02,
                  scaleY: 1 + (lipSyncLevel > 0 ? (Math.sin(Date.now() / 50) * 0.02) : 0),
                  y: lipSyncLevel * 3,
                  filter: `brightness(${1 + lipSyncLevel * 0.15})`,
                }}
                className="w-full h-full rounded-full overflow-hidden border-4 border-blue-500/20 shadow-[0_0_80px_rgba(37,99,235,0.2)] bg-black"
              >
                <img 
                  src={character.avatar}
                  className="w-full h-full object-cover opacity-85"
                  alt={character.name}
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              {/* Neural Lip Sync Module */}
              <div className="absolute bottom-[23%] left-1/2 -translate-x-1/2 w-20 h-10 flex items-center justify-center">
                <motion.div
                  animate={{
                    scaleY: lipSyncLevel * 3.8 + 0.05,
                    scaleX: 1 + lipSyncLevel * 0.25,
                    opacity: lipSyncLevel > 0.05 ? 1 : 0
                  }}
                  className="w-14 h-6 bg-black rounded-[50%] border-b border-rose-500/10 shadow-[0_5px_15px_rgba(0,0,0,0.8)] overflow-hidden relative"
                >
                  <motion.div
                    animate={{
                      y: lipSyncLevel * -1.5,
                      opacity: lipSyncLevel > 0.15 ? 0.9 : 0,
                    }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-11 h-2.5 bg-gradient-to-b from-white to-zinc-200 rounded-b-md blur-[0.3px] z-20 border-x border-zinc-300/20"
                  />
                  <motion.div
                    animate={{
                      opacity: lipSyncLevel > 0.3 ? 0.7 : 0,
                      scale: 0.8 + lipSyncLevel * 0.2
                    }}
                    className="absolute inset-0 bg-gradient-to-b from-red-950 to-rose-950 rounded-full blur-[2px] z-10"
                  />
                  <motion.div
                    animate={{
                      y: lipSyncLevel * 1.5,
                      opacity: lipSyncLevel > 0.5 ? 0.5 : 0,
                    }}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-9 h-1.5 bg-white/40 rounded-t-md blur-[0.8px] z-20"
                  />
                </motion.div>
              </div>

              {/* Eye Blinking */}
              <div className="absolute top-[35%] left-0 w-full px-[15%] flex justify-between">
                <motion.div 
                  animate={{ scaleY: blink ? 0.1 : 1 }}
                  className="w-8 h-4 bg-black/60 rounded-full blur-[0.5px]"
                />
                <motion.div 
                  animate={{ scaleY: blink ? 0.1 : 1 }}
                  className="w-8 h-4 bg-black/60 rounded-full blur-[0.5px]"
                />
              </div>

              <motion.div 
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-x-[-10%] inset-y-[-10%] rounded-full border border-blue-500/20 -z-10 blur-xl"
              />
            </div>
          </motion.div>
        </>
      )}

      {/* Shared Overlay Elements */}
      <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-6">
        <div className="flex justify-between items-start">
           <div className="flex flex-col gap-2 pointer-events-auto">
             <div className="flex gap-1.5 items-center">
               <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
               <div className="text-[9px] font-black text-zinc-500 font-mono">REC_MODE: {is3D ? 'NEURAL_3D' : 'LIVE_SYNC'}</div>
             </div>
             
             {/* Toggle 2D/3D */}
             <button 
                onClick={() => setIs3D(!is3D)}
                className="flex items-center gap-2 px-3 py-1 bg-black/60 hover:bg-black/80 rounded-full border border-white/10 transition-all group"
             >
                {is3D ? <ImageIcon className="w-3 h-3 text-zinc-400" /> : <Box className="w-3 h-3 text-blue-500" />}
                <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-tighter">
                  Switch to {is3D ? '2D Cinematic' : 'Hyper-3D'}
                </span>
             </button>
           </div>
           
           <div className="text-[8px] font-mono text-zinc-500 flex items-center gap-2 bg-black/40 px-2 py-1 rounded">
             <Clock className="w-2 h-2" />
             {new Date().toLocaleTimeString()}
           </div>
        </div>

        <div className="flex justify-between items-end">
           <div className="space-y-1">
              <div className="text-[7px] font-mono text-blue-500 uppercase">Latency_Optimized</div>
              <div className="w-32 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: lipSyncLevel > 0 ? ['40%', '60%', '50%'] : '20%' }}
                  className="h-full bg-blue-500"
                />
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[8px] font-mono text-white tracking-widest uppercase">{character.name}</div>
                <div className="text-[7px] font-mono text-zinc-500">VOICE_NODE_ACTIVE</div>
              </div>
              <div className="w-8 h-8 rounded-full border border-blue-500/30 flex items-center justify-center bg-black/50">
                 <Zap className={`w-3.5 h-3.5 transition-all ${lipSyncLevel > 0.5 ? 'text-yellow-400 scale-125' : 'text-blue-500'}`} fill="currentColor" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
