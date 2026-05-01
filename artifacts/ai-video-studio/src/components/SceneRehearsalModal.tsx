import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Square,
  SkipForward,
  X,
  Clapperboard,
  Edit3,
  RotateCcw,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { Character, ShotConfig } from "../types";
import { generateAdvancedVoice } from "../lib/gemini";
import { SpeakingAvatar } from "./SpeakingAvatar";

interface ScriptLine {
  id: string;
  charIndex: number;
  text: string;
}

interface SceneRehearsalModalProps {
  open: boolean;
  onClose: () => void;
  characters: Character[];
  promptText: string;
  config: ShotConfig;
  getSuggestedVoice: (c: Character | undefined, v: string | undefined) => string;
}

function splitIntoLines(text: string): string[] {
  if (!text.trim()) return [];
  const byNewline = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const result: string[] = [];
  for (const block of byNewline) {
    const sentences = block
      .split(/(?<=[.!?؟])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    result.push(...(sentences.length ? sentences : [block]));
  }
  return result;
}

function buildInitialScript(chars: Character[], text: string): ScriptLine[] {
  const lines = splitIntoLines(text);
  if (!lines.length)
    return chars.map((c, i) => ({
      id: `line-${i}`,
      charIndex: i % chars.length,
      text: `مرحباً، أنا ${c.nameAr}`,
    }));
  return lines.map((line, i) => ({
    id: `line-${i}`,
    charIndex: i % chars.length,
    text: line,
  }));
}

export const SceneRehearsalModal: React.FC<SceneRehearsalModalProps> = ({
  open,
  onClose,
  characters,
  promptText,
  config,
  getSuggestedVoice,
}) => {
  const [script, setScript] = useState<ScriptLine[]>([]);
  const [playingLine, setPlayingLine] = useState<number | null>(null);
  const [levels, setLevels] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (open && characters.length) {
      setScript(buildInitialScript(characters, promptText));
      setLevels(new Array(characters.length).fill(0));
      setPlayingLine(null);
      setIsRunning(false);
      cancelledRef.current = false;
    }
  }, [open, characters, promptText]);

  const setLevel = (charIdx: number, val: number) => {
    setLevels((prev) => {
      const next = [...prev];
      next[charIdx] = val;
      return next;
    });
  };

  const playLine = useCallback(
    async (lineIdx: number): Promise<void> => {
      if (lineIdx >= script.length || cancelledRef.current) return;
      const line = script[lineIdx];
      if (!line?.text?.trim()) return;
      const char = characters[line.charIndex];
      const voice = getSuggestedVoice(char, config.voiceType);
      setPlayingLine(lineIdx);
      try {
        await generateAdvancedVoice(line.text, voice, (lvl) =>
          setLevel(line.charIndex, lvl),
        );
      } catch (e) {
        console.warn("Speech error on line", lineIdx, e);
      } finally {
        setLevel(line.charIndex, 0);
      }
    },
    [script, characters, config.voiceType, getSuggestedVoice],
  );

  const startFrom = async (fromIdx: number) => {
    cancelledRef.current = false;
    setIsRunning(true);
    setPausedAt(null);
    for (let i = fromIdx; i < script.length; i++) {
      if (cancelledRef.current) break;
      await playLine(i);
      if (cancelledRef.current) break;
      await new Promise((r) => setTimeout(r, 350));
    }
    setIsRunning(false);
    setPlayingLine(null);
    setLevels(new Array(characters.length).fill(0));
  };

  const stop = () => {
    cancelledRef.current = true;
    try {
      window.speechSynthesis.cancel();
    } catch {}
    setIsRunning(false);
    setPlayingLine(null);
    setLevels(new Array(characters.length).fill(0));
    setPausedAt(null);
  };

  const skipNext = () => {
    if (playingLine === null) return;
    try {
      window.speechSynthesis.cancel();
    } catch {}
    const next = playingLine + 1;
    if (next < script.length) {
      setPlayingLine(next);
    }
  };

  const reassignLine = (lineId: string, direction: 1 | -1) => {
    setScript((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              charIndex:
                (l.charIndex + direction + characters.length) %
                characters.length,
            }
          : l,
      ),
    );
  };

  const addLine = (afterId: string) => {
    const afterIdx = script.findIndex((l) => l.id === afterId);
    const prev = script[afterIdx];
    const newLine: ScriptLine = {
      id: `line-${Date.now()}`,
      charIndex: (prev.charIndex + 1) % characters.length,
      text: "",
    };
    const next = [...script];
    next.splice(afterIdx + 1, 0, newLine);
    setScript(next);
    setEditingId(newLine.id);
  };

  const deleteLine = (lineId: string) => {
    if (script.length <= 1) return;
    setScript((prev) => prev.filter((l) => l.id !== lineId));
  };

  const resetScript = () => {
    stop();
    setScript(buildInitialScript(characters, promptText));
  };

  if (!open || !characters.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Clapperboard className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
              بروفة المشهد
            </span>
            <span className="text-[8px] font-mono text-zinc-600 uppercase">
              SCENE_REHEARSAL_ENGINE
            </span>
          </div>
          <button
            onClick={() => { stop(); onClose(); }}
            className="p-1.5 rounded hover:bg-zinc-800 transition-all"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {/* Stage — characters row */}
        <div className="shrink-0 px-5 py-4 border-b border-zinc-900 bg-zinc-950/60">
          <div className="flex gap-5 justify-center flex-wrap">
            {characters.map((char, ci) => {
              const charLines = script.filter((l) => l.charIndex === ci);
              const isActive = playingLine !== null && script[playingLine]?.charIndex === ci;
              return (
                <motion.div
                  key={char.id}
                  animate={{
                    scale: isActive ? 1.06 : 1,
                    filter: isActive
                      ? "brightness(1.15) drop-shadow(0 0 20px rgba(59,130,246,0.5))"
                      : "brightness(0.75)",
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="flex flex-col items-center gap-2"
                >
                  <SpeakingAvatar
                    character={char}
                    text={charLines.map((l) => l.text).join(" ")}
                    voiceType={getSuggestedVoice(char, config.voiceType)}
                    size="lg"
                    showButton={false}
                    externalLevel={levels[ci] ?? 0}
                  />
                  <div className="text-center">
                    <div
                      className={`text-[9px] font-black uppercase tracking-wider transition-colors ${isActive ? "text-blue-300" : "text-zinc-500"}`}
                    >
                      {char.nameAr}
                    </div>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center gap-1 mt-1"
                      >
                        <Volume2 className="w-2.5 h-2.5 text-blue-400 animate-pulse" />
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4].map((b) => (
                            <motion.div
                              key={b}
                              animate={{
                                height: levels[ci] > 0 ? [2, b * 4, 2] : 2,
                              }}
                              transition={{ duration: 0.25, repeat: Infinity }}
                              className="w-0.5 rounded-full bg-blue-400"
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Live caption */}
        <AnimatePresence mode="wait">
          {playingLine !== null && script[playingLine] && (
            <motion.div
              key={playingLine}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="px-8 py-3 text-center shrink-0"
            >
              <p className="text-[12px] font-bold text-white leading-relaxed font-sans">
                {script[playingLine].text}
              </p>
              <p className="text-[8px] font-mono text-zinc-600 mt-1 uppercase">
                {characters[script[playingLine].charIndex]?.nameAr} —{" "}
                {playingLine + 1}/{script.length}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Script Editor */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5 custom-scrollbar min-h-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              السكريبت ({script.length} سطر)
            </span>
            <button
              onClick={resetScript}
              disabled={isRunning}
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[8px] font-mono text-zinc-500 hover:text-zinc-300 transition-all disabled:opacity-30"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              إعادة توزيع
            </button>
          </div>

          {script.map((line, li) => {
            const char = characters[line.charIndex];
            const isCurrentLine = playingLine === li;
            return (
              <motion.div
                key={line.id}
                animate={{
                  backgroundColor: isCurrentLine
                    ? "rgba(59,130,246,0.08)"
                    : "transparent",
                  borderColor: isCurrentLine
                    ? "rgba(59,130,246,0.4)"
                    : "rgba(63,63,70,0.4)",
                }}
                className="flex items-start gap-2 p-2 rounded-lg border group/line transition-colors"
              >
                {/* Line number */}
                <span className="text-[8px] font-mono text-zinc-700 w-5 shrink-0 pt-1 text-left">
                  {li + 1}
                </span>

                {/* Character avatar + name + reassign */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-zinc-700">
                    <img
                      src={char?.avatar}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      alt=""
                    />
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => reassignLine(line.id, -1)}
                      className="p-0.5 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400"
                      title="الشخصية السابقة"
                      disabled={isRunning}
                    >
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => reassignLine(line.id, 1)}
                      className="p-0.5 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400"
                      title="الشخصية التالية"
                      disabled={isRunning}
                    >
                      <ChevronLeft className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Line text */}
                <div className="flex-1 min-w-0">
                  {editingId === line.id ? (
                    <textarea
                      autoFocus
                      value={line.text}
                      onChange={(e) =>
                        setScript((prev) =>
                          prev.map((l) =>
                            l.id === line.id ? { ...l, text: e.target.value } : l,
                          ),
                        )
                      }
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          setEditingId(null);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full bg-zinc-900 border border-blue-500/40 rounded px-2 py-1 text-[10px] font-sans text-zinc-200 resize-none outline-none min-h-[40px] leading-relaxed"
                      rows={2}
                    />
                  ) : (
                    <p
                      className={`text-[10px] font-sans leading-relaxed cursor-pointer hover:text-zinc-200 transition-colors ${
                        isCurrentLine ? "text-white font-semibold" : "text-zinc-400"
                      }`}
                      onClick={() => !isRunning && setEditingId(line.id)}
                      title="اضغط للتعديل"
                    >
                      {line.text || (
                        <span className="text-zinc-700 italic">
                          سطر فارغ — اضغط للكتابة
                        </span>
                      )}
                    </p>
                  )}
                  <div className="text-[7px] font-mono text-zinc-700 mt-0.5 uppercase">
                    {char?.nameAr}
                  </div>
                </div>

                {/* Line actions */}
                <div className="flex gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity shrink-0 pt-0.5">
                  <button
                    onClick={() => !isRunning && playLine(li)}
                    disabled={isRunning}
                    className="p-1 rounded hover:bg-blue-500/20 text-zinc-600 hover:text-blue-400 transition-all disabled:opacity-30"
                    title="قراءة هذا السطر"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </button>
                  <button
                    onClick={() => setEditingId(line.id)}
                    disabled={isRunning}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 disabled:opacity-30"
                    title="تعديل"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => addLine(line.id)}
                    disabled={isRunning}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-emerald-400 disabled:opacity-30 text-[8px] font-mono leading-none"
                    title="إضافة سطر بعد"
                  >
                    +
                  </button>
                  <button
                    onClick={() => deleteLine(line.id)}
                    disabled={isRunning || script.length <= 1}
                    className="p-1 rounded hover:bg-red-500/10 text-zinc-700 hover:text-red-400 disabled:opacity-20"
                    title="حذف"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="shrink-0 px-5 py-3 border-t border-zinc-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-[8px] font-mono text-zinc-600 uppercase">
              {isRunning
                ? `سطر ${(playingLine ?? 0) + 1} / ${script.length}`
                : "جاهز"}
            </div>
            {isRunning && (
              <div className="flex gap-0.5">
                {[1, 2, 3].map((b) => (
                  <motion.div
                    key={b}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: b * 0.2 }}
                    className="w-1 h-1 bg-blue-500 rounded-full"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <button
                  onClick={skipNext}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[9px] font-mono font-bold text-zinc-300 transition-all"
                >
                  <SkipForward className="w-3 h-3" />
                  التخطي
                </button>
                <button
                  onClick={stop}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-[9px] font-mono font-bold text-red-300 transition-all"
                >
                  <Square className="w-3 h-3 fill-current" />
                  إيقاف
                </button>
              </>
            ) : (
              <button
                onClick={() => startFrom(0)}
                disabled={!script.some((l) => l.text.trim())}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[10px] font-black text-white uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-blue-600/20"
              >
                <Clapperboard className="w-3.5 h-3.5" />
                بدء البروفة
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SceneRehearsalModal;
