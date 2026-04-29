import React, { useEffect, useRef, useState } from "react";
import {
  HardDrive,
  Download,
  Check,
  AlertTriangle,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  ensureWebLLM,
  getSelectedWebLLMModel,
  isWebLLMReady,
  isWebLLMSupported,
  onWebLLMProgress,
  setSelectedWebLLMModel,
  WEBLLM_MODELS,
} from "../services/webLLM";

type Phase = "idle" | "loading" | "ready" | "error" | "unsupported";

const LocalModelStatus: React.FC = () => {
  const [phase, setPhase] = useState<Phase>(() => {
    if (!isWebLLMSupported()) return "unsupported";
    if (isWebLLMReady()) return "ready";
    return "idle";
  });
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modelId, setModelId] = useState(() => getSelectedWebLLMModel());
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const cancelledRef = useRef(false);

  useEffect(() => {
    const off = onWebLLMProgress((report) => {
      setProgress(report.progress);
      setStatusText(report.text);
    });
    return off;
  }, []);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const startDownload = async () => {
    cancelledRef.current = false;
    setPhase("loading");
    setError(null);
    setProgress(0);
    setStatusText("جارٍ التهيئة...");
    try {
      await ensureWebLLM(modelId);
      if (!cancelledRef.current) {
        setPhase("ready");
        setStatusText("النموذج جاهز");
      }
    } catch (e) {
      const msg = (e as Error)?.message || "خطأ غير معروف";
      setError(
        msg === "WEBGPU_UNSUPPORTED"
          ? "متصفحك لا يدعم WebGPU"
          : `فشل التحميل: ${msg.slice(0, 100)}`,
      );
      setPhase("error");
    }
  };

  const handleModelChange = (newModelId: string) => {
    setModelId(newModelId);
    setSelectedWebLLMModel(newModelId);
    if (phase === "ready" || phase === "error") {
      setPhase("idle");
      setProgress(0);
    }
  };

  const selectedSpec = WEBLLM_MODELS.find((m) => m.id === modelId);

  if (phase === "unsupported") {
    return (
      <div className="w-full px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 space-y-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
          <span className="text-[9px] font-mono font-bold text-red-300">
            جهازك لا يدعم WebGPU
          </span>
        </div>
        <p className="text-[8.5px] font-mono text-red-200/70 leading-relaxed">
          الحل البديل: ثبّت Ollama على حاسوبك من{" "}
          <a
            href="https://ollama.com/download"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-red-100"
          >
            ollama.com
          </a>
        </p>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className="w-full px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-[9px] font-mono font-bold text-emerald-300 truncate">
              النموذج جاهز — يعمل أوفلاين
            </span>
          </div>
          <div
            className="flex items-center gap-1"
            title={isOnline ? "متصل بالإنترنت" : "بدون إنترنت — مازال يعمل"}
          >
            {isOnline ? (
              <Wifi className="w-3 h-3 text-zinc-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-400" />
            )}
          </div>
        </div>
        <p className="text-[8.5px] font-mono text-emerald-200/70 mt-1">
          {selectedSpec?.label} — محفوظ في الكاش
        </p>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="w-full px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-1.5">
        <div className="flex items-center gap-2">
          <Loader2 className="w-3 h-3 text-blue-400 shrink-0 animate-spin" />
          <span className="text-[9px] font-mono font-bold text-blue-300">
            جارِ تحميل النموذج {Math.round(progress * 100)}%
          </span>
        </div>
        <div className="h-1 w-full bg-blue-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p
          className="text-[8.5px] font-mono text-blue-200/70 truncate"
          title={statusText}
        >
          {statusText || "جارٍ تحضير الموارد..."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <HardDrive className="w-3 h-3 text-amber-400 shrink-0" />
        <span className="text-[9px] font-mono font-bold text-amber-300 flex-1">
          AI أوفلاين بالكامل (داخل التطبيق)
        </span>
      </div>
      <select
        value={modelId}
        onChange={(e) => handleModelChange(e.target.value)}
        className="w-full bg-black/60 border border-amber-500/20 rounded text-[9px] font-mono text-amber-100 px-2 py-1 focus:outline-none focus:border-amber-500/60"
      >
        {WEBLLM_MODELS.map((m) => (
          <option key={m.id} value={m.id} className="bg-zinc-900">
            {m.label} — {(m.sizeMB / 1024).toFixed(1)} GB
          </option>
        ))}
      </select>
      <button
        onClick={startDownload}
        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[9px] font-mono font-bold uppercase tracking-wider transition-all"
      >
        <Download className="w-3 h-3" />
        تحميل النموذج (مرة واحدة)
      </button>
      {error && (
        <p className="text-[8.5px] font-mono text-red-300/80 leading-relaxed">
          {error}
        </p>
      )}
      <p className="text-[8px] font-mono text-amber-200/60 leading-relaxed">
        يُحفظ في كاش المتصفح ويعمل بدون إنترنت بعد ذلك. يتطلب اتصالاً قوياً
        لأول مرة فقط.
      </p>
    </div>
  );
};

export default LocalModelStatus;
