<div align="center">

# 🎬 AI Video Studio Pro v2.5

**استوديو الفيديو الاحترافي بالذكاء الاصطناعي**

A full-stack Arabic-first AI video production studio powered by Google Gemini, Veo 3.1, and Lyria — with 3D avatar animation, real-time lip-sync, and Android APK support.

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎥 **Video Generation** | Veo 3.1 Pro/Lite with automatic fallback |
| 🖼️ **Image Generation** | Gemini 2.5 Flash Image |
| 🎵 **Music Generation** | Lyria 3 AI music synthesis |
| 💬 **AI Chat** | Gemini 3 Flash / Pro with thinking mode & Google Search |
| 🎭 **3D Avatar** | VRM/GLB character rendering with real-time lip-sync |
| 🎙️ **Voice Synthesis** | Web Speech API with Arabic dialect support |
| 🎬 **Drama Production** | Script-to-multi-shot automatic storyboarding |
| 📱 **Android APK** | Capacitor-powered native Android build |
| 🔒 **Offline-first** | Works without API keys with intelligent fallbacks |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 9+

### Setup

```bash
# Install dependencies
pnpm install

# Set your Gemini API key
echo "VITE_GEMINI_API_KEY=your_key_here" > .env.local

# Start the dev server
pnpm run dev
```

Get a free Gemini API key at: https://aistudio.google.com/app/apikey

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GEMINI_API_KEY` | Recommended | Google Gemini API key (Veo, Lyria, image gen) |
| `VITE_OLLAMA_URL` | Optional | Custom Ollama server URL (default: `http://localhost:11434`) |

Keys can also be set at runtime via the **API Keys** button in the app header.

---

## 📱 Building the Android APK

See [`BUILD_APK.md`](./BUILD_APK.md) for the full guide.

**Quick build:**
```bash
# 1. Build web assets + sync to Android
pnpm run android:build

# 2. Open in Android Studio
pnpm run cap:open
```

---

## 🏗️ Project Structure

```
artifacts/ai-video-studio/
├── src/
│   ├── App.tsx                   # Root layout, lazy-loaded tab routing
│   ├── components/
│   │   ├── PromptWorkspace.tsx   # Main generation studio
│   │   ├── Sidebar.tsx           # Model & actor configuration
│   │   ├── Dashboard.tsx         # Home screen with quick actions
│   │   ├── CharacterAnimator.tsx # 2D/3D lip-sync renderer (memoized)
│   │   ├── Avatar3D.tsx          # Three.js VRM/GLB viewer
│   │   └── Gallery.tsx           # Generation history viewer (memoized)
│   ├── lib/
│   │   ├── gemini.ts             # Google GenAI wrapper (Veo, Lyria, chat)
│   │   ├── userKeys.ts           # Runtime API key management
│   │   └── audioAnalysis.ts      # Microphone frequency analyzer
│   ├── services/
│   │   ├── ffmpegService.ts      # Client-side video/audio merging (WASM)
│   │   └── localAi.ts            # Ollama local LLM integration
│   ├── constants.ts              # Fixed characters, visual filters
│   └── types.ts                  # TypeScript type definitions
├── android/                      # Native Android project (Capacitor)
├── public/
│   └── ffmpeg/                   # Bundled FFmpeg WASM core
├── capacitor.config.ts           # Capacitor configuration
├── BUILD_APK.md                  # Android build guide
└── vite.config.ts                # Vite bundler config
```

---

## 🛠️ Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Start development server |
| `pnpm run build` | Production build |
| `pnpm run typecheck` | TypeScript type checking |
| `pnpm run android:build` | Build web + sync to Android |
| `pnpm run android:debug` | Build debug APK |
| `pnpm run android:release` | Build release APK |
| `pnpm run cap:sync` | Sync web assets to Android |
| `pnpm run cap:open` | Open Android Studio |

---

## 🤖 AI Models Supported

- **Video:** Veo 3.1 Pro, Veo 3.1 Lite (Google DeepMind)
- **Image:** Gemini 2.5 Flash Image
- **Music:** Lyria 3 (Google)
- **Chat:** Gemini 3 Flash / Pro, GPT-4o (OpenAI), DeepSeek Chat
- **Local:** Llama 3 via Ollama (configurable via `VITE_OLLAMA_URL`)

---

## 📄 License

© 2026 مختبرات الذكاء الاصطناعي — Enterprise License
