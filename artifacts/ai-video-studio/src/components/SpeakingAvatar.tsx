import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Play, Square, Volume2 } from "lucide-react";
import { Character } from "../types";
import { generateAdvancedVoice } from "../lib/gemini";

interface SpeakingAvatarProps {
  character?: Character;
  text: string;
  voiceType?: string;
  size?: "sm" | "md" | "lg";
  showButton?: boolean;
  externalLevel?: number;
  onLevelChange?: (level: number) => void;
  className?: string;
}

const SIZE_MAP = {
  sm: { box: "w-12 h-12", mouth: "w-5 h-2.5", btn: "w-5 h-5", icon: "w-2.5 h-2.5" },
  md: { box: "w-20 h-20", mouth: "w-8 h-3.5", btn: "w-7 h-7", icon: "w-3 h-3" },
  lg: { box: "w-32 h-32", mouth: "w-12 h-5", btn: "w-9 h-9", icon: "w-4 h-4" },
};

export const SpeakingAvatar: React.FC<SpeakingAvatarProps> = ({
  character,
  text,
  voiceType,
  size = "sm",
  showButton = true,
  externalLevel,
  onLevelChange,
  className = "",
}) => {
  const [internalLevel, setInternalLevel] = useState(0);
  const [blink, setBlink] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const dims = SIZE_MAP[size];
  const lipSyncLevel = externalLevel ?? internalLevel;

  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 130);
    }, Math.random() * 3500 + 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, []);

  const stop = () => {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    setIsSpeaking(false);
    setInternalLevel(0);
    onLevelChange?.(0);
  };

  const speak = async () => {
    const cleanText = (text || "").trim();
    if (!cleanText) {
      window.dispatchEvent(
        new CustomEvent("studio:toast", {
          detail: { message: "اكتب نصاً أولاً ليتحدث به الممثل", type: "warn" },
        }),
      );
      return;
    }
    if (isSpeaking) {
      stop();
      return;
    }
    setIsSpeaking(true);
    try {
      const guess = voiceType || character?.voiceType || "natural";
      await generateAdvancedVoice(cleanText, guess, (level) => {
        setInternalLevel(level);
        onLevelChange?.(level);
      });
    } catch (e) {
      console.error("Speech failed", e);
    } finally {
      setIsSpeaking(false);
      setInternalLevel(0);
      onLevelChange?.(0);
    }
  };

  const avatarUrl =
    character?.avatar || "https://picsum.photos/seed/empty-actor/200/200";
  const isActive = lipSyncLevel > 0.05;

  return (
    <div className={`relative inline-block ${className}`}>
      <motion.div
        animate={{
          scale: 1 + lipSyncLevel * 0.04,
          filter: `brightness(${1 + lipSyncLevel * 0.18})`,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`${dims.box} rounded-xl overflow-hidden border ${
          isActive
            ? "border-blue-400/70 shadow-[0_0_18px_rgba(59,130,246,0.45)]"
            : "border-blue-500/20"
        } bg-zinc-900 relative transition-shadow`}
      >
        <img
          src={avatarUrl}
          alt={character?.name || "actor"}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Eye blink overlay */}
        <div className="absolute top-[34%] left-0 w-full px-[18%] flex justify-between pointer-events-none">
          <motion.div
            animate={{ scaleY: blink ? 0.05 : 0 }}
            className="w-[28%] h-[8%] bg-black/70 rounded-full"
          />
          <motion.div
            animate={{ scaleY: blink ? 0.05 : 0 }}
            className="w-[28%] h-[8%] bg-black/70 rounded-full"
          />
        </div>

        {/* Animated mouth */}
        <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 pointer-events-none">
          <motion.div
            animate={{
              scaleY: lipSyncLevel * 3.6 + 0.06,
              scaleX: 1 + lipSyncLevel * 0.28,
              opacity: lipSyncLevel > 0.03 ? 1 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className={`${dims.mouth} bg-black rounded-[50%] shadow-[0_2px_8px_rgba(0,0,0,0.9)] overflow-hidden relative origin-center`}
          >
            <motion.div
              animate={{
                opacity: lipSyncLevel > 0.25 ? 0.85 : 0,
                scale: 0.7 + lipSyncLevel * 0.3,
              }}
              className="absolute inset-0 bg-gradient-to-b from-rose-950 to-red-900 rounded-full blur-[1px]"
            />
            <motion.div
              animate={{
                y: lipSyncLevel * -1.2,
                opacity: lipSyncLevel > 0.15 ? 0.9 : 0,
              }}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[35%] bg-gradient-to-b from-white to-zinc-200 rounded-b-md blur-[0.3px]"
            />
            <motion.div
              animate={{
                y: lipSyncLevel * 1.2,
                opacity: lipSyncLevel > 0.45 ? 0.55 : 0,
              }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[65%] h-[25%] bg-white/40 rounded-t-md blur-[0.6px]"
            />
          </motion.div>
        </div>

        {/* Speaking indicator ring */}
        {isActive && (
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 rounded-xl border border-blue-400/60 pointer-events-none"
          />
        )}
      </motion.div>

      {showButton && (
        <button
          type="button"
          onClick={speak}
          title={isSpeaking ? "إيقاف النطق" : "نطق النص بصوت الممثل"}
          className={`absolute -bottom-1 -right-1 ${dims.btn} rounded-full flex items-center justify-center border-2 border-zinc-950 transition-all active:scale-90 ${
            isSpeaking
              ? "bg-red-500 hover:bg-red-400 animate-pulse"
              : "bg-blue-500 hover:bg-blue-400"
          }`}
        >
          {isSpeaking ? (
            <Square className={`${dims.icon} text-white fill-current`} />
          ) : (
            <Play className={`${dims.icon} text-white fill-current`} />
          )}
        </button>
      )}

      {isActive && (
        <div className="absolute -top-1 -left-1 px-1 py-0.5 rounded bg-blue-500/90 flex items-center gap-0.5">
          <Volume2 className="w-2 h-2 text-white" />
          <span className="text-[7px] font-mono font-bold text-white">
            {Math.round(lipSyncLevel * 100)}
          </span>
        </div>
      )}
    </div>
  );
};

export default SpeakingAvatar;
