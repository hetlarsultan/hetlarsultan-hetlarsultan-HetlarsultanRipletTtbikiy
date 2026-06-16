import React, { useMemo, useState, useEffect } from 'react';
import { Settings2, Camera, Zap, Layout, Monitor, Film, Mic2, Users, Dna, Globe, Mountain, Layers, Sparkles, UserCheck, ArrowLeft, Plus, X, Save, Hash, Volume2, Loader2, Trash2 } from 'lucide-react';
import { VideoModel, ShotConfig, Character, VisualFilter, CharacterStyle } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { FIXED_CHARACTERS, VISUAL_FILTERS } from '../constants';
import { chatWithGemini } from '../lib/gemini';

interface SidebarProps {
  model: VideoModel;
  setModel: (model: VideoModel) => void;
  config: ShotConfig;
  setConfig: (config: ShotConfig) => void;
  view?: 'models' | 'actors' | 'env';
  onBack?: () => void;
}

const MODELS: VideoModel[] = ['Sora 2', 'Kling v1.5', 'Veo 3.1', 'Luma Dream Machine', 'Runway Gen-3'];

const Sidebar = React.memo(({ model, setModel, config, setConfig, view, onBack }: SidebarProps) => {
  const isMobile = !!view;
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [isAddingActor, setIsAddingActor] = useState(false);
  const [newActor, setNewActor] = useState<Partial<Character>>({
    name: '',
    nameAr: '',
    role: '',
    description: '',
    style: 'realistic',
    preferredVoice: 'male',
    preferredDialect: 'modern_standard'
  });

  // Load custom characters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('studio_custom_actors');
    if (saved) {
      try {
        setCustomCharacters(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load actors", e);
      }
    }
  }, []);

  const [isSuggesting, setIsSuggesting] = useState<string | null>(null);

  const cloneAsCustom = (char: Character, improvedDescription?: string) => {
    const actor: Character = {
      ...char,
      id: Math.random().toString(36).substring(7),
      isCustom: true,
      description: improvedDescription || char.description
    };
    const updated = [actor, ...customCharacters];
    setCustomCharacters(updated);
    localStorage.setItem('studio_custom_actors', JSON.stringify(updated));
    return actor;
  };

  const suggestCharacterImprovements = async (char: Character) => {
    setIsSuggesting(char.id);
    try {
      const prompt = `Analyze this character for a video production and suggest 3-4 specific enhancements to their visual description to make them more cinematic and distinct. 
Character Current Data:
Name: ${char.name} / ${char.nameAr}
Description: ${char.description}
Style: ${char.style}

Respond ONLY with the enhanced description text in English, followed by its Arabic translation. 
Format: [English Enhanced Description] | [Arabic Enhanced Description]`;
      
      const suggestion = await chatWithGemini(prompt);
      const [en, ar] = suggestion.split('|').map(s => s.trim());
      
      if (en && ar) {
        if (char.isCustom) {
          const updated = customCharacters.map(c => 
            c.id === char.id ? { ...c, description: en, nameAr: char.nameAr } : c
          );
          setCustomCharacters(updated);
          localStorage.setItem('studio_custom_actors', JSON.stringify(updated));
        } else {
          // Clone fixed character as a custom one with improvements
          if (confirm(`AI Suggested Improvement:\n\n${en}\n\nWould you like to clone this character as a Custom Character with this description?`)) {
            cloneAsCustom(char, en);
          }
        }
      }
    } catch (err) {
      console.error("Suggestion Error:", err);
    } finally {
      setIsSuggesting(null);
    }
  };

  const saveCustomActor = () => {
    if (!newActor.name || !newActor.description) return;
    const actor: Character = {
      id: `custom_${Date.now()}`,
      name: newActor.name || '',
      nameAr: newActor.nameAr || newActor.name || '',
      role: newActor.role || 'Supporting',
      description: newActor.description || '',
      avatar: `https://ui-avatars.com/api/?name=${newActor.name}&background=random&color=fff`,
      style: (newActor.style as CharacterStyle) || 'realistic',
      isCustom: true,
      preferredVoice: newActor.preferredVoice,
      preferredDialect: newActor.preferredDialect
    };
    const updated = [actor, ...customCharacters];
    setCustomCharacters(updated);
    localStorage.setItem('studio_custom_actors', JSON.stringify(updated));
    setIsAddingActor(false);
    setNewActor({ 
      name: '', 
      nameAr: '', 
      role: '', 
      description: '', 
      style: 'realistic',
      preferredVoice: 'male',
      preferredDialect: 'modern_standard'
    });
  };

  const deleteCustomActor = (id: string) => {
    const updated = customCharacters.filter(c => c.id !== id);
    setCustomCharacters(updated);
    localStorage.setItem('studio_custom_actors', JSON.stringify(updated));
    // Also remove from selected if present
    if (config.selectedCharacters?.some(c => c.id === id)) {
      setConfig({
        ...config,
        selectedCharacters: config.selectedCharacters.filter(c => c.id !== id)
      });
    }
  };

  const allCharacters = useMemo(() => [...customCharacters, ...FIXED_CHARACTERS], [customCharacters]);
  const realisticCharacters = useMemo(() => allCharacters.filter(c => c.style === 'realistic'), [allCharacters]);
  const cartoonCharacters = useMemo(() => allCharacters.filter(c => c.style === 'cartoon'), [allCharacters]);

  const toggleCharacter = (char: Character) => {
    const selected = config.selectedCharacters || [];
    const isSelected = selected.some(c => c.id === char.id);
    if (isSelected) {
      setConfig({ 
        ...config, 
        selectedCharacters: selected.filter(c => c.id !== char.id) 
      });
    } else {
      setConfig({ 
        ...config, 
        selectedCharacters: [...selected, char],
        voiceType: (char.preferredVoice as any) || config.voiceType,
        dialect: (char.preferredDialect as any) || config.dialect
      });
    }
  };

  const updateVoiceSetting = (field: string, value: any) => {
    const current = config.voiceSettings || { pitch: 1.0, speed: 1.0, tone: 'neutral' };
    setConfig({
      ...config,
      voiceSettings: { ...current, [field]: value }
    });
  };

  return (
    <>
      {/* AI Model Suite */}
      {isMobile && (
        <div className="flex items-center gap-2 mb-4 px-2">
            <button 
              onClick={() => onBack?.()}
              className="p-1 hover:bg-zinc-900 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-blue-500" />
            </button>
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Back_to_Studio</span>
        </div>
      )}
      {(!isMobile || view === 'models') && (
        <section className={`${!isMobile ? 'col-start-9 col-span-4 row-start-3 row-span-2' : ''} bento-card p-4 h-full`}>
          <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-3 flex items-center justify-between tracking-[0.2em]">
            <span className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              Model_Suite.lib
            </span>
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          </h3>
          <div className="space-y-1.5 overflow-y-auto pr-1">
            {MODELS.map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-[11px] transition-all border ${
                  model === m
                    ? 'bg-blue-600/10 border-blue-600/30 text-white shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                    : 'bg-zinc-950/20 border-zinc-800/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <span className="font-bold tracking-tight">{m}</span>
                <div className={`w-1 h-1 rounded-full ${model === m ? 'bg-blue-400' : 'bg-zinc-800'}`} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Casting List */}
      {(!isMobile || view === 'actors') && (
        <div className="space-y-4">
          <section className={`${!isMobile ? 'col-start-5 col-span-3 row-start-5 row-span-2' : ''} bento-card p-4 h-full flex flex-col overflow-hidden`}>
            <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-4 flex items-center justify-between tracking-[0.2em]">
              <span className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                Casting_List.io
              </span>
              <button 
                onClick={() => setIsAddingActor(true)}
                className="p-1 hover:bg-zinc-900 rounded bg-zinc-900/50 border border-zinc-800 flex items-center gap-1 text-[8px] text-blue-500 font-bold"
              >
                <Plus className="w-2.5 h-2.5" /> ADD_CUSTOM
              </button>
            </h3>

            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
              {/* Realistic Section */}
              <div className="mb-4">
                <h4 className="text-[8px] font-black uppercase text-zinc-600 mb-2 tracking-widest px-1">Realistic_Units</h4>
                <div className="space-y-2">
                  {realisticCharacters.map((actor) => (
                    <div 
                      key={actor.id} 
                      onClick={() => toggleCharacter(actor)}
                      className={`p-2 bento-inner flex items-center justify-between group cursor-pointer transition-all ${
                        config.selectedCharacters?.some(c => c.id === actor.id) ? 'border-blue-500 bg-blue-500/5' : 'hover:border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                         <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.selectedCharacters?.some(c => c.id === actor.id) ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-zinc-800'}`} />
                         <div className="min-w-0 truncate">
                            <div className={`text-[9px] font-bold truncate ${config.selectedCharacters?.some(c => c.id === actor.id) ? 'text-blue-400' : 'text-zinc-300'}`}>
                              {actor.nameAr} <span className="text-zinc-600 font-normal">({actor.name})</span>
                            </div>
                            <div className="text-[7px] text-zinc-600 uppercase tracking-tighter truncate">{actor.role}</div>
                         </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            suggestCharacterImprovements(actor);
                          }}
                          disabled={isSuggesting === actor.id}
                          className="p-1 opacity-0 group-hover:opacity-100 text-blue-400 hover:text-white transition-opacity"
                          title="AI Enhance Description"
                        >
                          {isSuggesting === actor.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                        </button>
                        {actor.isCustom && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteCustomActor(actor.id); }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <button className={`transition-opacity p-1 rounded ${config.selectedCharacters?.some(c => c.id === actor.id) ? 'opacity-100 bg-blue-500/20' : 'opacity-0 group-hover:opacity-100 bg-zinc-900'}`}>
                           <Dna className={`w-2.5 h-2.5 ${config.selectedCharacters?.some(c => c.id === actor.id) ? 'text-blue-400' : 'text-zinc-400'}`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cartoon Section */}
              <div>
                <h4 className="text-[8px] font-black uppercase text-zinc-600 mb-2 tracking-widest px-1">Cartoon_Units</h4>
                <div className="space-y-2">
                  {cartoonCharacters.map((actor) => (
                    <div 
                      key={actor.id} 
                      onClick={() => toggleCharacter(actor)}
                      className={`p-2 bento-inner flex items-center justify-between group cursor-pointer transition-all ${
                        config.selectedCharacters?.some(c => c.id === actor.id) ? 'border-blue-500 bg-blue-500/5' : 'hover:border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                         <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.selectedCharacters?.some(c => c.id === actor.id) ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-zinc-800'}`} />
                         <div className="min-w-0 truncate">
                            <div className={`text-[9px] font-bold truncate ${config.selectedCharacters?.some(c => c.id === actor.id) ? 'text-blue-400' : 'text-zinc-300'}`}>
                              {actor.nameAr} <span className="text-zinc-600 font-normal">({actor.name})</span>
                            </div>
                            <div className="text-[7px] text-zinc-600 uppercase tracking-tighter truncate">{actor.role}</div>
                         </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            suggestCharacterImprovements(actor);
                          }}
                          disabled={isSuggesting === actor.id}
                          className="p-1 opacity-0 group-hover:opacity-100 text-blue-400 hover:text-white transition-opacity"
                          title="AI Enhance Description"
                        >
                          {isSuggesting === actor.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                        </button>
                        {actor.isCustom && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteCustomActor(actor.id); }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <button className={`transition-opacity p-1 rounded ${config.selectedCharacters?.some(c => c.id === actor.id) ? 'opacity-100 bg-blue-500/20' : 'opacity-0 group-hover:opacity-100 bg-zinc-900'}`}>
                           <Dna className={`w-2.5 h-2.5 ${config.selectedCharacters?.some(c => c.id === actor.id) ? 'text-blue-400' : 'text-zinc-400'}`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Actor Modal */}
            <AnimatePresence>
              {isAddingActor && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 bg-zinc-950/95 z-50 p-4 border border-zinc-800 rounded-2xl flex flex-col gap-4"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Register_New_Agent</h4>
                    <button onClick={() => setIsAddingActor(false)} className="p-1 hover:bg-zinc-900 rounded"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-3 flex-grow overflow-y-auto pr-1">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 uppercase font-bold px-1">Identity.en</label>
                      <input 
                        type="text" 
                        placeholder="Character Name"
                        value={newActor.name}
                        onChange={(e) => setNewActor({...newActor, name: e.target.value})}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-[10px] text-white focus:border-blue-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 uppercase font-bold px-1">Identity.ar</label>
                      <input 
                        type="text" 
                        placeholder="الاسم بالعربي"
                        dir="rtl"
                        value={newActor.nameAr}
                        onChange={(e) => setNewActor({...newActor, nameAr: e.target.value})}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-[10px] text-white focus:border-blue-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 uppercase font-bold px-1">Directive.role</label>
                      <input 
                        type="text" 
                        placeholder="Lead / Villain / Hero"
                        value={newActor.role}
                        onChange={(e) => setNewActor({...newActor, role: e.target.value})}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-[10px] text-white focus:border-blue-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 uppercase font-bold px-1">Attribute.dna</label>
                      <textarea 
                        placeholder="Age, clothing details, facial expressions, menacing or friendly tone..."
                        rows={3}
                        value={newActor.description}
                        onChange={(e) => setNewActor({...newActor, description: e.target.value})}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-[10px] text-white focus:border-blue-500 outline-none resize-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 uppercase font-bold px-1">Source.3D_Engine (VRM/GLB)</label>
                      <input 
                        type="text" 
                        placeholder="https://example.com/character.vrm"
                        value={newActor.vrmUrl || ''}
                        onChange={(e) => setNewActor({...newActor, vrmUrl: e.target.value})}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-[10px] text-white focus:border-blue-500 outline-none" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-500 uppercase font-bold px-1">Voice_Type</label>
                        <select 
                          value={newActor.preferredVoice}
                          onChange={(e) => setNewActor({...newActor, preferredVoice: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-[10px] text-white focus:border-blue-500 outline-none"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="sheikh">Sheikh</option>
                          <option value="syrian">Syrian</option>
                          <option value="egyptian">Egyptian</option>
                          <option value="bedouin">Bedouin</option>
                          <option value="cartoon">Cartoon</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-500 uppercase font-bold px-1">Dialect</label>
                        <select 
                          value={newActor.preferredDialect}
                          onChange={(e) => setNewActor({...newActor, preferredDialect: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-[10px] text-white focus:border-blue-500 outline-none"
                        >
                          <option value="modern_standard">Standard</option>
                          <option value="syrian">Syrian</option>
                          <option value="egyptian">Egyptian</option>
                          <option value="iraqi">Iraqi</option>
                          <option value="bedouin">Bedouin</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                       {['realistic', 'cartoon', '3d-animation'].map(s => (
                         <button 
                           key={s}
                           onClick={() => setNewActor({...newActor, style: s as any})}
                           className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${
                             newActor.style === s ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                           }`}
                         >
                           {s}
                         </button>
                       ))}
                    </div>
                  </div>
                  <button 
                    onClick={saveCustomActor}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
                  >
                    <Save className="w-3.5 h-3.5" /> Initialize_Instance
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Character Consistency Module */}
          <section className="bento-card p-4 group/char">
            <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-4 flex items-center justify-between tracking-[0.2em]">
              <span className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                Character_Consistency
              </span>
              <span className="text-[7px] text-emerald-500/80 font-mono">STABLE_98.4%</span>
            </h3>
            
            <div className="space-y-2 max-h-[120px] overflow-y-auto no-scrollbar">
              {(config.selectedCharacters?.length || 0) > 0 ? (
                config.selectedCharacters?.map(char => (
                  <div key={char.id} className="flex items-center space-x-3 p-2 bento-inner bg-blue-600/5 relative overflow-hidden">
                    <div className="w-8 h-8 bg-zinc-800 rounded border border-blue-500/30 overflow-hidden shrink-0">
                        <img 
                          src={char.avatar} 
                          className="w-full h-full object-cover" 
                          alt={char.name} 
                          referrerPolicy="no-referrer" 
                        />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-black text-white truncate">
                        {char.nameAr}
                      </div>
                      <div className="text-[7px] text-blue-500 font-mono font-bold">
                        {char.role}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center space-x-3 p-3 bento-inner bg-blue-600/5 relative overflow-hidden italic text-zinc-500 text-[10px]">
                  SELECT_CHARACTERS
                </div>
              )}
            </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="p-2 bento-inner bg-black/40 flex justify-between items-center">
                         <span className="text-[8px] text-zinc-600 font-black tracking-widest">{['FACE', 'OUTFIT', 'MOOD', 'LIGHT'][i]}</span>
                         <span className="text-[9px] font-mono text-white">{(config.selectedCharacters?.length || 0) > 0 ? '90%' : '--'}</span>
                      </div>
                    ))}
                  </div>
          </section>
        </div>
      )}

      {/* Advanced Vocal Controls */}
      {(!isMobile || view === 'actors') && (
        <section className={`${!isMobile ? 'col-start-8 col-span-2 row-start-5 row-span-2' : ''} bento-card p-4 h-full flex flex-col`}>
          <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-4 flex items-center justify-between tracking-[0.2em]">
            <span className="flex items-center gap-2">
              <Mic2 className="w-3.5 h-3.5 text-blue-500" />
              Advanced_Audio
            </span>
            <Volume2 className="w-3.5 h-3.5 text-zinc-800" />
          </h3>
          <div className="space-y-3 flex-grow overflow-y-auto pr-1">
             <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-black text-zinc-600">
                   <span>VOCAL_PITCH</span>
                   <span className="text-blue-500">{config.voiceSettings?.pitch || 1.0}x</span>
                </div>
                <input 
                  type="range" min="0.5" max="2.0" step="0.1" 
                  value={config.voiceSettings?.pitch || 1.0}
                  onChange={(e) => updateVoiceSetting('pitch', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 h-1 bg-zinc-900 rounded-full appearance-none"
                />
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-black text-zinc-600">
                   <span>TEMPO_SPEED</span>
                   <span className="text-blue-500">{config.voiceSettings?.speed || 1.0}x</span>
                </div>
                <input 
                  type="range" min="0.5" max="2.0" step="0.1" 
                  value={config.voiceSettings?.speed || 1.0}
                  onChange={(e) => updateVoiceSetting('speed', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 h-1 bg-zinc-900 rounded-full appearance-none"
                />
             </div>
             <div className="grid grid-cols-2 gap-2">
                {['neutral', 'warm', 'serious', 'energetic'].map(t => (
                  <button 
                    key={t}
                    onClick={() => updateVoiceSetting('tone', t)}
                    className={`py-1.5 rounded bento-inner text-[8px] font-black uppercase transition-all ${
                      config.voiceSettings?.tone === t ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
             </div>
          </div>
          <button className="w-full mt-4 py-2 bento-inner text-[8px] uppercase font-black text-white bg-blue-600 hover:bg-blue-500 transition-all border-none">
             PREVIEW_SYNTHESIS
          </button>
        </section>
      )}

      {/* World Synthesis - Only in environment view on mobile */}
      {view === 'env' && (
        <section className="bento-card p-4 h-full flex flex-col group/env">
          <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-3 flex items-center justify-between tracking-[0.2em]">
            <span className="flex items-center gap-2">
              <Mountain className="w-3.5 h-3.5 text-blue-500 group-hover/env:rotate-12 transition-transform" />
              Environment_FX
            </span>
            <div className="flex gap-1">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
               <div className="w-2 h-2 bg-blue-500/30 rounded-full" />
            </div>
          </h3>
          <div className="space-y-4 flex-grow overflow-y-auto custom-scrollbar pr-1">
             <div className="p-3 bento-inner bg-blue-600/5 border-blue-600/20 relative overflow-hidden group/biome">
                <div className="text-[11px] text-blue-400 font-bold mb-2 flex justify-between items-center">
                   <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Biome: Dynamic_Cyber</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                   {VISUAL_FILTERS.map(f => (
                     <button
                       key={f.id}
                       onClick={() => setConfig({...config, filter: f.id})}
                       className={`p-2 bento-inner flex flex-col items-center gap-2 transition-all ${
                         config.filter === f.id ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/40 text-zinc-500 hover:border-zinc-700'
                       }`}
                     >
                       <div className={`w-10 h-6 rounded bg-zinc-800 overflow-hidden relative border border-zinc-700 ${f.class}`}>
                          {f.id !== 'none' && <div className="absolute inset-0 bg-blue-500/10" />}
                       </div>
                       <span className="text-[7px] font-black uppercase text-center leading-tight">{f.name}</span>
                     </button>
                   ))}
                </div>
             </div>

             <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                   <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Anim_Intensity</span>
                   <span className="text-[9px] text-blue-400 font-mono">0.85x</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                   <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 w-[85%]" />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
                <button className="p-3 bento-inner text-[9px] uppercase font-black text-zinc-400 hover:text-blue-400 hover:border-blue-500/30 transition-all bg-black/40 flex flex-col items-center gap-2 group/btn">
                   <Layers className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                   Volumetrics
                </button>
                <button className="p-3 bento-inner text-[9px] uppercase font-black text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all bg-black/40 flex flex-col items-center gap-2 group/btn">
                   <Sparkles className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                   Particle_Gen
                </button>
             </div>
          </div>
        </section>
      )}
    </>
  );
});

export default Sidebar;
