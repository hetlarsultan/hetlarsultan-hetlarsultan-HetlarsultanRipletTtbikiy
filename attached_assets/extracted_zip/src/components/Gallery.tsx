import React from 'react';
import { Generation } from '../types';
import { Film, ImageIcon, Mic2, Trash2, Download, Share2, X, FolderOpen, UserRound, Clapperboard, Zap, ScanSearch, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GalleryProps {
  onClose: () => void;
  onSelect: (gen: Generation) => void;
}

export default function Gallery({ onClose, onSelect }: GalleryProps) {
  const [generations, setGenerations] = React.useState<Generation[]>([]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('studio_generations');
      if (saved) setGenerations(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load gallery', e);
    }
  }, []);

  const displayGenerations = generations.slice(0, 20); // Limit initial view for speed

  const handleDelete = (id: string) => {
    const updated = generations.filter(g => g.id !== id);
    setGenerations(updated);
    localStorage.setItem('studio_generations', JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-black z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 hover:bg-zinc-900 rounded-full transition-colors lg:hidden">
            <ArrowLeft className="w-5 h-5 text-blue-500" />
          </button>
          <FolderOpen className="w-5 h-5 text-blue-500" />
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-200">المعرض / GALLERY</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
          <X className="w-5 h-5 text-zinc-500" />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
        {generations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4">
             <FolderOpen className="w-16 h-16" />
             <p className="text-[10px] font-black uppercase tracking-widest">No local archives found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {displayGenerations.map((gen) => (
              <motion.div
                key={gen.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bento-card group h-48 relative overflow-hidden"
              >
                <img 
                  src={gen.type === 'video' ? `https://picsum.photos/seed/${gen.id}/400/300` : `https://picsum.photos/seed/${gen.id}/400/300`}
                  className="absolute inset-0 w-full h-full object-cover brightness-50 group-hover:scale-110 transition-transform duration-500"
                  alt="Preview"
                  referrerPolicy="no-referrer"
                />
                
                <div className="absolute inset-0 p-3 flex flex-col justify-between bg-gradient-to-t from-black to-transparent">
                  <div className="flex justify-between items-start">
                    <div className="p-1.5 bg-black/60 rounded-lg backdrop-blur-md border border-white/5">
                      {gen.type === 'video' ? <Film className="w-3 h-3 text-emerald-500" /> : 
                       gen.type === 'image' ? <ImageIcon className="w-3 h-3 text-blue-500" /> : 
                       gen.type === 'audio' ? <Mic2 className="w-3 h-3 text-orange-500" /> :
                       gen.type === 'character' ? <UserRound className="w-3 h-3 text-blue-400" /> :
                       gen.type === 'movie' ? <Clapperboard className="w-3 h-3 text-purple-500" /> :
                       gen.type === 'animated-image' ? <Zap className="w-3 h-3 text-amber-500" /> :
                       gen.type === 'analysis' ? <ScanSearch className="w-3 h-3 text-cyan-500" /> :
                       <Mic2 className="w-3 h-3 text-zinc-500" />}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(gen.id); }}
                      className="p-1.5 bg-rose-600/20 text-rose-500 rounded-lg backdrop-blur-md border border-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-white truncate">{gen.prompt}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-[7px] text-zinc-500 font-mono italic">{new Date(gen.timestamp).toLocaleDateString()}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="p-1 bg-white/10 rounded"><Share2 className="w-3 h-3" /></button>
                         <button className="p-1 bg-white/10 rounded"><Download className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => onSelect(gen)}
                  className="absolute inset-0 z-0"
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
