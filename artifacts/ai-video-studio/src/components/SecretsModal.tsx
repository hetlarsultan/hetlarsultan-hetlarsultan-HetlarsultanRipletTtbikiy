import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Eye,
  EyeOff,
  Save,
  Trash2,
  KeyRound,
  Check,
  ExternalLink,
  Loader2,
  Wifi,
  AlertCircle,
} from "lucide-react";
import {
  getAllUserKeys,
  setUserKey,
  testUserKey,
  type UserKeyName,
} from "../lib/userKeys";

type TestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

interface SecretsModalProps {
  open: boolean;
  onClose: () => void;
}

interface KeySpec {
  id: UserKeyName;
  label: string;
  description: string;
  placeholder: string;
  link: string;
  linkLabel: string;
}

const KEY_SPECS: KeySpec[] = [
  {
    id: "openai",
    label: "OpenAI (ChatGPT)",
    description: "مفتاح يُستخدم لتفعيل نموذج ChatGPT داخل التطبيق.",
    placeholder: "sk-...",
    link: "https://platform.openai.com/api-keys",
    linkLabel: "احصل على مفتاح OpenAI",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "مفتاح يُستخدم لتفعيل نموذج DeepSeek-V3 للمحادثة.",
    placeholder: "sk-...",
    link: "https://platform.deepseek.com/api_keys",
    linkLabel: "احصل على مفتاح DeepSeek",
  },
  {
    id: "gemini",
    label: "Gemini (اختياري)",
    description:
      "اتركه فارغاً لاستخدام مفتاح الخادم الافتراضي. أضف مفتاحك الخاص للوصول إلى Veo و Lyria و Nano Banana.",
    placeholder: "AIza...",
    link: "https://aistudio.google.com/apikey",
    linkLabel: "احصل على مفتاح Gemini",
  },
];

const SecretsModal: React.FC<SecretsModalProps> = ({ open, onClose }) => {
  const [values, setValues] = useState<Record<UserKeyName, string>>({
    openai: "",
    deepseek: "",
    gemini: "",
  });
  const [reveal, setReveal] = useState<Record<UserKeyName, boolean>>({
    openai: false,
    deepseek: false,
    gemini: false,
  });
  const [savedFlash, setSavedFlash] = useState(false);
  const [tests, setTests] = useState<Record<UserKeyName, TestState>>({
    openai: { status: "idle" },
    deepseek: { status: "idle" },
    gemini: { status: "idle" },
  });

  useEffect(() => {
    if (open) {
      setValues(getAllUserKeys());
      setSavedFlash(false);
      setTests({
        openai: { status: "idle" },
        deepseek: { status: "idle" },
        gemini: { status: "idle" },
      });
    }
  }, [open]);

  const runTest = async (id: UserKeyName) => {
    setTests((prev) => ({ ...prev, [id]: { status: "loading" } }));
    const result = await testUserKey(id, values[id]);
    setTests((prev) => ({
      ...prev,
      [id]: result.ok
        ? { status: "ok", message: result.message }
        : { status: "error", message: result.message },
    }));
  };

  if (!open) return null;

  const handleSave = () => {
    (Object.keys(values) as UserKeyName[]).forEach((k) => {
      setUserKey(k, values[k]);
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleClear = (id: UserKeyName) => {
    setValues((prev) => ({ ...prev, [id]: "" }));
    setUserKey(id, "");
    setTests((prev) => ({ ...prev, [id]: { status: "idle" } }));
  };

  const updateValue = (id: UserKeyName, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setTests((prev) =>
      prev[id].status === "idle" ? prev : { ...prev, [id]: { status: "idle" } },
    );
  };

  const masked = (s: string) =>
    s.length <= 8
      ? "•".repeat(s.length)
      : s.slice(0, 4) + "•".repeat(Math.max(0, s.length - 8)) + s.slice(-4);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-gradient-to-l from-blue-600/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <KeyRound className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight">
                  مفاتيح API الخاصة بك
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  تُحفظ محلياً على هذا الجهاز فقط — لا تُرسل إلى أي خادم.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {KEY_SPECS.map((spec) => (
              <div
                key={spec.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm">{spec.label}</h3>
                      {values[spec.id] && (
                        <span className="text-[9px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          مفعّل
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      {spec.description}
                    </p>
                  </div>
                  <a
                    href={spec.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
                  >
                    {spec.linkLabel}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 relative">
                    <input
                      type={reveal[spec.id] ? "text" : "password"}
                      value={
                        reveal[spec.id]
                          ? values[spec.id]
                          : values[spec.id]
                            ? masked(values[spec.id])
                            : ""
                      }
                      onChange={(e) => updateValue(spec.id, e.target.value)}
                      onFocus={() =>
                        setReveal((prev) => ({ ...prev, [spec.id]: true }))
                      }
                      placeholder={spec.placeholder}
                      dir="ltr"
                      className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-left placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setReveal((prev) => ({
                        ...prev,
                        [spec.id]: !prev[spec.id],
                      }))
                    }
                    className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center transition-colors"
                    aria-label="إظهار / إخفاء"
                  >
                    {reveal[spec.id] ? (
                      <EyeOff className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                  {values[spec.id] && (
                    <button
                      type="button"
                      onClick={() => handleClear(spec.id)}
                      className="w-9 h-9 rounded-lg bg-zinc-900 border border-red-900/40 hover:bg-red-950/40 flex items-center justify-center transition-colors"
                      aria-label="حذف"
                      title="حذف المفتاح"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => runTest(spec.id)}
                    disabled={
                      tests[spec.id].status === "loading" || !values[spec.id]
                    }
                    className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md border transition-all ${
                      !values[spec.id]
                        ? "bg-zinc-900/40 border-zinc-800 text-zinc-700 cursor-not-allowed"
                        : tests[spec.id].status === "loading"
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                          : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-blue-500/50 hover:text-blue-300"
                    }`}
                  >
                    {tests[spec.id].status === "loading" ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        جارِ الفحص...
                      </>
                    ) : (
                      <>
                        <Wifi className="w-3 h-3" />
                        اختبار الاتصال
                      </>
                    )}
                  </button>

                  {tests[spec.id].status === "ok" && (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                      <Check className="w-3 h-3" />
                      {(tests[spec.id] as { message: string }).message}
                    </span>
                  )}
                  {tests[spec.id].status === "error" && (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 truncate max-w-[60%]">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {(tests[spec.id] as { message: string }).message}
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div className="text-[10px] text-zinc-500 leading-relaxed bg-zinc-900/40 border border-zinc-800/60 rounded-lg p-3">
              <strong className="text-zinc-400">ملاحظة الخصوصية:</strong> جميع
              المفاتيح تُخزّن في
              <code className="mx-1 px-1.5 py-0.5 bg-black/60 rounded text-blue-400">
                localStorage
              </code>
              المتصفح فقط. لا يتم إرسالها إلى أي خادم باستثناء الخدمات الرسمية
              لكل مزود (OpenAI / DeepSeek / Google) عند استخدام النموذج المقابل.
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-zinc-800/80 bg-black/40">
            <button
              onClick={onClose}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2"
            >
              إلغاء
            </button>
            <motion.button
              onClick={handleSave}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${
                savedFlash
                  ? "bg-emerald-600 text-white shadow-emerald-600/30"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30"
              }`}
            >
              {savedFlash ? (
                <>
                  <Check className="w-4 h-4" />
                  تم الحفظ
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  حفظ المفاتيح
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SecretsModal;
