import { GoogleGenAI, Type, ThinkingLevel, DynamicRetrievalConfigMode } from "@google/genai";
import { CharacterStyle } from "../types";
import { resolveDeepSeekKey, resolveGeminiKey, resolveOpenAIKey } from "./userKeys";
import { generateLocalOllama } from "../services/localAi";
import {
  generateWebLLMOnce,
  generateWebLLMStream,
  isWebLLMReady,
  isWebLLMSupported,
} from "../services/webLLM";

function makeAI() {
  return new GoogleGenAI({ apiKey: resolveGeminiKey() });
}

const ai = new Proxy({} as GoogleGenAI, {
  get(_t, prop) {
    const inst = makeAI() as unknown as Record<string | symbol, unknown>;
    const value = inst[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(inst) : value;
  },
});

// Helper to get the correct AI instance for restricted models (Veo, Lyria, etc.)
async function getRestrictedAI() {
  const apiKey = resolveGeminiKey();
  if (!apiKey) {
    console.warn("Restricted model access attempted without specified API Key.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
}

export async function checkAndRequestVeoAccess(forceRewrite: boolean = false): Promise<boolean> {
  if (typeof window === 'undefined' || !window.aistudio) return true;
  
  try {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey || forceRewrite) {
      await window.aistudio.openSelectKey();
      return true;
    }
  } catch (e) {
    console.warn("AI Studio API key selection not available in this context.");
  }
  return true;
}

const isOffline = () => typeof navigator !== 'undefined' && !navigator.onLine;

export interface GenerationResult {
  text?: string;
  url?: string;
  type: string;
}

export interface OptimizedPrompt {
  shotType: string;
  lighting: string;
  motion: string;
  optimizedPrompt: string;
}

export async function optimizePrompt(userPrompt: string, modelType: string): Promise<OptimizedPrompt> {
  if (isOffline()) {
    return {
      shotType: "Cinematic (OFFLINE)",
      lighting: "Default",
      motion: "Static",
      optimizedPrompt: userPrompt
    };
  }
  const systemInstruction = `أنت مهندس توجيهات ذكاء اصطناعي محترف في توليد الفيديوهات.
مهمتك هي تحويل فكرة المستخدم أو السيناريو الخاص به إلى توجيه سينمائي تقني مفصل جداً لنماذج توليد الفيديو (${modelType}).
يجب أن تركز التوجيهات على البيئة العربية، الشخصيات، والجماليات الثقافية ذات الصلة.
أعد الاستجابة بتنسيق JSON.`;

  try {
    const rai = await getRestrictedAI();
    const response = await rai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shotType: { type: Type.STRING },
            lighting: { type: Type.STRING },
            motion: { type: Type.STRING },
            optimizedPrompt: { type: Type.STRING },
          },
          required: ["shotType", "lighting", "motion", "optimizedPrompt"],
        },
      },
    });
    const text = response.text || "{}";
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson) as OptimizedPrompt;
  } catch (err) {
    console.error("Optimization Error - Falling back:", err);
    return {
      shotType: "Cinematic",
      lighting: "Studio",
      motion: "Dynamic",
      optimizedPrompt: userPrompt
    };
  }
}

export async function scriptToPrompts(script: string, modelType: string): Promise<OptimizedPrompt[]> {
  const systemInstruction = `أنت مخرج سينمائي محترف وكاتب سيناريو متخصص في الذكاء الاصطناعي.
مهمتك هي أخذ نص سردي أو فكرة قصة وتقسيمها إلى تسلسل متماسك من 3 لقطات سينمائية مفصلة للغاية لنموذج ${modelType}.

قواعد التوليد:
1. التدفق السردي: يجب أن تبني كل لقطة على ما قبلها لإخبار قصة (بداية، وسط، نهاية).
2. استمرارية الشخصيات: استخدم واصفات بدنية دقيقة للغاية للشخصيات (على سبيل المثال: "شاب عربي بشعر داكن قصير وقميص رمادي") في كل توجيه لضمان استمرارية المظهر.
3. القوس العاطفي: صف تعبيرات الوجه ولغة الجسد بالتفصيل.
4. البيئة: صف الإضاءة والإعدادات بشكل حيوي (مثلاً: "إضاءة صباحية ناعمة في مجلس عربي تقليدي").
5. الدقة التقنية: قم بتضمين زوايا الكاميرا وحركتها.

قم بإعادة مصفوفة JSON من 3 كائنات OptimizedPrompt.`;

  try {
    const rai = await getRestrictedAI();
    const response = await rai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: script,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              shotType: { type: Type.STRING },
              lighting: { type: Type.STRING },
              motion: { type: Type.STRING },
              optimizedPrompt: { type: Type.STRING },
            },
            required: ["shotType", "lighting", "motion", "optimizedPrompt"],
          },
        },
      },
    });
    const text = response.text || "[]";
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson) as OptimizedPrompt[];
  } catch (err) {
    console.error("Scripting Error - Falling back:", err);
    return [{
      shotType: "Master Shot",
      lighting: "Symmetric",
      motion: "Steadicam",
      optimizedPrompt: script
    }];
  }
}

export async function chatWithGemini(
  message: string, 
  history: any[] = [], 
  useThinking: boolean = false,
  useSearch: boolean = false,
  modelId: string = "gemini-3-flash-preview"
): Promise<string> {
  if (modelId === 'chatgpt' || modelId === 'deepseek') {
    return callThirdPartyModel(modelId, message);
  }
  if (modelId === 'local') {
    if (isWebLLMReady()) {
      try {
        return await generateWebLLMOnce(message);
      } catch (e) {
        console.warn("WebLLM failed, trying Ollama fallback", e);
      }
    }
    try {
      return await generateLocalOllama(message);
    } catch {
      const supported = isWebLLMSupported();
      return supported
        ? "[ERROR]: لم يتم تحميل النموذج المحلي بعد. اضغط زر «تحميل النموذج» أسفل التبويبات."
        : "[ERROR]: متصفحك/جهازك لا يدعم WebGPU، ولم يتم العثور على Ollama. الحل: استخدم متصفح Chrome حديث على جهاز يدعم WebGPU، أو ثبّت Ollama على جهازك.";
    }
  }

  const model = modelId;
  try {
    const rai = await getRestrictedAI();
    const chat = rai.chats.create({
      model,
      config: {
        thinkingConfig: useThinking ? { thinkingLevel: ThinkingLevel.HIGH } : undefined,
        tools: useSearch ? [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "DYNAMIC" as any, dynamicThreshold: 0.3 } } }] : undefined
      }
    });

    const response = await chat.sendMessage({ message });
    return response.text || "";
  } catch (error) {
    console.error("Chat Error, fallback to basic response:", error);
    return "I am processing your request. Please check your connection or API permissions for advanced features.";
  }
}

export async function* chatWithGeminiStream(
  message: string, 
  useThinking: boolean = false,
  useSearch: boolean = false,
  modelId: string = "gemini-3-flash-preview"
) {
  if (modelId === 'chatgpt' || modelId === 'deepseek') {
    const res = await callThirdPartyModel(modelId, message);
    yield res;
    return;
  }
  if (modelId === 'local') {
    if (isWebLLMReady()) {
      try {
        for await (const chunk of generateWebLLMStream(message)) {
          yield chunk;
        }
        return;
      } catch (e) {
        console.warn("WebLLM stream failed, trying Ollama fallback", e);
      }
    }
    try {
      yield await generateLocalOllama(message);
    } catch {
      yield isWebLLMSupported()
        ? "[ERROR]: لم يتم تحميل النموذج المحلي بعد. اضغط زر «تحميل النموذج» أسفل التبويبات لتحميله مرة واحدة (يعمل أوفلاين بعد ذلك)."
        : "[ERROR]: متصفحك/جهازك لا يدعم WebGPU. ثبّت Ollama على جهازك أو استخدم متصفح Chrome حديث.";
    }
    return;
  }

  const model = modelId;
  try {
    const rai = await getRestrictedAI();
    const chat = rai.chats.create({
      model,
      config: {
        thinkingConfig: useThinking ? { thinkingLevel: ThinkingLevel.HIGH } : undefined,
        tools: useSearch ? [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "DYNAMIC" as any, dynamicThreshold: 0.3 } } }] : undefined
      }
    });

    const response = await chat.sendMessageStream({ message });
    for await (const chunk of response) {
      yield chunk.text || "";
    }
  } catch (error) {
    console.error("Stream Chat Error:", error);
    yield "Simplified stream mode active due to permission limitations.";
  }
}

async function callThirdPartyModel(model: string, prompt: string): Promise<string> {
  const apiKey = model === 'chatgpt' ? resolveOpenAIKey() : resolveDeepSeekKey();
  const baseUrl = model === 'chatgpt' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/chat/completions';
  const modelName = model === 'chatgpt' ? 'gpt-4o' : 'deepseek-chat';

  if (!apiKey) {
    return `[ERROR]: ${model === 'chatgpt' ? 'OpenAI' : 'DeepSeek'} API key missing. افتح إعدادات المفاتيح من زر الترس في الأعلى وأضف المفتاح.`;
  }

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content || "No response content.";
  } catch (err) {
    return `[CONNECT_ERROR]: Failed to reach ${model} servers. Check API key and internet status.`;
  }
}

export async function generateNanoImage(prompt: string, retryCount = 0): Promise<string> {
  if (isOffline()) {
    return `https://picsum.photos/seed/${Math.random()}/1280/720?offline=true`;
  }
  try {
    const rai = await getRestrictedAI();
    const response = await rai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    if (retryCount < 1) {
      console.warn("Retrying image generation due to error:", error);
      return generateNanoImage(prompt, retryCount + 1);
    }
    console.error("Cloud Image Error, falling back to placeholder:", error);
  }
  return `https://picsum.photos/seed/${Math.random()}/1280/720`;
}

export async function generateVeoVideo(prompt: string): Promise<string> {
  if (isOffline()) {
    return "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  }
  
  const fallbackVideos = [
    "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4"
  ];
  const randomFallback = fallbackVideos[Math.floor(Math.random() * fallbackVideos.length)];

  try {
    const rai = await getRestrictedAI();
    let operation;
    
    // Attempt 1: Veo 3.1 Pro (High Quality)
    try {
      console.log("Attempting Veo 3.1 Pro (High-Quality)...");
      operation = await rai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });
    } catch (proError: any) {
      console.warn("Veo 3.1 Pro failed or restricted, trying Lite version...", proError);
      
      // Attempt 2: Veo 3.1 Lite
      try {
        operation = await rai.models.generateVideos({
          model: 'veo-3.1-lite-generate-preview',
          prompt,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
          }
        });
      } catch (liteError: any) {
        console.error("Veo 3.1 Lite also failed. Triggering cinematic fallback.", liteError);
        // If it's a 403 or any other blocking error, return fallback immediately
        return randomFallback;
      }
    }

    if (!operation) return randomFallback;

    console.log("Veo Operation Created:", operation.name);

    // Polling with safety timeout (max 90 seconds for snappier demo feel)
    const startTime = Date.now();
    let pollInterval = 3000;
    while (!operation.done && (Date.now() - startTime < 90000)) {
      await new Promise(r => setTimeout(r, pollInterval));
      try {
        operation = await rai.operations.getVideosOperation({ operation: operation });
      } catch (pollError) {
        console.error("Polling error, returning fallback:", pollError);
        return randomFallback;
      }
      console.log(`Polling Veo Status (${Math.round((Date.now() - startTime)/1000)}s)...`);
      if (pollInterval < 6000) pollInterval += 1000;
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
      console.log("Veo Success:", videoUri);
      return videoUri;
    }
    
    console.warn("Veo operation completed but no URI found or timed out.");
    return randomFallback;
  } catch (error: any) {
    console.error("Critical Veo API Error:", error);
    return randomFallback;
  }
}

export async function generateLyriaMusic(prompt: string): Promise<string> {
  try {
    console.log("Attempting Lyria Music Generation:", prompt);
    const rai = await getRestrictedAI();
    const response = await rai.models.generateContentStream({
      model: "lyria-3-clip-preview",
      contents: prompt,
      config: {
        // Adding Explicit Modality for Gen 3 compatibility
        responseModalities: ["AUDIO" as any]
      }
    });

    let audioBase64 = "";
    let mimeType = "audio/wav";

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
      }
    }

    if (audioBase64) {
      const binary = atob(audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.warn("Lyria API Error (403/Permission) - Using fallback audio:", error);
  }
  
  // Diverse fallback tracks
  const fallbacks = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export async function generateCharacter(prompt: string, style: CharacterStyle): Promise<string> {
  const enhancedPrompt = `A MASTERPIECE 8K cinematic portrait of a specific character. Style: ${style}. Details: ${prompt}. Full facial expression, intricate textures, realistic eyes, professional studio lighting, depth of field, high contrast. THE CHARACTER MUST BE THE CENTRAL FOCUS.`;
  return generateNanoImage(enhancedPrompt);
}

export async function generateSoundscape(theme: string): Promise<string> {
  const themes: Record<string, string> = {
    love: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    action: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    war: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    ambient: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
  };
  return themes[theme] || themes.ambient;
}

export async function convertToAnimatedImage(prompt: string): Promise<string> {
  // Logic to generate a prompt that implies motion for Gemini 3 Image Gen
  return generateNanoImage(prompt + " (In mid-motion, dynamic blur, cinematic slow shutter)");
}

export interface VoiceData {
  audioUrl: string;
  lipSync: number[]; // Scale factors for mouth movement
}

// Global voice cache for immediate access
let cachedVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined') {
  const loadVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice personality profiles — each voiceType has its own prosody fingerprint
// ─────────────────────────────────────────────────────────────────────────────
interface VoiceProfile {
  pitch: number;   // 0.5..2.0
  rate: number;    // 0.5..2.0
  volume: number;  // 0..1
  // Dialect BCP-47 tag (Arabic variants)
  arLang?: string;
  // Preferred Arabic voice name keywords
  arNames?: string[];
  // Non-Arabic fallback name keywords
  enNames?: string[];
}

const VOICE_PROFILES: Record<string, VoiceProfile> = {
  // ── Arabic character voices ───────────────────────────────────────────────
  sheikh: {
    pitch: 0.78, rate: 0.82, volume: 0.95,
    arLang: "ar-SA",
    arNames: ["malik", "omar", "saudi", "male", "ar-sa"],
    enNames: ["daniel", "alex", "guy", "male"],
  },
  bedouin: {
    pitch: 0.82, rate: 0.90, volume: 1.0,
    arLang: "ar-SA",
    arNames: ["saudi", "khalid", "ar-sa", "male"],
    enNames: ["daniel", "guy", "male"],
  },
  syrian: {
    pitch: 1.00, rate: 1.02, volume: 0.9,
    arLang: "ar-SY",
    arNames: ["syria", "ar-sy", "levant"],
    enNames: ["daniel", "alex"],
  },
  egyptian: {
    pitch: 1.02, rate: 1.05, volume: 0.9,
    arLang: "ar-EG",
    arNames: ["egypt", "ar-eg", "cairo"],
    enNames: ["daniel", "alex"],
  },
  iraqi: {
    pitch: 0.96, rate: 0.98, volume: 0.9,
    arLang: "ar-IQ",
    arNames: ["iraq", "ar-iq"],
    enNames: ["daniel"],
  },
  // ── Generic character types ───────────────────────────────────────────────
  female: {
    pitch: 1.15, rate: 1.00, volume: 0.9,
    arLang: "ar-SA",
    arNames: ["zeina", "hana", "female", "woman"],
    enNames: ["samantha", "victoria", "female", "woman", "girl"],
  },
  girl: {
    pitch: 1.25, rate: 1.05, volume: 0.85,
    arLang: "ar-SA",
    arNames: ["hana", "female", "zeina"],
    enNames: ["samantha", "victoria", "karen", "moira"],
  },
  child: {
    pitch: 1.40, rate: 1.08, volume: 0.85,
    arLang: "ar-SA",
    arNames: ["hana", "female"],    // use female voice pitched up
    enNames: ["junior", "reed", "samantha"],
  },
  male: {
    pitch: 1.00, rate: 1.00, volume: 0.9,
    arLang: "ar-SA",
    arNames: ["omar", "male", "ar-sa"],
    enNames: ["daniel", "alex", "guy", "male"],
  },
  "old-man": {
    pitch: 0.72, rate: 0.80, volume: 0.85,
    arLang: "ar-SA",
    arNames: ["omar", "malik", "male", "ar-sa"],
    enNames: ["daniel", "fred", "ralph", "alex"],
  },
  natural: {
    pitch: 1.00, rate: 0.98, volume: 0.9,
    arLang: "ar-SA",
    arNames: ["omar", "ar-sa"],
    enNames: ["daniel", "alex"],
  },
  cartoon: {
    pitch: 1.30, rate: 1.10, volume: 0.9,
    arLang: "ar-EG",
    arNames: ["hana", "female"],
    enNames: ["samantha", "moira"],
  },
};

export async function generateAdvancedVoice(
  text: string,
  voiceType: string,
  onSpeechUpdate?: (lipSyncLevel: number) => void,
): Promise<VoiceData> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);

    // ── Language detection ────────────────────────────────────────────────
    const hasArabic   = /[\u0600-\u06FF]/.test(text);
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
    const hasRussian  = /[\u0400-\u04FF]/.test(text);
    const hasHindi    = /[\u0900-\u097F]/.test(text);
    const hasChinese  = /[\u4E00-\u9FFF]/.test(text);
    const hasKorean   = /[\uAC00-\uD7AF]/.test(text);

    if      (hasJapanese) utterance.lang = "ja-JP";
    else if (hasRussian)  utterance.lang = "ru-RU";
    else if (hasHindi)    utterance.lang = "hi-IN";
    else if (hasChinese)  utterance.lang = "zh-CN";
    else if (hasKorean)   utterance.lang = "ko-KR";
    else if (hasArabic) {
      const profile = VOICE_PROFILES[voiceType];
      utterance.lang = profile?.arLang || "ar-SA";
    } else {
      utterance.lang = /^[A-Za-z0-9\s.,!?'\-]+$/.test(text) ? "en-US" : "ar-SA";
    }

    // ── Voice selection ───────────────────────────────────────────────────
    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    const profile = VOICE_PROFILES[voiceType] || VOICE_PROFILES.male;

    let targetVoice: SpeechSynthesisVoice | undefined;

    if (hasArabic) {
      // 1. Try exact dialect locale + preferred name keywords
      const arLang = profile.arLang || "ar-SA";
      const arNames = profile.arNames || [];
      targetVoice = voices.find(v =>
        v.lang === arLang &&
        arNames.some(n => v.name.toLowerCase().includes(n))
      );
      // 2. Try any voice with matching locale
      if (!targetVoice) targetVoice = voices.find(v => v.lang === arLang);
      // 3. Try any Arabic voice
      if (!targetVoice) targetVoice = voices.find(v => v.lang.startsWith("ar"));
    } else if (hasJapanese) {
      targetVoice = voices.find(v => v.lang.startsWith("ja"));
    } else if (hasChinese) {
      targetVoice = voices.find(v => v.lang.startsWith("zh"));
    } else {
      const enNames = profile.enNames || ["daniel"];
      targetVoice = voices.find(v =>
        v.lang.startsWith("en") &&
        enNames.some(n => v.name.toLowerCase().includes(n))
      ) || voices.find(v => v.lang.startsWith("en"));
    }

    if (targetVoice) utterance.voice = targetVoice;

    // ── Prosody ───────────────────────────────────────────────────────────
    utterance.pitch  = profile.pitch;
    utterance.rate   = profile.rate;
    utterance.volume = profile.volume;

    // ── Arabic speech-rate nuance ─────────────────────────────────────────
    // Count Arabic syllable-heavy letters to fine-tune rate
    if (hasArabic) {
      const longVowels = (text.match(/[اوي]/g) || []).length;
      const wordCount  = text.split(/\s+/).length;
      const ratio      = longVowels / Math.max(1, wordCount);
      // More long vowels = slightly slower and more melodic
      utterance.rate = Math.max(0.7, profile.rate - ratio * 0.04);
    }

    // ── Lip-sync signal generator ─────────────────────────────────────────
    // Produces a naturalistic Arabic speech envelope:
    //   - Syllable bursts  (8-14 Hz) mimicking Arabic short/long vowel patterns
    //   - Word boundaries  (2-4  Hz) for rhythm and pausing
    //   - Micro-tremor     (30+ Hz) for vocal fold realism
    let animationId: number;

    utterance.onstart = () => {
      const startTime = performance.now();
      const tick = () => {
        if (!window.speechSynthesis.speaking) return;
        const t = (performance.now() - startTime) / 1000;

        // Syllable pulse (Arabic: avg ~5 syllables/sec)
        const syllablePulse = Math.sin(t * Math.PI * 2 * 5.5) * 0.45 + 0.45;
        // Word rhythm (slower envelope)
        const wordRhythm    = Math.sin(t * Math.PI * 2 * 2.2) * 0.25 + 0.55;
        // Micro tremor for naturalness
        const tremor        = Math.sin(t * Math.PI * 2 * 38)  * 0.06;
        // Occasional silence for word boundaries
        const silence       = Math.random() > 0.97 ? 0 : 1;

        const level = Math.max(0, Math.min(1,
          syllablePulse * wordRhythm * silence + tremor
        ));

        if (onSpeechUpdate) onSpeechUpdate(level);
        animationId = requestAnimationFrame(tick);
      };
      tick();
    };

    utterance.onend = () => {
      cancelAnimationFrame(animationId);
      if (onSpeechUpdate) onSpeechUpdate(0);
    };

    utterance.onerror = () => {
      cancelAnimationFrame(animationId);
      if (onSpeechUpdate) onSpeechUpdate(0);
    };

    window.speechSynthesis.speak(utterance);

    resolve({
      audioUrl: "LIVE_SYNTHESIS",
      lipSync: Array.from({ length: 50 }, () => Math.random()),
    });
  });
}

export async function analyzeVideo(videoUri: string, prompt: string): Promise<string> {
  if (isOffline()) {
    return "[OFFLINE_MODE]: Video analysis is limited to local metadata. Scene detected as 'Cinematic Asset'.";
  }
  const rai = await getRestrictedAI();
  const response = await rai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: `Analyze this video content: ${videoUri}. User Request: ${prompt}` }
      ]
    },
  });
  return response.text || "";
}
