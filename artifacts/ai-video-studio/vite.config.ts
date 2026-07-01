import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const port = Number(process.env.PORT || 5000);

const basePath = process.env.BASE_PATH || "/";

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const geminiKey =
    process.env.GEMINI_API_KEY ||
    env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    env.VITE_GEMINI_API_KEY ||
    "";

  return {
    base: basePath,
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(geminiKey),
      "process.env.API_KEY": JSON.stringify(geminiKey),
    },
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    publicDir: path.resolve(import.meta.dirname, "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
      target: "es2020",
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
      fs: { strict: false },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
    },
  };
});
