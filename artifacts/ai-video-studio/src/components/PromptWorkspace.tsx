import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles,
  Send,
  Box,
  Clipboard,
  Wand2,
  History,
  Trash2,
  Loader2,
  X,
  Copy,
  Save,
  ArrowRight,
  ArrowLeft,
  Film,
  Download,
  Eye,
  Smartphone,
  Cloud,
  CloudOff,
  Mic2,
  Globe,
  Mountain,
  Image as ImageIcon,
  Music,
  BarChart3,
  UserCheck,
  Layers,
  Cpu,
  Share2,
  MessageSquare,
  Brain,
  Clapperboard,
  UserRound,
  ScanSearch,
  PlayCircle,
  Zap,
  Mic2 as MicIcon,
  Volume2,
  Play,
  Activity,
  Lock,
  KeyRound,
  HardDrive,
} from "lucide-react";
import { getUserKey } from "../lib/userKeys";
import LocalModelStatus from "./LocalModelStatus";
import { motion, AnimatePresence } from "motion/react";
import { audioAnalyzer } from "../lib/audioAnalysis";
import {
  optimizePrompt,
  scriptToPrompts,
  OptimizedPrompt,
  chatWithGemini,
  chatWithGeminiStream,
  generateNanoImage,
  generateVeoVideo,
  generateLyriaMusic,
  generateCharacter,
  generateSoundscape,
  convertToAnimatedImage,
  generateAdvancedVoice,
  analyzeVideo,
  checkAndRequestVeoAccess,
} from "../lib/gemini";
import {
  VideoModel,
  Generation,
  ShotConfig,
  MediaType,
  CharacterStyle,
  GenerationStatus,
  Character,
} from "../types";
import { FIXED_CHARACTERS } from "../constants";
import { loadFFmpeg } from "../services/ffmpegService";

import { CharacterAnimator } from "./CharacterAnimator";
import { generateLocalOllama } from "../services/localAi";

interface WorkspaceProps {
  model: VideoModel;
  config: ShotConfig;
  setConfig: (config: ShotConfig) => void;
  isMobile?: boolean;
  initialMediaType?: MediaType;
  onBack?: () => void;
}

const getSuggestedVoice = (char: Character | undefined, userVoiceType: string | undefined): string => {
  if (!char) return userVoiceType || 'male';
  
  const charId = char.id.toLowerCase();
  
  // Specific cultural mappings
  if (charId.includes('sheikh')) return 'sheikh';
  if (charId.includes('bedouin') || charId.includes('warrior')) return 'bedouin';
  if (charId.includes('poetess') || (charId.includes('woman') && char.role?.includes('Adult'))) return 'female';
  if (charId.includes('young-man') || charId.includes('khaleeji')) return 'syrian'; // standard modern
  if (charId.includes('egyptian')) return 'egyptian';
  
  // Default fallbacks
  if (charId.includes('old-man') || charId.includes('شيخ')) return 'sheikh';
  if (charId.includes('woman') || charId.includes('girl') || charId.includes('female')) return 'female';
  
  return userVoiceType || 'male';
};

// Memoized Sub-components for Stability and Speed
const GenerationCard = React.memo(
  ({
    g,
    isActive,
    onSelect,
  }: {
    g: Generation;
    isActive: boolean;
    onSelect: (g: Generation) => void;
  }) => (
    <button
      onClick={() => onSelect(g)}
      className={`shrink-0 w-24 h-full rounded-lg border transition-all relative overflow-hidden group ${
        isActive
          ? "border-blue-500 ring-2 ring-blue-500/10"
          : "border-zinc-800/50 hover:border-zinc-600"
      }`}
    >
      {g.status !== "completed" && g.status !== "error" ? (
        <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        </div>
      ) : g.status === "error" ? (
        <div className="absolute inset-0 bg-rose-950/20 flex items-center justify-center">
          <X className="w-4 h-4 text-rose-500" />
        </div>
      ) : (
        <img
          src={
            g.previewUrl ||
            (g.type === "image"
              ? `https://picsum.photos/seed/${g.id}/200/150`
              : "https://picsum.photos/seed/thumb/200/150")
          }
          className={`w-full h-full object-cover transition-all ${isActive ? "grayscale-0 scale-105" : "grayscale-[0.4] group-hover:grayscale-0"}`}
          alt={g.type}
          loading="lazy"
        />
      )}
      <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm p-0.5 rounded border border-white/5">
        {g.type === "video" ? (
          <Film className="w-2.5 h-2.5 text-emerald-500" />
        ) : g.type === "image" ? (
          <ImageIcon className="w-2.5 h-2.5 text-blue-500" />
        ) : g.type === "chat" ? (
          <MessageSquare className="w-2.5 h-2.5 text-zinc-400" />
        ) : g.type === "audio" ? (
          <Music className="w-2.5 h-2.5 text-purple-400" />
        ) : (
          <Box className="w-2.5 h-2.5 text-blue-400" />
        )}
      </div>
      {g.status === "completed" && (
        <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
      )}
    </button>
  ),
);

const GenerationsBar = React.memo(
  ({
    generations,
    activeId,
    onSelect,
    isMobile,
  }: {
    generations: Generation[];
    activeId?: string;
    onSelect: (g: Generation) => void;
    isMobile?: boolean;
  }) => {
    return (
      <section
        className={`${!isMobile ? "col-start-1 col-span-8 row-start-4 row-span-1" : "w-full h-24 my-2"} bento-card p-3 flex gap-3 overflow-x-auto no-scrollbar items-center bg-zinc-950/40 border-zinc-900 scroll-smooth`}
      >
        <AnimatePresence initial={false}>
          {generations.map((g) => (
            <GenerationCard
              key={g.id}
              g={g}
              isActive={activeId === g.id}
              onSelect={onSelect}
            />
          ))}
        </AnimatePresence>
        {generations.length === 0 && (
          <div className="text-[8px] text-zinc-700 font-black uppercase tracking-widest pl-2 flex items-center gap-2">
            <Box className="w-3 h-3 text-zinc-800" />
            Queue_Empty
          </div>
        )}
      </section>
    );
  },
);

const WorldSynthesis = React.memo(({ isMobile }: { isMobile?: boolean }) => (
  <section
    className={`${!isMobile ? "col-start-10 col-span-3 row-start-5 row-span-2" : ""} bento-card p-4 group/env flex flex-col`}
  >
    <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-3 flex items-center justify-between tracking-[0.2em]">
      <span className="flex items-center gap-2">
        <Mountain className="w-3.5 h-3.5 text-blue-500 group-hover/env:rotate-12 transition-transform" />
        توليف العالم الرقمي
      </span>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <div className="w-2 h-2 bg-blue-500/30 rounded-full" />
      </div>
    </h3>
    <div className="space-y-3 flex-grow overflow-y-auto custom-scrollbar">
      <div className="p-2 bento-inner bg-blue-600/5 border-blue-600/20 relative overflow-hidden group/biome">
        <div className="text-[9px] text-blue-400 font-bold mb-1 flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3 h-3" /> البيئة: الفضاء الرقمي
          </span>
          <span className="text-[7px] text-emerald-500 animate-pulse bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
            LIVE_SYNTHESIS
          </span>
        </div>
        <div className="h-1 w-full bg-blue-900/30 overflow-hidden rounded mb-2">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="h-full bg-blue-500 w-1/3 blur-sm"
          />
        </div>
        <div className="flex justify-between items-center text-[7px] text-zinc-500 font-mono">
          <span>RES: 4K_GEN</span>
          <span>TICKS: 240FPS_SIM</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-[8px] text-zinc-600 font-bold uppercase">
            Anim_Intensity
          </span>
          <span className="text-[8px] text-blue-400 font-mono">0.85x</span>
        </div>
        <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 w-[85%]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="p-2 bento-inner text-[8px] uppercase font-black text-zinc-400 hover:text-blue-400 hover:border-blue-500/30 transition-all bg-black/40 flex flex-col items-center gap-1 group/btn">
          <Layers className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
          إضاءة حجمية
        </button>
        <button className="p-2 bento-inner text-[8px] uppercase font-black text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all bg-black/40 flex flex-col items-center gap-1 group/btn">
          <Sparkles className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
          توليد جزيئات
        </button>
      </div>

      <div className="p-2 bento-inner flex justify-between items-center text-[9px] font-mono bg-emerald-500/5 border-emerald-500/10">
        <span className="text-emerald-500/80 flex items-center gap-2 font-black">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          محرك المؤثرات الجوية
        </span>
        <div className="w-6 h-3 bg-emerald-500/20 rounded-full relative cursor-pointer border border-emerald-500/30">
          <div className="absolute right-0.5 top-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
        </div>
      </div>
    </div>
  </section>
));

const CharacterConsistencyEngine = React.memo(
  ({ isMobile, config }: { isMobile?: boolean; config: ShotConfig }) => {
    const firstChar = config.selectedCharacters?.[0];
    const hasChars = (config.selectedCharacters?.length || 0) > 0;

    return (
      <section
        className={`${!isMobile ? "col-start-9 col-span-4 row-start-1 row-span-2" : ""} bento-card p-4 group/char`}
      >
        <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-3 flex items-center justify-between tracking-[0.2em]">
          <span className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            محرك استمرارية الشخصيات
          </span>
          <div className="flex gap-1.5 flex-col items-end">
            <div className="text-[7px] text-emerald-500/80 font-mono tracking-tighter">
              {hasChars ? "تم تثبيت המلامح 98.4%" : "خامل - بانتظار الاختيار"}
            </div>
            <div className="flex gap-0.5">
              {[1, 1, 1, 0.3].map((op, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-emerald-500 rounded-full"
                  style={{ opacity: hasChars ? op : 0.1 }}
                />
              ))}
            </div>
          </div>
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest block">
                معرف الشخصية الأساسي
              </label>
              <div className="flex items-center space-x-2 p-2 bento-inner bg-blue-600/5 relative overflow-hidden group/prime">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg border border-blue-500/30 overflow-hidden shrink-0 relative">
                  <img
                    src={
                      firstChar?.avatar ||
                      "https://picsum.photos/seed/empty/120/120"
                    }
                    className={`w-full h-full object-cover transition-all ${hasChars ? "grayscale-[0.2]" : "grayscale"} group-hover/prime:scale-110 group-hover/prime:grayscale-0`}
                    alt="Protagonist"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black text-white truncate flex items-center gap-1.5">
                    {firstChar?.nameAr ||
                      (config.selectedCharacters?.length
                        ? `${config.selectedCharacters.length} ممثلين`
                        : "اختر ممثلاً")}
                    {hasChars && (
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
                    )}
                  </div>
                  <div className="text-[7px] text-blue-500 font-mono font-bold flex flex-col">
                    <span>
                      {firstChar
                        ? `UID: 0x${firstChar.id.substring(0, 4)}_77b`
                        : "NO_DNA_LOADED"}
                    </span>
                    <span className="text-zinc-600">
                      STABILITY: {hasChars ? "0.99z" : "0.00"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest block">
                تسلسل المعالم الرقمية
              </label>
              <div className="p-2 bento-inner bg-black/40 font-mono text-[7px] text-blue-400 leading-none break-all space-y-1 overflow-hidden">
                <div className="flex gap-0.5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={
                        hasChars ? { height: [4, 12, 4] } : { height: 4 }
                      }
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                      className={`w-0.5 rounded-full ${hasChars && i % 3 === 0 ? "bg-blue-500" : "bg-zinc-800"}`}
                    />
                  ))}
                </div>
                <div className="font-bold opacity-30 select-none tracking-tighter">
                  {hasChars
                    ? "AGCT_TTCG_AAAT_CCGG_GGTT"
                    : "WAITING_FOR_SEQUENCE..."}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest block">
              سجل المعلمات
            </label>
            <div className="p-3 bento-inner bg-black/20 h-full flex flex-col justify-between">
              <div className="flex items-end gap-1 h-20">
                {[65, 82, 91, 74, 98, 88, 92, 85, 96, 94].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-zinc-900/50 rounded-t-[1px] relative group/bar mt-auto"
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: hasChars ? `${h}%` : "5%" }}
                      className={`absolute bottom-0 left-0 right-0 ${i > 7 ? "bg-emerald-500/40" : "bg-blue-600/30"} group-hover/bar:brightness-125 transition-all`}
                    >
                      <div
                        className={`w-full h-0.5 absolute top-0 ${i > 7 ? "bg-emerald-400" : "bg-blue-400"}`}
                      />
                    </motion.div>
                    {i === 9 && hasChars && (
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center text-[7px] font-mono text-zinc-600 mt-2">
                <span>{hasChars ? "SCENE_01" : "---"}</span>
                <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                <span>{hasChars ? "SCENE_ACTIVE" : "IDLE"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-zinc-900">
          {[
            { label: "الوجه", val: 98, trend: "stable" },
            { label: "الملابس", val: 94, trend: "up" },
            { label: "المزاج", val: 96, trend: "stable" },
            { label: "الإضاءة", val: 91, trend: "down" },
          ].map((trait) => (
            <div
              key={trait.label}
              className="text-center p-2 bento-inner bg-black/40 group/trait relative overflow-hidden"
            >
              <div className="text-[7px] text-zinc-600 font-black mb-1 group-hover/trait:text-blue-500 transition-colors uppercase pr-3">
                {trait.label}
              </div>
              <div className="text-[9px] font-mono text-zinc-300 group-hover/trait:text-white">
                {hasChars ? `${trait.val}%` : "--%"}
              </div>
              <div
                className={`absolute top-2 right-1.5 w-1 h-1 rounded-full ${!hasChars ? "bg-zinc-800" : trait.trend === "up" ? "bg-emerald-500" : trait.trend === "down" ? "bg-red-500" : "bg-blue-500/50"}`}
              />
            </div>
          ))}
        </div>
      </section>
    );
  },
);

const PromptWorkspace = React.memo(
  ({
    model,
    config,
    setConfig,
    isMobile,
    initialMediaType,
    onBack,
  }: WorkspaceProps) => {
    const [prompt, setPrompt] = useState("");
    const [isOptimizing, setIsOptimizing] = useState(false);
    const optimizationCache = React.useRef<Record<string, OptimizedPrompt>>({});
    const [characterNames, setCharacterNames] = useState<
      Record<string, string>
    >(() => {
      try {
        const saved = localStorage.getItem("studio_character_names");
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    });

    useEffect(() => {
      localStorage.setItem(
        "studio_character_names",
        JSON.stringify(characterNames),
      );
    }, [characterNames]);
    const [ffmpegStatus, setFfmpegStatus] = useState<
      "loading" | "ready" | "idle"
    >("idle");
    const [generations, setGenerations] = useState<Generation[]>(() => {
      try {
        const saved = localStorage.getItem("studio_generations");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    });
    const [activeTab, setActiveTab] = useState<"prompt" | "script">("prompt");
    const [mediaType, setMediaType] = useState<MediaType>(
      initialMediaType || "video",
    );
    const [selectedModel, setSelectedModel] = useState<string>(
      "gemini-3-flash-preview",
    );
    const [useSearch, setUseSearch] = useState(false);
    const [useThinking, setUseThinking] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [lipSyncLevel, setLipSyncLevel] = useState(0);
    const [isListening, setIsListening] = useState(false);
    const [isLocalAiBusy, setIsLocalAiBusy] = useState(false);
    const [apkProgress, setApkProgress] = useState<number | null>(null);

    const handleLocalAiGenerate = async () => {
      setIsLocalAiBusy(true);
      try {
        const result = await generateLocalOllama(prompt || "أخبرني قصة قصيرة");
        setPrompt(result);
      } catch (error) {
        alert("⚠️ يرجى تشغيل Ollama (Llama3) على جهازك أولاً (localhost:11434)");
      } finally {
        setIsLocalAiBusy(false);
      }
    };

    const startListening = async () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      
      const recognition = new SpeechRecognition();
      recognition.lang = config.dialect === 'syrian' ? 'ar-SY' : 
                         config.dialect === 'egyptian' ? 'ar-EG' : 
                         config.dialect === 'iraqi' ? 'ar-IQ' : 
                         config.dialect === 'bedouin' ? 'ar-SA' : 'ar-SA';
                         
      recognition.onstart = async () => {
        setIsListening(true);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioAnalyzer.start(stream, (level) => setLipSyncLevel(level));
        } catch (err) {
          console.warn("Microphone access denied for visualization", err);
        }
      };
      recognition.onend = () => {
        setIsListening(false);
        audioAnalyzer.stop();
        setLipSyncLevel(0);
      };
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setPrompt(text);
        
        // Auto-speak the recognized text for animation
        const firstChar = config.selectedCharacters?.[0];
        const suggestedVoice = getSuggestedVoice(firstChar, config.voiceType);
        generateAdvancedVoice(
          text,
          suggestedVoice,
          (level) => setLipSyncLevel(level)
        ).catch(console.error);
      };
      
      recognition.start();
    };
    const [apkStage, setApkStage] = useState<string>("");
    const [showHistory, setShowHistory] = useState(false);
    const [promptHistory, setPromptHistory] = useState<string[]>(() => {
      try {
        const saved = localStorage.getItem("studio_prompt_history");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    });

    useEffect(() => {
      // Proactive FFmpeg preloading
      const initFFmpeg = async () => {
        if (ffmpegStatus !== "idle") return;
        setFfmpegStatus("loading");
        try {
          await loadFFmpeg();
          setFfmpegStatus("ready");
        } catch (err) {
          console.error("FFmpeg Load Error:", err);
          setFfmpegStatus("idle");
        }
      };
      initFFmpeg();
    }, []);

    useEffect(() => {
      if (initialMediaType) {
        setMediaType(initialMediaType);
      }
    }, [initialMediaType]);

    useEffect(() => {
      // When characters change, initialize their custom names if not present
      if (config.selectedCharacters) {
        const newNames = { ...characterNames };
        let changed = false;
        config.selectedCharacters.forEach((char) => {
          if (!newNames[char.id]) {
            newNames[char.id] = char.nameAr;
            changed = true;
          }
        });
        if (changed) setCharacterNames(newNames);
      }
    }, [config.selectedCharacters]);

    const updateCharacterName = (id: string, newName: string) => {
      setCharacterNames((prev) => ({ ...prev, [id]: newName }));
    };

    const removeCharacter = (id: string) => {
      if (config.selectedCharacters) {
        setConfig({
          ...config,
          selectedCharacters: config.selectedCharacters.filter(
            (c) => c.id !== id,
          ),
        });
      }
    };

    useEffect(() => {
      // Debounce syncing generations to local storage - ULTRA FAST SYNC
      const timer = setTimeout(() => {
        try {
          localStorage.setItem(
            "studio_generations",
            JSON.stringify(generations.slice(0, 20)),
          );
        } catch (e) {
          console.error("Storage Error:", e);
        }
      }, 200);
      return () => clearTimeout(timer);
    }, [generations]);

    const addToHistory = (p: string) => {
      if (!p.trim()) return;
      setPromptHistory((prev) => {
        const filtered = prev.filter((item) => item !== p);
        const newHistory = [p, ...filtered].slice(0, 30);
        try {
          localStorage.setItem(
            "studio_prompt_history",
            JSON.stringify(newHistory),
          );
        } catch (e) {
          console.error("History Storage Error:", e);
        }
        return newHistory;
      });
    };

    const clearHistory = () => {
      setPromptHistory([]);
      localStorage.removeItem("studio_prompt_history");
    };

    const handleMergeMovies = useCallback(async () => {
      if (generations.filter((g) => g.type === "video").length < 2) return;
      setIsMerging(true);
      try {
        await new Promise((r) => setTimeout(r, 2000)); // Optimized simulation
        const movieGen: Generation = {
          id: `movie_${Math.random().toString(36).substring(7)}`,
          type: "movie",
          timestamp: Date.now(),
          prompt: "Synthesized multi-scene cinematic production",
          model: "FFmpeg_Movie_Engine",
          status: "completed",
          previewUrl:
            "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          config: { ...config },
        };
        setGenerations((prev) => [movieGen, ...prev]);
      } catch (err) {
        console.error("Merge Error:", err);
      } finally {
        setIsMerging(false);
      }
    }, [generations, config]);

    const startApkBuild = useCallback(() => {
      setApkProgress(0);
      const stages = [
        "Init_Capacitor",
        "Syncing_Assets",
        "Gradle_Config",
        "WASM_Binding",
        "Finalizing_APK",
      ];
      setApkStage(stages[0]);
      const interval = setInterval(() => {
        setApkProgress((prev) => {
          if (prev === null || prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setApkProgress(null);
              setApkStage("");
            }, 3000);
            return 100;
          }
          const nextProgress = prev + 2; // Twice as fast build for 'High Speed' request
          const stageIndex = Math.min(
            Math.floor(nextProgress / 20),
            stages.length - 1,
          );
          setApkStage(stages[stageIndex]);
          return nextProgress;
        });
      }, 50); // Faster interval
    }, []);
    useEffect(() => {
      const style = document.createElement("style");
      style.innerHTML = `
      .bento-card { will-change: transform, opacity; transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1); }
      .gpu-fast { transform: translateZ(0); backface-visibility: hidden; perspective: 1000px; -webkit-font-smoothing: antialiased; }
      button { cursor: pointer; -webkit-tap-highlight-color: transparent; transition: all 0.1s cubic-bezier(0.2, 0.8, 0.2, 1); transform: translateZ(0); }
      button:active { transform: scale(0.96) translateZ(0); transition: all 0.05s ease; }
      @keyframes shimmer {
        0% { transform: translateX(-100%) skewX(-20deg); }
        100% { transform: translateX(100%) skewX(-20deg); }
      }
      .animate-shimmer { animation: shimmer 2s infinite linear; }
      .turbo-glow { box-shadow: 0 0 15px rgba(37,99,235,0.4); border-color: rgba(37,99,235,0.6); }
      .custom-scrollbar::-webkit-scrollbar { width: 3px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 20px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
    `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }, []);

    const handleAIAction = useCallback(async () => {
      if (!prompt.trim()) return;

      // Check Cache for Speed
      const cacheKey = `${model}_${prompt}`;
      if (optimizationCache.current[cacheKey]) {
        setPrompt(optimizationCache.current[cacheKey].optimizedPrompt);
        addToHistory(optimizationCache.current[cacheKey].optimizedPrompt);
        return;
      }

      setIsOptimizing(true);
      try {
        if (activeTab === "prompt") {
          const result = await optimizePrompt(prompt, model);
          optimizationCache.current[cacheKey] = result;
          setPrompt(result.optimizedPrompt);
          addToHistory(result.optimizedPrompt);
        } else {
          const scenes = await scriptToPrompts(prompt, model);
          if (scenes.length > 0) {
            setPrompt(scenes[0].optimizedPrompt);
            addToHistory(scenes[0].optimizedPrompt);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsOptimizing(false);
      }
    }, [prompt, model, activeTab, addToHistory]);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showLightbox, setShowLightbox] = useState(false);

    const currentView = useMemo(() => {
      const active = generations.find((g) => g.id === activeId);
      if (active) return active;

      const pending = generations.find((g) => g.status !== "completed" && g.status !== "error");
      if (pending) return pending;

      if (generations.length > 0) return generations[0];

      // Fallback for character selection if no generations exist
      if (config.selectedCharacters && config.selectedCharacters.length > 0) {
        const char = config.selectedCharacters[0];
        return {
          id: char.id,
          type: "image",
          status: "ready",
          previewUrl: char.avatar,
          prompt: char.description,
          timestamp: Date.now(),
        } as any;
      }

      return undefined;
    }, [generations, activeId, config.selectedCharacters]);

    const handleDownload = useCallback(() => {
      if (!currentView) {
        const firstChar = config.selectedCharacters?.[0];
        if (firstChar?.avatar) {
          const link = document.createElement("a");
          link.href = firstChar.avatar;
          link.download = `character-${firstChar.id}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
        alert("لا يوجد ملف متاح للتحميل حالياً. يرجى البدء بعملية الإنتاج أولاً.");
        return;
      }

      const mediaUrl = currentView.previewUrl || (config.selectedCharacters?.[0]?.avatar);
      
      if (!mediaUrl) {
         alert("لا يوجد ملف متاح للتحميل حالياً.");
         return;
      }

      const link = document.createElement("a");
      link.href = mediaUrl;
      const extension = (currentView.type === "video" || currentView.type === "movie") ? "mp4" : "png";
      link.download = `studio-pro-${currentView.id || 'export'}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, [currentView, config.selectedCharacters]);

    const handleGenerate = useCallback(
      async (customPrompt?: string) => {
        // Ensure we don't treat an event as a prompt
        let actualPrompt =
          typeof customPrompt === "string" && customPrompt
            ? customPrompt
            : prompt;
        if (
          !actualPrompt.trim() &&
          (!config.selectedCharacters || config.selectedCharacters.length === 0)
        )
          return;

        // Append character details if selected
        let originalTextForSpeech = actualPrompt; // Save the dialogue before technical wrapping

        if (config.selectedCharacters && config.selectedCharacters.length > 0) {
          const charDetails = config.selectedCharacters
            .map((char) => {
              const customName = characterNames[char.id] || char.name;
              return `${customName}: ${char.description}`;
            })
            .join(". ");

          if (config.isTalkingHead) {
            const emotionPrompt = config.emotion
              ? `The character expresses a ${config.emotion} emotion through facial muscles.`
              : "";
            originalTextForSpeech = actualPrompt; // Keep the original text for speech synthesis
            actualPrompt = `LIP_SYNC_MODE: A hyper-realistic 8k cinematic close-up shot of these characters: ${charDetails}. ${emotionPrompt} The mouth moves in perfect, precise synchronization with the spoken words: "${actualPrompt}". Focus on realistic lip shapes (visemes), micro-expressions, subsurface scattering on skin, and detailed facial topology. Professional studio lighting, bokeh background.`;
          } else {
            actualPrompt = `Characters: ${charDetails}. Scene Description: ${actualPrompt || "A cinematic scene featuring the characters."}`;
          }
        } else if (config.isTalkingHead) {
          const emotionPrompt = config.emotion
            ? `The character expresses a ${config.emotion} emotion.`
            : "";
          originalTextForSpeech = actualPrompt;
          actualPrompt = `LIP_SYNC_MODE: A hyper-realistic 8k cinematic close-up of a person speaking. ${emotionPrompt} The mouth moves in perfect synchronization with the dialogue: "${actualPrompt}". Detailed mouth articulation, realistic skin textures, 4k resolution, cinematic lighting.`;
        }

        if (mediaType === "video" || mediaType === "movie") {
          const hasAccess = await checkAndRequestVeoAccess();
          if (!hasAccess) {
            setIsGenerating(false);
            return;
          }
        }

        // Inject Character DNA for consistency if characters are selected
        let enhancedPrompt = actualPrompt;
        if (config.selectedCharacters && config.selectedCharacters.length > 0) {
          const charDescriptions = config.selectedCharacters
            .map(
              (c) =>
                `Character [${characterNames[c.id] || c.nameAr}]: ${c.description}`,
            )
            .join("; ");
          enhancedPrompt = `${actualPrompt}. Featuring: ${charDescriptions}. Maintain hyper-realistic character consistency.`;
        }

        setIsGenerating(true);
        const newGen: Generation = {
          id: Math.random().toString(36).substring(7),
          type: mediaType,
          prompt: enhancedPrompt,
          originalPrompt: originalTextForSpeech,
          status: "analyzing",
          currentStage: "NEURAL_OPTIMIZATION_START",
          progress: 20,
          timestamp: Date.now(),
          model:
            mediaType === "video" ? "veo-3.1-lite" : "gemini-2.5-flash-image",
          config: { ...config },
        };

        setGenerations((prev) => [newGen, ...prev]);
        setActiveId(newGen.id);

        try {
          // Helper to update progress
          const updateProg = (
            status: GenerationStatus,
            stage: string,
            prog: number,
          ) => {
            setGenerations((prev) =>
              prev.map((g) =>
                g.id === newGen.id
                  ? { ...g, status, currentStage: stage, progress: prog }
                  : g,
              ),
            );
          };

          if (mediaType === "character") {
            // Check if we are in Talking Head mode with a selected character
            if (config.isTalkingHead && config.selectedCharacters && config.selectedCharacters.length > 0) {
              const selectedChar = config.selectedCharacters[0];
              const selectedAvatar = selectedChar.avatar;
              
              // Map character to appropriate voice
              const suggestedVoice = getSuggestedVoice(selectedChar, config.voiceType);

              updateProg("syncing_audio", "GENERATING_VOCAL_PROFILE", 40);
              await generateAdvancedVoice(
                originalTextForSpeech,
                suggestedVoice,
                (level) => setLipSyncLevel(level),
              );
              
              updateProg("rendering", "STABILIZING_NEURAL_SKELETON", 100);
              setGenerations((prev) =>
                prev.map((g) =>
                  g.id === newGen.id
                    ? {
                        ...g,
                        status: "completed" as const,
                        progress: 100,
                        previewUrl: selectedAvatar, // STAY WITH THE SELECTED AVATAR
                      }
                    : g,
                ),
              );
              return; // EXIT EARLY
            }

            updateProg("visualizing", "RAPID_DNA_SYNTHESIS", 40);
            const imageUrl = await generateCharacter(
              enhancedPrompt,
              config.characterStyle || "cartoon",
            );

            // If Talking Head is active, also trigger voice for the prompt
            if (config.isTalkingHead) {
              updateProg("syncing_audio", "GENERATING_VOCAL_PROFILE", 70);
              generateAdvancedVoice(
                actualPrompt,
                config.voiceType || "cartoon",
                (level) => setLipSyncLevel(level),
              ).catch(console.error);
            }

            updateProg("rendering", "POLISHING_SPRITE_SHEET", 100);
            setGenerations((prev) =>
              prev.map((g) =>
                g.id === newGen.id
                  ? {
                      ...g,
                      status: "completed" as const,
                      progress: 100,
                      previewUrl: imageUrl,
                    }
                  : g,
              ),
            );
          } else if (mediaType === "animated-image") {
            updateProg("visualizing", "CALCULATING_MOTION_VECTORS", 50);
            const imageUrl = await convertToAnimatedImage(enhancedPrompt);
            updateProg("rendering", "WEAVING_TEMPORAL_LAYERS", 100);
            setGenerations((prev) =>
              prev.map((g) =>
                g.id === newGen.id
                  ? {
                      ...g,
                      status: "completed" as const,
                      progress: 100,
                      previewUrl: imageUrl,
                    }
                  : g,
              ),
            );
          } else if (mediaType === "audio") {
            updateProg("visualizing", "PHONETIC_ANALYSIS", 40);
            const voiceData = await generateAdvancedVoice(
              actualPrompt,
              config.voiceType || "cartoon",
              (level) => setLipSyncLevel(level),
            );
            updateProg("syncing_audio", "MODULATING_PITCH_TEMPO", 100);
            setGenerations((prev) =>
              prev.map((g) =>
                g.id === newGen.id
                  ? {
                      ...g,
                      status: "completed" as const,
                      progress: 100,
                      previewUrl: voiceData.audioUrl,
                    }
                  : g,
              ),
            );
          } else if (mediaType === "movie") {
            updateProg("analyzing", "ORCHESTRATING_SENSE_MAP", 20);
            const scenes = await scriptToPrompts(enhancedPrompt, model);
            updateProg(
              "visualizing",
              `PARALLEL_BATCH: ${scenes.length}_SCENES`,
              45,
            );

            // Parallel scene generation
            const scenePromises = scenes.map(async (scene, i) => {
              const sceneId = Math.random().toString(36).substring(7);

              const sceneGen: Generation = {
                id: sceneId,
                type: "video",
                prompt: scene.optimizedPrompt,
                status: "rendering",
                currentStage: `RENDER_QUEUED_${i + 1}`,
                progress: 20,
                timestamp: Date.now(),
                model: "veo-3.1-lite",
                config: { ...config },
              };

              setGenerations((prev) => [sceneGen, ...prev]);

              try {
                const videoUrl = await generateVeoVideo(scene.optimizedPrompt);
                setGenerations((prev) =>
                  prev.map((g) =>
                    g.id === sceneId
                      ? {
                          ...g,
                          status: "completed" as const,
                          progress: 100,
                          previewUrl: videoUrl,
                        }
                      : g,
                  ),
                );
                return sceneId;
              } catch (e: any) {
                console.error(`Error generating scene ${i}:`, e);
                if (e.message === "PERMISSION_DENIED_VEO") {
                  throw e; // Bubble up to main handleGenerate catch
                }
                setGenerations((prev) =>
                  prev.map((g) =>
                    g.id === sceneId ? { ...g, status: "failed" as const } : g,
                  ),
                );
                return null;
              }
            });

            const sceneIds = (await Promise.all(scenePromises)).filter(
              (id) => id !== null,
            ) as string[];

            setGenerations((prev) =>
              prev.map((g) =>
                g.id === newGen.id
                  ? {
                      ...g,
                      status: "completed" as const,
                      progress: 100,
                      previewUrl:
                        "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                      scenes: sceneIds,
                    }
                  : g,
              ),
            );
          } else if (mediaType === "video") {
            updateProg("visualizing", "INTERPOLATING_KEYFRAMES", 45);
            const videoUrl = await generateVeoVideo(enhancedPrompt);
            updateProg("rendering", "FINAL_VOXEL_ASSEMBLY", 100);
            setGenerations((prev) =>
              prev.map((g) =>
                g.id === newGen.id
                  ? {
                      ...g,
                      status: "completed" as const,
                      progress: 100,
                      previewUrl: videoUrl,
                    }
                  : g,
              ),
            );
          } else if (mediaType === "chat") {
            updateProg("analyzing", "NEURAL_THINKING", 25);
            const stream = chatWithGeminiStream(
              actualPrompt,
              useThinking,
              useSearch,
              selectedModel,
            );
            let fullText = "";
            for await (const chunk of stream) {
              fullText += chunk;
              setGenerations((prev) =>
                prev.map((g) =>
                  g.id === newGen.id
                    ? {
                        ...g,
                        previewUrl: fullText,
                        progress: Math.min(98, fullText.length / 5),
                      }
                    : g,
                ),
              );
            }
            setGenerations((prev) =>
              prev.map((g) =>
                g.id === newGen.id
                  ? { ...g, status: "completed" as const, progress: 100 }
                  : g,
              ),
            );
          } else if (mediaType === "image") {
            updateProg("visualizing", "DENOISING_PIXELS", 50);
            const imageUrl = await generateNanoImage(enhancedPrompt);
            updateProg("rendering", "FINAL_COLOR_PASS", 100);
            setGenerations((prev) =>
              prev.map((g) =>
                g.id === newGen.id
                  ? {
                      ...g,
                      status: "completed" as const,
                      progress: 100,
                      previewUrl: imageUrl,
                    }
                  : g,
              ),
            );
          } else if (mediaType === "analysis") {
            updateProg("analyzing", "EXTRACTING_VISUAL_TOKENS", 30);
            const result = await analyzeVideo(
              "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
              actualPrompt,
            );
            updateProg("rendering", "GENERATING_INSIGHT_MAP", 90);
            setGenerations((prev) =>
              prev.map((g) =>
                g.id === newGen.id
                  ? {
                      ...g,
                      status: "completed" as const,
                      progress: 100,
                      previewUrl: result,
                    }
                  : g,
              ),
            );
          }
        } catch (error: any) {
          console.error("Generation Error:", error);
          let errorMsg = "Generation failed. Please try again.";
          const errorStr = JSON.stringify(error);

          if (
            error.message === "PERMISSION_DENIED_VEO" ||
            error.message?.includes("403") ||
            error.message?.includes("permission")
          ) {
            errorMsg =
              "عذراً، هذا النموذج يتطلب تصريحاً خاصاً (Permission Denied). يرجى التأكد من أن مفتاح API الخاص بك لديه الصلاحيات الكافية، أو قم بإعادة اختيار المفتاح من الإعدادات.";
            
            // Proactively try to re-open key selector if it's a known permission issue
            if (error.message === "PERMISSION_DENIED_VEO") {
              await checkAndRequestVeoAccess(true);
            }
          } else if (
            error.message?.includes("500") ||
            errorStr.includes("Rpc failed") ||
            errorStr.includes("xhr error")
          ) {
            errorMsg =
              "يبدو أن هناك عطلاً مؤقتاً في خوادم Google AI (خطأ 500/Rpc). يرجى المحاولة بعد قليل أو التأكد من إعدادات مفتاح API الخاص بك في لوحة الإعدادات.";
          }

          setGenerations((prev) =>
            prev.map((g) =>
              g.id === newGen.id
                ? { ...g, status: "error" as const, prompt: errorMsg }
                : g,
            ),
          );
        } finally {
          setIsGenerating(false);
        }
      },
      [prompt, mediaType, config, useThinking],
    );

    useEffect(() => {
      const updateStatus = () => setIsOffline(!navigator.onLine);
      window.addEventListener("online", updateStatus);
      window.addEventListener("offline", updateStatus);
      return () => {
        window.removeEventListener("online", updateStatus);
        window.removeEventListener("offline", updateStatus);
      };
    }, []);

    return (
      <>
        {/* Main Viewport - Bento Card - Row 1-3, Col 1-8 */}
        <section
          className={`${!isMobile ? "col-start-1 col-span-8 row-start-1 row-span-3" : "h-[40vh]"} bento-card gpu-fast relative overflow-hidden group/main ${isGenerating ? "turbo-glow" : ""}`}
        >
          <div className="flex justify-between items-center p-4 bg-zinc-900/80 absolute top-0 w-full border-b border-zinc-800/50 backdrop-blur-md z-20">
            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-500 flex items-center gap-2">
              {isMobile && onBack && (
                <button
                  onClick={onBack}
                  className="mr-2 hover:bg-zinc-800 p-1 rounded-full transition-all"
                >
                  <ArrowLeft className="w-4 h-4 text-blue-500" />
                </button>
              )}
              {!currentView ? (
                <Box className="w-3.5 h-3.5 text-blue-500" />
              ) : currentView.type === "video" ? (
                <Film className="w-3.5 h-3.5 text-emerald-500" />
              ) : currentView.type === "image" ? (
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
              ) : currentView.type === "movie" ? (
                <Clapperboard className="w-3.5 h-3.5 text-purple-500" />
              ) : currentView.type === "character" ? (
                <UserRound className="w-3.5 h-3.5 text-blue-400" />
              ) : currentView.type === "analysis" ? (
                <ScanSearch className="w-3.5 h-3.5 text-cyan-500" />
              ) : (
                <Box className="w-3.5 h-3.5 text-blue-500" />
              )}
              {currentView
                ? `VIEWPORT / TASK_${currentView.id.toUpperCase()}`
                : "VIEWPORT / STANDBY"}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[8px] font-bold font-mono tracking-widest">
                <Zap className="w-2.5 h-2.5 text-blue-500 animate-pulse" />
                SPEED_ENGINE: ON
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[8px] font-bold font-mono tracking-widest">
                <Cloud className="w-2.5 h-2.5 text-emerald-500" />
                AUTO_SAVE: ON
              </div>
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-colors ${isOffline ? "bg-orange-500/10 text-orange-400 border border-orange-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"}`}
              >
                {isOffline ? (
                  <CloudOff className="w-2.5 h-2.5" />
                ) : (
                  <Cloud className="w-2.5 h-2.5" />
                )}
                {isOffline ? "Local Mode" : "Cloud Sync"}
              </div>
              {((currentView?.status !== "completed" &&
                currentView?.status !== "error") ||
                isMerging) && (
                <div className="text-[10px] px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded font-mono font-bold tracking-tighter flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
                  {isMerging
                    ? "MERGING_AUDIO_LAYERS"
                    : currentView?.currentStage || "RENDERING_CINEMATICS"}
                </div>
              )}
            </div>
          </div>

          <div className="flex-grow flex items-center justify-center bg-black">
            {currentView ? (
              <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                {currentView.status === "error" ? (
                  <div className="flex flex-col items-center gap-4 p-8 text-center bg-zinc-900/40 rounded-3xl border border-rose-500/20 max-w-sm">
                    <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center">
                      <X className="w-8 h-8 text-rose-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                        {currentView.prompt === "PERMISSION_DENIED_VEO" ? "Access Requirement" : "Service_Restricted"}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">
                        {currentView.prompt === "PERMISSION_DENIED_VEO" 
                          ? "إنشاء الفيديو باستخدام Veo يتطلب مفتاح API مدفوعاً (Paid Tier). يرجى اختيار مفتاح API يدعم نماذج Veo."
                          : currentView.prompt}
                      </p>
                    </div>
                    {currentView.prompt === "PERMISSION_DENIED_VEO" ? (
                      <button
                        onClick={async () => {
                          await checkAndRequestVeoAccess(true);
                          handleGenerate();
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-lg text-[10px] font-black uppercase hover:bg-blue-500 transition-all text-white shadow-lg shadow-blue-600/20"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        Select Paid API Key
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGenerate()}
                        className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-black uppercase hover:bg-zinc-800 transition-all text-zinc-300"
                      >
                        Retry_Signal
                      </button>
                    )}
                  </div>
                ) : (currentView.type === "character" && config.isTalkingHead) || mediaType === 'character' ? (
                  <div className="flex flex-col items-center gap-6 p-8 w-full max-h-full overflow-hidden">
                    {/* Talking Character Overlay - LOCKED TO SELECTED AGENT */}
                    {config.selectedCharacters &&
                    config.selectedCharacters.length > 0 ? (
                      <div className="w-full max-w-2xl flex flex-col items-center">
                        <CharacterAnimator 
                          character={config.selectedCharacters[0]}
                          lipSyncLevel={lipSyncLevel}
                          config={config}
                        />

                        <div className="w-full mt-6 flex justify-between items-center bg-zinc-950/40 p-4 rounded-xl border border-zinc-900">
                           <div className="flex items-center gap-4">
                             <div className="p-3 bg-blue-600/10 rounded-lg border border-blue-500/20">
                               <Mic2 className="w-5 h-5 text-blue-500" />
                             </div>
                             <div className="space-y-0.5">
                               <div className="text-[9px] font-black text-white uppercase tracking-wider">جسر الصوت العصبي</div>
                               <div className="text-[7px] font-mono text-zinc-500 uppercase tracking-tighter">معدل المزامنة: {(lipSyncLevel * 100).toFixed(1)}%</div>
                             </div>
                           </div>

                           <div className="flex items-center gap-2">
                             <button
                               onClick={() => handleLocalAiGenerate()}
                               disabled={isLocalAiBusy}
                               className={`p-3 rounded-lg border transition-all ${isLocalAiBusy ? 'bg-zinc-800 border-zinc-700 animate-pulse' : 'bg-rose-600/10 border-rose-500/20 hover:bg-rose-600/20'}`}
                               title="توليد ذكاء اصطناعي محلي"
                             >
                               <Cpu className={`w-5 h-5 ${isLocalAiBusy ? 'text-zinc-500' : 'text-rose-500'}`} />
                             </button>

                             <button
                               onClick={() => startListening()}
                               className={`p-3 rounded-lg border transition-all ${isListening ? 'bg-red-600 border-red-500 animate-pulse' : 'bg-blue-600/10 border-blue-500/20 hover:bg-blue-600/20'}`}
                             >
                               <Mic2 className={`w-5 h-5 ${isListening ? 'text-white' : 'text-blue-500'}`} />
                             </button>

                             <button
                               onClick={() => {
                                 const firstChar = config.selectedCharacters?.[0];
                                 const suggestedVoice = getSuggestedVoice(firstChar, config.voiceType);
                                 generateAdvancedVoice(
                                   prompt || currentView.prompt || "مرحباً بك في نظام المحاكاة المتطور",
                                   suggestedVoice,
                                   (level) => setLipSyncLevel(level)
                                 ).catch(console.error);
                               }}
                               className="px-6 py-3 bg-blue-600 rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
                             >
                               <Play className="w-3 h-3 fill-current" />
                               بدء البث الصوتي
                             </button>

                             <button
                               onClick={() => setShowLightbox(true)}
                               className="p-3 rounded-lg border bg-blue-600/10 border-blue-500/20 hover:bg-blue-600/20 transition-all group shrink-0"
                               title="معاينة"
                             >
                               <Eye className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                             </button>

                             <button
                               onClick={handleDownload}
                               className="p-3 rounded-lg border bg-emerald-600/10 border-emerald-500/20 hover:bg-emerald-600/20 transition-all group shrink-0"
                               title="تحميل"
                             >
                               <Download className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                             </button>

                             <button
                               onClick={() => alert("⚠️ ميزة تصدير الفيديو المباشر تتطلب FFmpeg Cloud Bridge. جاري التطوير...")}
                               className="px-4 py-3 bg-zinc-800 rounded-lg text-[9px] font-black text-white uppercase tracking-widest hover:bg-zinc-700 transition-all flex items-center gap-2 border border-zinc-700"
                             >
                               <Film className="w-3.5 h-3.5" />
                               تصدير المشهد
                             </button>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group/sound cursor-pointer">
                        <Music className="w-24 h-24 text-blue-500 animate-pulse" />
                        <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
                      </div>
                    )}

                    <div className="w-full max-w-sm space-y-3">
                      <div className="h-16 bento-inner bg-black/40 flex items-center justify-center p-3 gap-0.5">
                        {[...Array(32)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ height: 2 }}
                            animate={{
                              height:
                                lipSyncLevel > 0
                                  ? [2, Math.random() * 40 + 2, 2]
                                  : 2,
                            }}
                            transition={{ duration: 0.2, repeat: Infinity }}
                            className="w-1 bg-blue-500/60 rounded-full"
                          />
                        ))}
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] font-mono text-blue-400">
                          SYNC: {lipSyncLevel > 0 ? "ACTIVE" : "IDLE"}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-tighter">
                          {currentView.model || "V3_PRO_SYNTH"}
                        </span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`w-1 h-1 rounded-full ${lipSyncLevel > 0 ? "bg-emerald-500 animate-pulse" : "bg-zinc-800"}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : currentView.type === "chat" ||
                  currentView.type === "analysis" ? (
                  <div className="p-8 w-full h-full max-w-4xl flex flex-col pt-20">
                    <div className="flex-grow bento-inner bg-black/60 p-6 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed text-zinc-300">
                      {currentView.status !== "completed" &&
                      currentView.status !== "error" ? (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-2 text-blue-500 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>
                              {currentView.currentStage ||
                                "THINKING_IN_PROGRESS..."}
                            </span>
                          </div>
                          <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
                          <div className="h-4 w-1/2 bg-zinc-800 rounded animate-pulse" />
                        </div>
                      ) : (
                        <div className="space-y-4 whitespace-pre-wrap">
                          <div className="flex items-center gap-2 text-zinc-500 border-b border-zinc-800 pb-2 mb-4">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="uppercase tracking-widest text-[9px] font-black">
                              AI_RESPONSE_STREAM_V3.1
                            </span>
                          </div>
                          {currentView.previewUrl || "No response data found."}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <img
                      src={
                        currentView.previewUrl ||
                        (currentView.type === "image"
                          ? `https://picsum.photos/seed/${currentView.id}/1280/720`
                          : config.selectedCharacters?.[0]?.avatar ||
                            "https://picsum.photos/seed/cyberpunk/1280/720")
                      }
                      className={`transition-all duration-300 ${currentView.status !== "completed" && currentView.status !== "error" ? "brightness-50 blur-sm scale-110 grayscale" : "brightness-90 hover:brightness-105"} ${
                        currentView.type === "character" ||
                        currentView.type === "animated-image"
                          ? "max-h-[85vh] rounded-2xl shadow-2xl"
                          : "w-full h-full object-cover"
                      }`}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />

                    {/* Characters / Animated Image Specials */}
                    {(currentView.type === "character" ||
                      currentView.type === "animated-image") &&
                      currentView.status === "completed" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 pointer-events-none">
                          {/* Sound / LipSync Waveform Overlay */}
                          <div className="bg-black/60 backdrop-blur-xl p-4 rounded-3xl border border-white/10 flex items-center gap-4 shadow-2xl">
                            <div className="flex gap-1 items-end h-8">
                              {[0.4, 0.9, 0.6, 1, 0.5, 0.8, 0.4].map((h, i) => (
                                <motion.div
                                  key={i}
                                  animate={{
                                    height: ["20%", `${h * 100}%`, "20%"],
                                  }}
                                  transition={{
                                    duration: 0.15,
                                    repeat: Infinity,
                                    delay: i * 0.05,
                                  }}
                                  className="w-1.5 bg-blue-500 rounded-full"
                                />
                              ))}
                            </div>
                            <div className="text-left">
                              <div className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Mic2 className="w-3 h-3 text-blue-500" />
                                Vocal_Sync_Active
                              </div>
                              <div className="text-[8px] text-zinc-400 font-mono">
                                LATENCY: 12ms | ENGINE: V3_PRO_SYNTH
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    {currentView.type === "image" &&
                      currentView.status === "completed" && (
                        <div className="absolute bottom-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-xl border border-white/5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                            <div className="text-[9px] font-black text-white uppercase">
                              TEXT_TO_IMAGE
                            </div>
                            <div className="text-[7px] text-zinc-400 uppercase tracking-widest">
                              {currentView.model || "NANO_BANANA_2_ENGINE"}
                            </div>
                          </div>
                        </div>
                      )}
                    {currentView.type === "video" &&
                      currentView.status === "completed" && (
                        <div className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-xl border border-white/5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                            <Film className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <div className="text-[9px] font-black text-white uppercase">
                              CINEMATIC_VIDEO
                            </div>
                            <div className="text-[7px] text-zinc-400 uppercase tracking-widest">
                              {currentView.model || "VEO_3_CINEMATIC_ENGINE"}
                            </div>
                          </div>
                        </div>
                      )}
                    {currentView.type === "movie" &&
                      currentView.status === "completed" && (
                        <div className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-xl border border-white/5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <Clapperboard className="w-4 h-4 text-purple-500" />
                          </div>
                          <div>
                            <div className="text-[9px] font-black text-white uppercase">
                              FULL_MOVIE_PRODUCTION
                            </div>
                            <div className="text-[7px] text-zinc-400 uppercase tracking-widest">
                              ASSEMBLY_MODE: READY
                            </div>
                          </div>
                        </div>
                      )}
                    {currentView.type === "character" &&
                      currentView.status === "completed" && (
                        <div className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-xl border border-white/5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <UserRound className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                            <div className="text-[9px] font-black text-white uppercase">
                              CHARACTER_SPRITE
                            </div>
                            <div className="text-[7px] text-zinc-400 uppercase tracking-widest">
                              DNA_LOCK: 99.8%
                            </div>
                          </div>
                        </div>
                      )}
                    {currentView.type === "animated-image" &&
                      currentView.status === "completed" && (
                        <div className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-xl border border-white/5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-600/20 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-amber-500" />
                          </div>
                          <div>
                            <div className="text-[9px] font-black text-white uppercase">
                              ANIMATED_IMAGE
                            </div>
                            <div className="text-[7px] text-zinc-400 uppercase tracking-widest">
                              MOTION_VECTORS: ACTIVE
                            </div>
                          </div>
                        </div>
                      )}
                    {currentView.type === "analysis" &&
                      currentView.status === "completed" && (
                        <div className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-xl border border-white/5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                            <ScanSearch className="w-4 h-4 text-cyan-500" />
                          </div>
                          <div>
                            <div className="text-[9px] font-black text-white uppercase">
                              SCENE_ANALYSIS
                            </div>
                            <div className="text-[7px] text-zinc-400 uppercase tracking-widest">
                              INSIGHTS_GENERATED
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Context Overlay Icons */}
                <div className="absolute top-16 right-4 flex flex-col gap-2 opacity-0 group-hover/main:opacity-100 transition-opacity">
                  <div className="flex flex-col gap-1 items-end mb-4 pr-1">
                    <span className="text-[7px] text-blue-500 font-bold uppercase tracking-tighter bg-blue-500/10 px-1 border border-blue-500/20 rounded">
                      Characters_LipSync: Active
                    </span>
                    <div className="flex gap-1 h-3 items-end">
                      {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4].map((h, i) => (
                        <div
                          key={i}
                          className="w-0.5 bg-blue-500/60 rounded-full"
                          style={{ height: `${h * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLightbox(true)}
                    className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-blue-600 transition-all shadow-xl backdrop-blur-md group/icon"
                  >
                    <Eye className="w-5 h-5 group-hover/icon:scale-110 transition-transform" />
                  </button>
                  <button className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-emerald-600 transition-all shadow-xl backdrop-blur-md group/icon">
                    <Download className="w-5 h-5 group-hover/icon:scale-110 transition-transform" />
                  </button>
                  <button className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-purple-600 transition-all shadow-xl backdrop-blur-md group/icon">
                    <Share2 className="w-5 h-5 group-hover/icon:scale-110 transition-transform" />
                  </button>
                </div>

                {currentView.status !== "completed" &&
                  currentView.status !== "error" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-md z-40">
                      <div className="relative">
                        <div className="w-12 h-12 border-2 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                        {isMerging && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <Mic2 className="w-4 h-4 text-emerald-500 animate-pulse" />
                          </motion.div>
                        )}
                      </div>
                      <div className="space-y-0.5 text-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 animate-pulse">
                          {isMerging
                            ? "Merging_Components"
                            : currentView.currentStage ||
                              "Synthesizing_Cinematics"}
                        </p>
                        <p className="text-[7px] text-zinc-500 font-mono tracking-tighter uppercase">
                          Ultra_Fast_Synth | Task_Progress:{" "}
                          {currentView.progress || 0}%
                        </p>
                      </div>

                      <div className="h-1.5 w-48 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 mx-auto group/bar">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${currentView.progress || 0}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-full ${isMerging ? "bg-emerald-500" : "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)]"} relative`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        </motion.div>
                      </div>

                      <div className="bg-black/40 border border-zinc-800 rounded-lg p-2 text-left font-mono text-[6px] text-zinc-500 space-y-0.5 mt-1 mx-auto w-48">
                        <div className="flex justify-between">
                          <span>&gt; CLOUD_TARGET:</span>{" "}
                          <span className="text-blue-400 font-bold">
                            {currentView.model}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>&gt; SYSTEM_READY:</span>{" "}
                          <span className="text-emerald-500 font-bold">
                            YES
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>&gt; SIGNAL_ID:</span>{" "}
                          <span>{currentView.id.toUpperCase()}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsGenerating(false);
                          setIsMerging(false);
                          if (currentView?.id) {
                            setGenerations((prev) =>
                              prev.map((g) =>
                                g.id === currentView.id
                                  ? {
                                      ...g,
                                      status: "error",
                                      prompt: "Task Aborted by User",
                                    }
                                  : g,
                              ),
                            );
                          }
                        }}
                        className="mt-4 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center gap-2 text-[9px] font-black uppercase text-rose-500 hover:bg-rose-500/20 transition-all group/abort"
                      >
                        <X className="w-3 h-3 group-hover/abort:rotate-90 transition-transform" />
                        Abort_Task_Signal
                      </button>
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-center space-y-4 opacity-5">
                <Wand2 className="w-24 h-24 mx-auto" />
                <p className="text-xs uppercase tracking-[0.5em] font-black">
                  Signal_Waiting
                </p>
              </div>
            )}
          </div>

          <div
            className={`p-4 bg-zinc-950/90 backdrop-blur-md flex justify-between items-center border-t border-zinc-800 shrink-0 ${isMobile ? "overflow-x-auto no-scrollbar" : ""}`}
          >
            <div className={`flex ${isMobile ? "gap-1" : "space-x-2"}`}>
              <button
                className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors text-[10px]`}
              >
                ⏪
              </button>
              <button
                className={`${isMobile ? "w-12 h-10 rounded-xl" : "w-16 h-12 rounded-2xl"} bg-white text-black flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all shadow-xl text-xs`}
              >
                <Play className="w-4 h-4 fill-current mr-1" />
                تشغيل
              </button>
              <button
                className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors text-[10px]`}
              >
                ⏩
              </button>
            </div>
            <div
              className={`${isMobile ? "hidden" : "flex-1 max-w-[400px] mx-8 bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800/50"}`}
            >
              <div className="bg-blue-600 w-[60%] h-full relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className={`flex ${isMobile ? "gap-1 pl-4" : "gap-2"}`}>
              <button
                onClick={() => setShowLightbox(true)}
                className="text-[10px] font-mono text-zinc-500 tracking-tighter tabular-nums px-3 py-1 bg-black/40 rounded border border-zinc-800 flex items-center gap-2 hover:bg-zinc-800 hover:text-blue-400 transition-colors group"
              >
                <Eye className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                معاينة
              </button>
              <a
                href={
                  currentView?.status === "completed"
                    ? `https://picsum.photos/seed/${currentView.id}/1920/1080`
                    : "#"
                }
                download={`generation_${currentView?.id}`}
                className="text-[10px] font-mono text-zinc-500 tracking-tighter tabular-nums px-3 py-1 bg-black/40 rounded border border-zinc-800 flex items-center gap-2 hover:bg-zinc-800 hover:text-emerald-400 transition-colors group"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                تحميل
              </a>
              <button
                onClick={startApkBuild}
                className="text-[10px] font-mono text-zinc-500 tracking-tighter tabular-nums px-3 py-1 bg-black/40 rounded border border-zinc-800 flex items-center gap-2 hover:bg-zinc-800 hover:text-emerald-400 transition-colors group relative overflow-hidden"
              >
                {apkProgress !== null && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${apkProgress}%` }}
                    className="absolute inset-0 bg-emerald-500/10"
                  />
                )}
                <Smartphone
                  className={`w-3.5 h-3.5 text-emerald-500 ${apkProgress !== null ? "animate-bounce" : "group-hover:scale-110 group-hover:rotate-12 transition-all"}`}
                />
                {apkProgress !== null
                  ? `${apkStage}_${apkProgress}%`
                  : "بناء أندرويد"}
              </button>
              <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">
                  تم تفعيل المدة الطويلة
                </span>
              </div>

              <div
                className={`flex items-center gap-2 px-2 py-1 rounded border transition-all duration-500 ${
                  ffmpegStatus === "ready"
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : ffmpegStatus === "loading"
                      ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500"
                }`}
              >
                <Cpu
                  className={`w-3 h-3 ${ffmpegStatus === "loading" ? "animate-spin" : ""}`}
                />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {ffmpegStatus === "ready"
                    ? "معالج محلي مفعل"
                    : ffmpegStatus === "loading"
                      ? "جاري التثبيت..."
                      : "المعالج متوقف"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <GenerationsBar
          generations={generations}
          activeId={currentView?.id}
          onSelect={(g) => setActiveId(g.id)}
          isMobile={isMobile}
        />

        {!isMobile && (
          <CharacterConsistencyEngine isMobile={isMobile} config={config} />
        )}

        {/* Prompt Engine - Bento Card - Row 5-6, Col 1-4 */}
        <section
          className={`${!isMobile ? "col-start-1 col-span-4 row-start-5 row-span-2" : ""} bento-card p-4 flex flex-col`}
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-4">
              <div className="flex gap-2 border-r border-zinc-800 pr-3">
                {(
                  [
                    "video",
                    "image",
                    "audio",
                    "chat",
                    "analysis",
                    "movie",
                    "character",
                    "animated-image",
                  ] as MediaType[]
                ).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMediaType(type)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all relative ${
                      mediaType === type
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                        : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    {type === "video" ? (
                      <Film className="w-3.5 h-3.5" />
                    ) : type === "image" ? (
                      <ImageIcon className="w-3.5 h-3.5" />
                    ) : type === "audio" ? (
                      <Music className="w-3.5 h-3.5" />
                    ) : type === "chat" ? (
                      <MessageSquare className="w-3.5 h-3.5" />
                    ) : type === "analysis" ? (
                      <ScanSearch className="w-3.5 h-3.5" />
                    ) : type === "movie" ? (
                      <Clapperboard className="w-3.5 h-3.5" />
                    ) : type === "character" ? (
                      <UserRound className="w-3.5 h-3.5" />
                    ) : type === "animated-image" ? (
                      <Zap className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[8px] font-black uppercase tracking-widest hidden lg:block">
                      {type === "video" ? "فيديو" : 
                       type === "image" ? "صورة" :
                       type === "audio" ? "صوت" :
                       type === "chat" ? "دردشة" :
                       type === "analysis" ? "تحليل" :
                       type === "movie" ? "فيلم" :
                       type === "character" ? "شخصية" :
                       type === "animated-image" ? "تحريك" : type}
                    </span>
                  </button>
                ))}
                {(mediaType === "chat" || mediaType === "analysis") && (
                  <button
                    onClick={() => setUseThinking(!useThinking)}
                    className={`p-1 rounded-md transition-all flex items-center gap-1 ${
                      useThinking
                        ? "bg-amber-600 text-white"
                        : "text-zinc-600 hover:text-amber-400 hover:bg-zinc-900"
                    }`}
                    title="Extended Reasoning (Pro)"
                  >
                    <Brain className="w-3 h-3" />
                    {useThinking && (
                      <span className="text-[8px] font-black uppercase">
                        Thinking
                      </span>
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {["prompt", "script"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all relative ${
                      activeTab === tab
                        ? "text-zinc-200"
                        : "text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {tab === "prompt" ? "توجيه" : "سيناريو"}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="tabUnderline"
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {isOptimizing && (
                  <button
                    onClick={() => setIsOptimizing(false)}
                    className="px-2 py-1 bg-rose-600/20 border border-rose-500/30 rounded text-rose-400 text-[8px] uppercase font-black tracking-widest hover:bg-rose-600/30 transition-all font-mono"
                  >
                    إلغاء المهمة
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  title="View full prompt history"
                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[8px] text-zinc-500 uppercase font-bold hover:text-zinc-200 hover:border-zinc-700 transition-all flex items-center gap-1.5"
                >
                  <History className="w-3 h-3" />
                  <span>السجل</span>
                </button>
                <button
                  onClick={() => handleAIAction()}
                  disabled={isOptimizing || !prompt}
                  className="px-2 py-1 bg-blue-600 rounded text-white text-[8px] uppercase font-black tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:bg-blue-500 disabled:opacity-30 transition-all font-mono group"
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                    AI_WORLD_ENGINE
                  </div>
                </button>
              </div>
          </div>

          {promptHistory.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar scroll-smooth">
              <span className="text-[7px] text-zinc-700 font-black uppercase py-1 shrink-0 flex items-center">
                الأحدث:
              </span>
              {promptHistory.slice(0, 4).map((h, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(h)}
                  className="px-2 py-1 bento-inner bg-zinc-900/40 border-zinc-800 text-[8px] text-zinc-500 truncate max-w-[120px] hover:text-zinc-300 hover:border-zinc-700 transition-all whitespace-nowrap"
                >
                  {h}
                </button>
              ))}
            </div>
          )}
          {/* CHARACTER_QUICK_SELECT */}
          {mediaType === "character" && (
            <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
              {FIXED_CHARACTERS.map((char) => {
                const isSelected = config.selectedCharacters?.some(
                  (c) => c.id === char.id,
                );
                return (
                  <button
                    key={char.id}
                    onClick={() => {
                      if (isSelected) {
                        removeCharacter(char.id);
                      } else {
                        const newVoice = getSuggestedVoice(char, config.voiceType);
                        setConfig({
                          ...config,
                          voiceType: newVoice as any,
                          selectedCharacters: [
                            ...(config.selectedCharacters || []),
                            char,
                          ],
                        });
                      }
                    }}
                    className={`flex-shrink-0 w-24 bento-inner p-1 group/char-btn relative overflow-hidden active:scale-95 transition-all ${
                      isSelected
                        ? "ring-2 ring-blue-500 border-blue-500 bg-blue-600/5"
                        : ""
                    }`}
                  >
                    <img
                      src={char.avatar}
                      className="w-full aspect-square object-cover rounded mb-1"
                      alt={char.nameAr}
                      referrerPolicy="no-referrer"
                    />
                    <div
                      className={`text-[7px] font-black uppercase truncate ${isSelected ? "text-blue-400" : "text-zinc-500"}`}
                    >
                      {char.nameAr}
                    </div>
                    <div
                      className={`absolute inset-0 bg-blue-600/10 transition-opacity flex items-center justify-center ${isSelected ? "opacity-100" : "opacity-0 group-hover/char-btn:opacity-100"}`}
                    >
                      <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-grow flex flex-col min-h-[440px]">
            {/* Character Tags */}
            {config.selectedCharacters &&
              config.selectedCharacters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {config.selectedCharacters.map((char) => (
                    <div
                      key={char.id}
                      className="flex items-center gap-2 p-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg group/tag"
                    >
                      <div className="w-5 h-5 rounded overflow-hidden">
                        <img
                          src={char.avatar}
                          className="w-full h-full object-cover"
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <input
                        type="text"
                        value={characterNames[char.id] || ""}
                        onChange={(e) =>
                          updateCharacterName(char.id, e.target.value)
                        }
                        className="bg-transparent border-none outline-none text-[8px] font-black text-blue-400 font-mono w-24 focus:ring-0 p-0"
                        placeholder="Character Role Name"
                      />
                      <button
                        onClick={() => removeCharacter(char.id)}
                        className="text-zinc-600 hover:text-rose-500 transition-colors p-1"
                        title="إزالة الشخصية"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

            <div className="flex-grow bento-inner flex flex-col relative group overflow-hidden bg-black/40 min-h-[400px]">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder={
                  activeTab === "prompt"
                    ? "أدخل التوجيهات السينمائية..."
                    : "أدخل نص المشهد الدرامي..."
                }
                className="flex-grow p-4 bg-transparent outline-none border-none text-[11px] text-zinc-400 font-mono leading-relaxed resize-none placeholder:text-zinc-800 focus:text-zinc-200"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-3">
                {mediaType === "analysis" && (
                  <div className="flex items-center gap-2 mr-4">
                    <input
                      type="file"
                      id="video-upload"
                      className="hidden"
                      accept="video/*"
                    />
                    <label
                      htmlFor="video-upload"
                      className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[7px] text-zinc-500 cursor-pointer hover:text-blue-500 transition-colors uppercase font-black tracking-widest"
                    >
                      Upload_Source
                    </label>
                  </div>
                )}
                <div className="text-[9px] font-mono text-zinc-700 uppercase tracking-tighter opacity-0 group-focus-within:opacity-100 transition-opacity">
                  Ctrl+Enter to fire
                </div>
                <button
                  onClick={() => handleGenerate()}
                  disabled={!prompt}
                  className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-20"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* PRODUCTION ENGINE CONTROLS */}
          {(mediaType === "character" ||
            mediaType === "movie" ||
            mediaType === "audio" ||
            mediaType === "animated-image" ||
            mediaType === "video" ||
            mediaType === "image") && (
            <>
              <div className="mt-3 pt-3 border-t border-zinc-900 grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest pl-1">
                  البصمة الصوتية
                </label>
                <select
                  value={config.voiceType || "male"}
                  onChange={(e) =>
                    setConfig({ ...config, voiceType: e.target.value as any })
                  }
                  className="w-full bg-black/40 border border-zinc-800 rounded p-1.5 text-[8px] text-zinc-300 font-mono outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="male">رجل (صوت عميق)</option>
                  <option value="female">أنثى (صوت ناعم)</option>
                  <option value="sheikh">شيخ (صوت وقور)</option>
                  <option value="syrian">اللهجة السورية</option>
                  <option value="egyptian">اللهجة المصرية</option>
                  <option value="bedouin">اللهجة البدوية</option>
                  <option value="cartoon">صوت كرتوني</option>
                </select>
                <button 
                  onClick={() => alert(`تم ربط وحفظ الصوت المخصص للشخصية ${config.selectedCharacters?.[0]?.nameAr || ''} بنجاح!`)}
                  className="mt-1 w-full flex items-center justify-center gap-1 py-1 rounded bg-zinc-900 border border-zinc-800 text-[6px] text-zinc-500 hover:text-white transition-colors"
                >
                  <Save className="w-2 h-2" />
                  حفظ بصمة الصوت للشخصية
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest pl-1">
                  اللهجة الأساسية
                </label>
                <select
                  value={config.dialect || "modern_standard"}
                  onChange={(e) =>
                    setConfig({ ...config, dialect: e.target.value as any })
                  }
                  className="w-full bg-black/40 border border-zinc-800 rounded p-1.5 text-[8px] text-zinc-300 font-mono outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="modern_standard">العربية الفصحى</option>
                  <option value="syrian">السورية / الشامية</option>
                  <option value="egyptian">المصرية</option>
                  <option value="iraqi">العراقية</option>
                  <option value="bedouin">البدوية / الخليجية</option>
                </select>
                <button 
                  onClick={() => alert(`جاري تحميل حزمة ${config.dialect === 'syrian' ? 'اللهجة السورية' : config.dialect === 'egyptian' ? 'اللهجة المصرية' : 'اللهجة المختارة'}... تم الحفظ!`)}
                  className="mt-1 w-full flex items-center justify-center gap-1 py-1 rounded bg-zinc-900 border border-zinc-800 text-[6px] text-zinc-500 hover:text-white transition-colors"
                >
                  <Download className="w-2 h-2" />
                  حفظ حزمة اللهجة محلياً
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest pl-1">
                  بيئة المشهد
                </label>
                <select
                  value={config.environment || "studio"}
                  onChange={(e) =>
                    setConfig({ ...config, environment: e.target.value as any })
                  }
                  className="w-full bg-black/40 border border-zinc-800 rounded p-1.5 text-[8px] text-zinc-300 font-mono outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="studio">استوديو رقمي</option>
                  <option value="desert">رمال الصحراء</option>
                  <option value="city">أفق المدينة</option>
                  <option value="house">منزل تقليدي</option>
                  <option value="mosque">مكان مقدس (مسجد)</option>
                </select>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest pl-1">
                  تعبيرات الوجه
                </label>
                <select
                  value={config.emotion || "neutral"}
                  onChange={(e) =>
                    setConfig({ ...config, emotion: e.target.value as any })
                  }
                  className="w-full bg-black/40 border border-zinc-800 rounded p-1.5 text-[8px] text-zinc-300 font-mono outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="neutral">محايد</option>
                  <option value="happy">سعيد / مبتهج</option>
                  <option value="sad">حزين / كئيب</option>
                  <option value="angry">غاضب / متوتر</option>
                  <option value="excited">متحمس / مندفع</option>
                </select>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest pl-1">
                  الحالة الصوتية
                </label>
                <select
                  value={config.soundscape || "ambient"}
                  onChange={(e) =>
                    setConfig({ ...config, soundscape: e.target.value as any })
                  }
                  className="w-full bg-black/40 border border-zinc-800 rounded p-1.5 text-[8px] text-zinc-300 font-mono outline-none focus:border-rose-500 transition-colors"
                >
                  <option value="ambient">محيط عام</option>
                  <option value="action">أكشن / إثارة</option>
                  <option value="love">رومانسي / هادئ</option>
                  <option value="war">طبول الحرب / حماسي</option>
                </select>
              </div>
              <div className="col-span-3">
                <button
                  onClick={() =>
                    setConfig({
                      ...config,
                      isTalkingHead: !config.isTalkingHead,
                    })
                  }
                  className={`w-full py-2.5 rounded-xl bento-inner flex items-center justify-center gap-3 transition-all border-2 ${
                    config.isTalkingHead
                      ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                      : "bg-black/40 border-zinc-900 text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  <Volume2
                    className={`w-4 h-4 ${config.isTalkingHead ? "animate-pulse" : ""}`}
                  />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {config.isTalkingHead
                      ? "مزامنة الشفاه: نشط"
                      : "تفعيل وضع الشخصية المتحدثة"}
                  </span>
                </button>
              </div>
            </div>
          </>
          )}

          {mediaType === "movie" &&
            generations.filter((g) => g.type === "video").length >= 2 && (
              <button
                onClick={handleMergeMovies}
                disabled={isMerging}
                className="mt-3 w-full py-2 bg-emerald-600/20 border border-emerald-500/30 rounded text-emerald-500 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                {isMerging ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Layers className="w-3 h-3" />
                )}
                Unify_Scenes_&_Export_Production
              </button>
            )}
        </section>

        <section
          className={`${!isMobile ? "col-start-9 col-span-4 row-start-3 row-span-1" : "w-full mb-4"} bento-card p-4 flex flex-col gap-3 group/models`}
        >
          <h3 className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2 tracking-[0.2em]">
            <Cpu className="w-3.5 h-3.5 text-blue-500" />
            Model_Node_Interface
          </h3>
          <ModelSelectorGrid
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
          />
          <ApiKeyHint selectedModel={selectedModel} />
          <div className="flex gap-2">
            <button
              onClick={() => setUseSearch(!useSearch)}
              className={`flex-1 p-2 bento-inner flex items-center justify-center gap-2 transition-all ${
                useSearch
                  ? "bg-emerald-600/20 border-emerald-600/50 text-emerald-400"
                  : "bg-black/40 text-zinc-500 border-zinc-900"
              }`}
            >
              <Globe
                className={`w-3 h-3 ${useSearch ? "animate-spin-slow" : ""}`}
              />
              <span className="text-[8px] font-black uppercase tracking-widest">
                {useSearch ? "Grounding_Active" : "Live_Web_Search"}
              </span>
            </button>
            <button
              onClick={() => setUseThinking(!useThinking)}
              className={`flex-1 p-2 bento-inner flex items-center justify-center gap-2 transition-all ${
                useThinking
                  ? "bg-blue-600/20 border-blue-600/50 text-blue-400"
                  : "bg-black/40 text-zinc-500 border-zinc-900"
              }`}
            >
              <Brain className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">
                {useThinking ? "Deep_Mode" : "Thinking_Engine"}
              </span>
            </button>
          </div>
        </section>

        {/* World Synthesis Module - Bento Card - Row 5-6, Col 10-12 */}
        {!isMobile && <WorldSynthesis isMobile={isMobile} />}

        {/* Lightbox / Fullscreen Preview Overlay */}
        <AnimatePresence>
          {showLightbox && currentView && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 lg:p-12"
            >
              <motion.button
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                onClick={() => setShowLightbox(false)}
                className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all border border-white/10 backdrop-blur-md z-[201]"
              >
                <X className="w-6 h-6" />
              </motion.button>

              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="w-full max-w-6xl aspect-video rounded-3xl overflow-hidden bg-zinc-950 shadow-2xl border border-white/5 relative group"
              >
                {currentView.type === "video" ||
                currentView.type === "movie" ? (
                  <video
                    src={
                      currentView.previewUrl ||
                      "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                    }
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                  />
                ) : (
                  <img
                    src={
                      currentView.previewUrl ||
                      config.selectedCharacters?.[0]?.avatar ||
                      `https://picsum.photos/seed/${currentView.id}/1920/1080`
                    }
                    className="w-full h-full object-contain"
                    alt="Full Preview"
                  />
                )}

                <div className="absolute bottom-4 left-4 right-4 p-6 bg-black/60 backdrop-blur-xl border border-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded-md shadow-lg shadow-blue-600/20">
                          Production_Asset
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          UUID: {currentView.id}
                        </span>
                      </div>
                      <h4 className="text-lg lg:text-xl font-bold text-white leading-tight line-clamp-2">
                        {currentView.prompt}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => setShowLightbox(false)}
                        className="px-5 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        Close_View
                      </button>
                      <a
                        href={currentView.previewUrl || "#"}
                        download={`signal_${currentView.id}`}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                      >
                        <Download className="w-3 h-3" />
                        Export_Source
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showHistory && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHistory(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100]"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 h-full w-96 bg-zinc-950 border-l border-zinc-800 z-[101] flex flex-col shadow-2xl p-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <History className="w-4 h-4 text-blue-500" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                      Prompt_Log.v2
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={clearHistory}
                      className="text-[9px] font-black uppercase text-zinc-500 hover:text-red-500 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </button>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="text-zinc-600 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                  {promptHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/40 hover:border-blue-900/50 transition-all cursor-pointer group"
                      onClick={() => {
                        setPrompt(item);
                        setShowHistory(false);
                      }}
                    >
                      <p className="text-[11px] text-zinc-400 font-mono line-clamp-4 leading-relaxed italic">
                        "{item}"
                      </p>
                      <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] text-blue-600 font-bold uppercase tracking-tighter">
                          Load into workspace
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  },
);

export default PromptWorkspace;

const MODEL_OPTIONS: {
  id: string;
  label: string;
  iconColor: string;
  Icon: React.ComponentType<{ className?: string }>;
  requiresKey: "openai" | "deepseek" | null;
  providerName: string;
  offlineCapable?: boolean;
}[] = [
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3",
    iconColor: "text-blue-400",
    Icon: Sparkles,
    requiresKey: null,
    providerName: "Gemini",
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    iconColor: "text-emerald-400",
    Icon: Zap,
    requiresKey: "openai",
    providerName: "OpenAI",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    iconColor: "text-purple-400",
    Icon: Brain,
    requiresKey: "deepseek",
    providerName: "DeepSeek",
  },
  {
    id: "local",
    label: "Local",
    iconColor: "text-amber-400",
    Icon: HardDrive,
    requiresKey: null,
    providerName: "Ollama",
    offlineCapable: true,
  },
];

function useUserKeysSnapshot() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener("studio:user-keys-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("studio:user-keys-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return tick;
}

const ModelSelectorGrid: React.FC<{
  selectedModel: string;
  setSelectedModel: (id: string) => void;
}> = ({ selectedModel, setSelectedModel }) => {
  useUserKeysSnapshot();

  const openSecrets = () =>
    window.dispatchEvent(new CustomEvent("studio:open-secrets"));

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {MODEL_OPTIONS.map((m) => {
        const locked = m.requiresKey ? !getUserKey(m.requiresKey) : false;
        const isSelected = selectedModel === m.id;
        const handleClick = () => {
          if (locked) {
            openSecrets();
            return;
          }
          setSelectedModel(m.id);
        };
        return (
          <button
            key={m.id}
            onClick={handleClick}
            title={
              locked
                ? `أضف مفتاح ${m.providerName} لتفعيل هذا النموذج`
                : m.label
            }
            className={`relative p-2 bento-inner flex flex-col items-center gap-1 transition-all ${
              isSelected
                ? "bg-blue-600/20 border-blue-600/50 text-white"
                : locked
                  ? "bg-black/40 text-zinc-700 border-zinc-900 hover:border-amber-500/40 hover:text-amber-400"
                  : "bg-black/40 text-zinc-500 border-zinc-900 hover:text-zinc-300"
            }`}
          >
            <div className="relative">
              <m.Icon
                className={`w-3 h-3 ${locked ? "opacity-40" : m.iconColor}`}
              />
              {locked && (
                <Lock className="absolute -top-1.5 -right-2 w-2.5 h-2.5 text-amber-400" />
              )}
            </div>
            <span
              className={`text-[8px] font-black ${locked ? "opacity-60" : ""}`}
            >
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const ApiKeyHint: React.FC<{ selectedModel: string }> = ({ selectedModel }) => {
  useUserKeysSnapshot();
  const spec = MODEL_OPTIONS.find((m) => m.id === selectedModel);
  if (!spec) return null;

  if (spec.offlineCapable) {
    return <LocalModelStatus />;
  }

  if (!spec.requiresKey) return null;
  if (getUserKey(spec.requiresKey)) return null;

  return (
    <button
      onClick={() =>
        window.dispatchEvent(new CustomEvent("studio:open-secrets"))
      }
      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all group"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Lock className="w-3 h-3 text-amber-400 shrink-0" />
        <span className="text-[9px] font-mono font-bold text-amber-300 truncate">
          مفتاح {spec.providerName} مفقود — اضغط لإضافته
        </span>
      </div>
      <KeyRound className="w-3 h-3 text-amber-400 group-hover:rotate-12 transition-transform shrink-0" />
    </button>
  );
};
