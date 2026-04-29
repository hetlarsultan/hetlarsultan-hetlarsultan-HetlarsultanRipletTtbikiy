# Workspace

## Overview

pnpm workspace monorepo. The main artifact is **AI Video Studio Pro v2** — a React + Vite + Capacitor web/mobile app that uses Google Gemini (Veo, Nano Banana, Lyria) plus optional ChatGPT and DeepSeek for AI video, image, music, and chat generation.

## Artifacts

- `artifacts/ai-video-studio` — Main React + Vite app (served at `/`). Wraps as Android APK via Capacitor 8 (Android 7+, API 24).
- `artifacts/api-server` — Shared Express 5 backend (currently only `/api/healthz`).
- `artifacts/mockup-sandbox` — UI prototyping sandbox.

## Stack

- **Frontend**: React 19, Vite 7, TailwindCSS 4, Framer Motion, Lucide
- **3D / Avatar**: Three.js, @react-three/fiber, @react-three/drei, @pixiv/three-vrm
- **Video**: @ffmpeg/ffmpeg (WASM), Capacitor Android
- **AI**: @google/genai (Gemini, Veo, Nano Banana, Lyria), OpenAI, DeepSeek
- **Mobile wrapper**: Capacitor 8 (minSdkVersion 24 — Android 7.0 Nougat)
- **Node version**: 24 / **Package manager**: pnpm

## Required Secrets

- `GEMINI_API_KEY` — Required. Get one at https://aistudio.google.com/apikey
- `VITE_OPENAI_API_KEY` — Optional, enables ChatGPT panel
- `VITE_DEEPSEEK_API_KEY` — Optional, enables DeepSeek panel

## Key Commands

- `pnpm --filter @workspace/ai-video-studio run dev` — run the web app locally
- `pnpm --filter @workspace/ai-video-studio run build` — build static web assets
- `pnpm --filter @workspace/ai-video-studio run cap:sync` — sync web build into Android project
- `pnpm --filter @workspace/ai-video-studio run cap:open` — open Android project in Android Studio
- `cd artifacts/ai-video-studio/android && ./gradlew assembleDebug` — build APK directly

## Android Build Notes

Capacitor config sets `minSdkVersion = 24`, `targetSdkVersion = 36`, `compileSdkVersion = 36`. The app ID is `com.aivideostudio.pro`. APKs install on any Android 7+ device. To build APKs you need Android Studio + Android SDK + JDK 21 on your local machine — Replit cannot build native APKs.

See the `pnpm-workspace` skill for monorepo structure conventions.
