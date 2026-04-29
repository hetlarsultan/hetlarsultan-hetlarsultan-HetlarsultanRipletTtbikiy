import React, { useEffect, useState } from "react";
import { getAllUserKeys } from "../lib/userKeys";

interface ProviderStatusProps {
  compact?: boolean;
}

interface Provider {
  id: "gemini" | "openai" | "deepseek";
  label: string;
  short: string;
  hasEnvFallback: boolean;
}

const PROVIDERS: Provider[] = [
  { id: "gemini", label: "Gemini", short: "G", hasEnvFallback: true },
  { id: "openai", label: "OpenAI", short: "O", hasEnvFallback: false },
  { id: "deepseek", label: "DeepSeek", short: "D", hasEnvFallback: false },
];

const ProviderStatus: React.FC<ProviderStatusProps> = ({ compact = false }) => {
  const [keys, setKeys] = useState(() => getAllUserKeys());

  useEffect(() => {
    const refresh = () => setKeys(getAllUserKeys());
    window.addEventListener("studio:user-keys-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("studio:user-keys-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const isActive = (p: Provider) =>
    !!keys[p.id] || (p.hasEnvFallback && !!import.meta.env.VITE_HAS_GEMINI);

  // For Gemini we treat env as always-on because the server provides GEMINI_API_KEY
  const resolvedActive = (p: Provider) => {
    if (keys[p.id]) return true;
    if (p.id === "gemini") return true; // env-provided
    return false;
  };

  return (
    <div
      className={`flex items-center ${compact ? "gap-1" : "gap-1.5"}`}
      title="حالة موفّري الذكاء الاصطناعي"
    >
      {PROVIDERS.map((p) => {
        const active = resolvedActive(p);
        const userOverride = !!keys[p.id];
        return (
          <div
            key={p.id}
            className={`relative flex items-center justify-center rounded-full transition-all ${
              compact ? "w-4 h-4" : "w-5 h-5"
            } ${
              active
                ? userOverride
                  ? "bg-blue-500/15 border border-blue-500/50 text-blue-400"
                  : "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
                : "bg-zinc-900 border border-zinc-800 text-zinc-600"
            }`}
            title={`${p.label}: ${
              active
                ? userOverride
                  ? "مفتاحك الخاص نشط"
                  : "مفتاح افتراضي نشط"
                : "غير مهيّأ"
            }`}
          >
            <span
              className={`font-mono font-black ${
                compact ? "text-[8px]" : "text-[9px]"
              }`}
            >
              {p.short}
            </span>
            {active && (
              <span
                className={`absolute -top-0.5 -right-0.5 rounded-full ${
                  compact ? "w-1.5 h-1.5" : "w-2 h-2"
                } ${
                  userOverride ? "bg-blue-400" : "bg-emerald-400"
                } ring-1 ring-black animate-pulse`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProviderStatus;
