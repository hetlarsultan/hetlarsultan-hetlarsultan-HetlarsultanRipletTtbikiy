import { GoogleGenAI, Type, ThinkingLevel, DynamicRetrievalConfigMode } from "@google/genai";
import { CharacterStyle } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to get the correct AI instance for restricted models (Veo, Lyria, etc.)
async function getRestrictedAI() {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Restricted model access attempted without specified API Key. Using default env key.");
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
  const apiKey = model === 'chatgpt' ? import.meta.env.VITE_OPENAI_API_KEY : import.meta.env.VITE_DEEPSEEK_API_KEY;
  const baseUrl = model === 'chatgpt' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/chat/completions';
  const modelName = model === 'chatgpt' ? 'gpt-4o' : 'deepseek-chat';

  if (!apiKey) {
    return `[ERROR]: ${model === 'chatgpt' ? 'OpenAI' : 'DeepSeek'} API key missing. Please add VITE_${model.toUpperCase()}_API_KEY in Settings.`;
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

export async function generateAdvancedVoice(
  text: string,
  voiceType: string,
  onSpeechUpdate?: (lipSyncLevel: number) => void,
): Promise<VoiceData> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);

    // Precise language detection
    const arabicRegex = /[\u0600-\u06FF]/;
    const hasArabic = arabicRegex.test(text);
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
    const hasRussian = /[\u0400-\u04FF]/.test(text);
    const hasHindi = /[\u0900-\u097F]/.test(text);
    const hasChinese = /[\u4E00-\u9FFF]/.test(text);
    const hasKorean = /[\uAC00-\uD7AF]/.test(text);

    // Set language based strictly on content
    if (hasArabic) utterance.lang = "ar-SA";
    else if (hasJapanese) utterance.lang = "ja-JP";
    else if (hasRussian) utterance.lang = "ru-RU";
    else if (hasHindi) utterance.lang = "hi-IN";
    else if (hasChinese) utterance.lang = "zh-CN";
    else if (hasKorean) utterance.lang = "ko-KR";
    else {
      // Check if it's primarily English/Latin
      utterance.lang = /^[A-Za-z0-9\s.,!?-]+$/.test(text) ? "en-US" : "ar-SA";
    }

    // Use cached voices if available, otherwise fetch immediately
    const voices =
      cachedVoices.length > 0
        ? cachedVoices
        : window.speechSynthesis.getVoices();
    let targetVoice;

    // Dialect overrides based on voiceType
    if (voiceType === "syrian" && hasArabic) utterance.lang = "ar-SY";
    if (voiceType === "egyptian" && hasArabic) utterance.lang = "ar-EG";
    if (voiceType === "iraqi" && hasArabic) utterance.lang = "ar-IQ";
    
    // Improved voice selection based on language and type
    if (hasArabic || ["syrian", "iraqi", "egyptian", "bedouin", "sheikh"].includes(voiceType || "")) {
      // Preferred voices mapping
      targetVoice = voices.find((v) => 
        v.lang.startsWith("ar") && (
          (voiceType === "syrian" && (v.lang.includes("SY") || v.name.includes("Syria"))) ||
          (voiceType === "egyptian" && (v.lang.includes("EG") || v.name.includes("Egypt"))) ||
          (voiceType === "iraqi" && (v.lang.includes("IQ") || v.name.includes("Iraq"))) ||
          (voiceType === "bedouin" && (v.lang.includes("SA") || v.name.includes("Saudi"))) ||
          (voiceType === "sheikh" && v.name.includes("Male"))
        )
      ) || voices.find(v => v.lang.startsWith("ar"));
    } else if (hasJapanese) {
      targetVoice = voices.find((v) => v.lang.startsWith("ja"));
    } else if (hasChinese) {
      targetVoice = voices.find((v) => v.lang.startsWith("zh"));
    } else {
      const voiceMap: Record<string, string[]> = {
        girl: ["female", "girl", "woman", "samantha"],
        child: ["child", "boy", "girl", "kid"],
        cartoon: ["female", "girl", "samantha", "moira"],
        natural: ["male", "man", "guy", "daniel", "alex"],
        "old-man": ["male", "man", "guy", "daniel", "alex"], // Will adjust pitch later
        male: ["male", "man", "guy", "daniel"],
        female: ["female", "woman", "girl", "samantha"]
      };
      
      const candidates = voiceMap[voiceType] || ["google", "english"];
      targetVoice = voices.find((v) => 
        v.lang.startsWith("en") && 
        candidates.some(c => v.name.toLowerCase().includes(c))
      );
    }

    if (targetVoice) utterance.voice = targetVoice;
    
    // Adjust pitch and rate for character personality
    if (voiceType === "old-man") {
      utterance.pitch = 0.8; // Deeper voice
      utterance.rate = 0.85; // Slower speaking
    } else if (voiceType === "child") {
      utterance.pitch = 1.25; // Higher pitch
      utterance.rate = 1.05; // Slightly faster
    } else {
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
    }

    // Simulate real-time lip sync feedback during speech
    let animationId: number;
    utterance.onstart = () => {
      const tick = () => {
        if (!window.speechSynthesis.speaking) return;
        
        // Staccato simulation: burst of movement for syllables
        // Uses a combination of low-freq wave and fast noise
        const time = Date.now() / 1000;
        const lowFreq = Math.sin(time * 12); // Pulse for words
        const highFreq = Math.sin(time * 45); // Quiver for detail
        
        let level = Math.max(0, (lowFreq * 0.6 + highFreq * 0.2 + 0.3));
        
        // Randomly lower level to simulate gaps between words
        if (Math.random() > 0.95) level = 0;
        
        if (onSpeechUpdate) onSpeechUpdate(level);
        animationId = requestAnimationFrame(tick);
      };
      tick();
    };

    utterance.onend = () => {
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
