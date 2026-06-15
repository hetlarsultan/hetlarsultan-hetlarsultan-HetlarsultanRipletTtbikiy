# AI Video Studio Pro v2

استوديو ذكاء اصطناعي متكامل للفيديو والصور والصوت. يدعم Veo 3 و Gemini 3 و Nano Banana 2 و Lyria و ChatGPT و DeepSeek.

## التشغيل المحلي (الويب)

سيتم تشغيل التطبيق تلقائياً على المعاينة في Replit عبر Vite.

## بناء APK لأندرويد 7+

التطبيق مغلّف بـ Capacitor 8 ويعمل على Android 7 (API 24) فأعلى.

### المتطلبات
- Android Studio (مع Android SDK 36)
- JDK 21
- متصفح حديث WebView (يأتي تلقائياً مع أي جهاز Android 7+)

### الخطوات
```bash
# 1) بناء واجهة الويب
pnpm --filter @workspace/ai-video-studio run build

# 2) مزامنة المخرجات مع مشروع Android
pnpm --filter @workspace/ai-video-studio run cap:sync

# 3) فتح المشروع في Android Studio
pnpm --filter @workspace/ai-video-studio run cap:open

# أو بناء APK مباشرة:
cd artifacts/ai-video-studio/android
./gradlew assembleDebug
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```

### تثبيت APK على الجهاز
انقل ملف `app-debug.apk` إلى جهاز Android، فعّل "تثبيت من مصادر غير معروفة"، ثم افتح الملف لتثبيته.

## مفاتيح API
- `GEMINI_API_KEY` (مطلوب) — للوصول إلى Gemini و Veo و Nano Banana و Lyria
- `VITE_OPENAI_API_KEY` (اختياري) — لتفعيل ChatGPT
- `VITE_DEEPSEEK_API_KEY` (اختياري) — لتفعيل DeepSeek
