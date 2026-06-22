# Building the Android APK — AI Video Studio Pro

## Prerequisites

Install these on your local machine:

| Tool | Version | Download |
|------|---------|----------|
| Android Studio | Ladybug (2024.2+) | https://developer.android.com/studio |
| JDK | 17+ | Bundled with Android Studio |
| Node.js | 18+ | https://nodejs.org |
| pnpm | 9+ | `npm i -g pnpm` |

---

## Step 1 — Build the Web App

```bash
# From the workspace root
pnpm --filter @workspace/ai-video-studio run build
```

This generates the production bundle in `artifacts/ai-video-studio/dist/`.

---

## Step 2 — Sync Web Assets into Android

```bash
cd artifacts/ai-video-studio
npx cap sync android
```

This copies `dist/` into `android/app/src/main/assets/public/` and updates Capacitor config.

---

## Step 3 — Open in Android Studio

```bash
npx cap open android
```

Or manually open the `artifacts/ai-video-studio/android/` folder in Android Studio.

---

## Step 4 — Build the APK

### Debug APK (for testing)
In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

Or via command line:
```bash
cd artifacts/ai-video-studio/android
./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (for distribution)
```bash
cd artifacts/ai-video-studio/android
./gradlew assembleRelease
```

> **Note:** Release builds require a signing keystore. Generate one in Android Studio:
> **Build → Generate Signed Bundle / APK**

---

## App Details

| Field | Value |
|-------|-------|
| App ID | `com.aivideostudio.pro` |
| App Name | `AI Video Studio Pro` |
| Min SDK | Android 7.0 (API 24) |
| Target SDK | Android 16 (API 36) |
| Version | 1.0 |

## Permissions Requested

- `INTERNET` — AI API calls
- `RECORD_AUDIO` — Voice input and speech recognition
- `CAMERA` — Character capture
- `READ/WRITE_EXTERNAL_STORAGE` — Save generated videos/images
- `ACCESS_NETWORK_STATE` — Offline mode detection

---

## Environment Variable

The app needs a Gemini API key. Set it before building:

```bash
# Create .env in artifacts/ai-video-studio/
echo "VITE_GEMINI_API_KEY=your_key_here" > artifacts/ai-video-studio/.env
```

Get a free key at: https://aistudio.google.com/app/apikey
