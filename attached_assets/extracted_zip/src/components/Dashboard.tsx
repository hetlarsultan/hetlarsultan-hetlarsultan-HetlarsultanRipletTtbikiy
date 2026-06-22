import React from 'react';
import { ImageIcon, Film, Mic2, PlayCircle, FolderHeart, Settings, Sparkles, Smartphone, MessageSquare, Music, BarChart3, Brain, UserRound, Clapperboard, Zap, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { FIXED_CHARACTERS } from '../constants';

interface DashboardProps {
  onSelectAction: (action: 'image' | 'video' | 'tts' | 'img2vid' | 'chat' | 'music' | 'analysis' | 'reasoning' | 'character' | 'movie' | 'animated-image') => void;
  onOpenGallery: () => void;
}

const Dashboard = React.memo(({ onSelectAction, onOpenGallery }: DashboardProps) => {
  const actions = [
    { id: 'movie', label: 'إنتاج الدراما', icon: Clapperboard, color: 'bg-purple-600', description: 'Story to Action Movie' },
    { id: 'video', label: 'فيديو سريع', icon: Film, color: 'bg-emerald-600', description: 'Single Shot Generation' },
    { id: 'character', label: 'استوديو الشخصيات', icon: UserRound, color: 'bg-blue-500', description: 'Actor DNA Matching' },
    { id: 'animated-image', label: 'توليد الحركة', icon: Zap, color: 'bg-amber-600', description: 'Animate Static Assets' },
    { id: 'image', label: 'إنشاء صورة', icon: ImageIcon, color: 'bg-blue-600', description: 'Nano Banana 2 Art' },
    { id: 'tts', label: 'دبلجة صوتية', icon: Mic2, color: 'bg-orange-600', description: 'Natural Arabic Voice' },
    { id: 'chat', label: 'مساعد الإنتاج', icon: MessageSquare, color: 'bg-indigo-600', description: 'Script & Idea Buddy' },
    { id: 'analysis', label: 'تحليل المشهد', icon: BarChart3, color: 'bg-cyan-600', description: 'Visual Analytics' },
  ];

  return (
    <div className="flex flex-col gap-6 py-6 h-full overflow-y-auto no-scrollbar">
      {/* Hero Welcome */}
      <div className="px-2">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bento-card bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/30 overflow-hidden relative"
        >
          <div className="relative z-10">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">
              Video Studio <span className="text-blue-500">Offline</span>
            </h2>
            <p className="text-xs text-zinc-400 font-medium">Powering your imagination without boundaries.</p>
          </div>
          <Sparkles className="absolute right-4 top-4 w-12 h-12 text-blue-500/20" />
        </motion.div>
      </div>

      {/* Main 4 Action Buttons */}
      <div className="grid grid-cols-2 gap-4 px-2">
        {actions.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelectAction(action.id as any)}
            className="bento-card group active:scale-95 transition-all p-5 flex flex-col items-center gap-4 text-center hover:border-blue-500/40"
          >
            <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
              <action.icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-wider">{action.label}</div>
              <div className="text-[10px] text-zinc-600 font-bold mt-1 uppercase tracking-tighter">{action.description}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Character Showcase */}
      <div className="px-2 space-y-4">
        <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-2 flex items-center gap-2">
          <UserCheck className="w-3 h-3 text-blue-500" />
          Featured_Actors
        </h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
          {FIXED_CHARACTERS.map((char) => (
            <motion.div
              key={char.id}
              whileHover={{ y: -5 }}
              className="flex-shrink-0 w-28 character-card text-center"
            >
              <div className="relative mb-2">
                <img 
                  src={char.avatar} 
                  className="w-full aspect-square rounded-lg object-cover border border-white/10" 
                  alt={char.name}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-black rounded-full" />
              </div>
              <div className="text-[10px] font-black text-white uppercase">{char.nameAr}</div>
              <div className="text-[8px] text-zinc-500 font-mono mt-0.5">{char.role}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="px-2 space-y-4">
        <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-2">Quick_Navigation</h3>
        <div className="grid grid-cols-2 gap-4">
           <button 
             onClick={onOpenGallery}
             className="bento-card p-4 flex items-center gap-3 hover:bg-zinc-900 transition-colors"
           >
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
                 <FolderHeart className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-[11px] font-bold uppercase">المعرض</span>
           </button>
           <button 
             className="bento-card p-4 flex items-center gap-3 hover:bg-zinc-900 transition-colors"
           >
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
                 <Smartphone className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-[11px] font-bold uppercase">بناء APK</span>
           </button>
        </div>
      </div>

      {/* System Status */}
      <div className="px-2 mt-auto">
        <div className="p-4 bento-inner bg-zinc-900/50 border-zinc-800/50 flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <div className="flex flex-col">
                 <span className="text-[9px] font-black uppercase">Local Engine</span>
                 <span className="text-[7px] text-zinc-600 font-mono">STABLE_V2.1</span>
              </div>
           </div>
           <div className="text-[9px] font-mono text-zinc-700">624MB RAM FREE</div>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
