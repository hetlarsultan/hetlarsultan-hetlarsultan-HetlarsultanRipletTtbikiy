---
name: TypeScript Uint8Array fix
description: Two files always need Uint8Array<ArrayBuffer> casts; checkpoints revert them.
---

Two files require an explicit `Uint8Array<ArrayBuffer>` cast that TypeScript strict mode requires but checkpoints keep reverting:

1. `artifacts/ai-video-studio/src/lib/audioAnalysis.ts` line ~6 and ~21:
   - Field: `private dataArray: Uint8Array<ArrayBuffer> | null = null;`
   - Init: `this.dataArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;`

2. `artifacts/ai-video-studio/src/services/ffmpegService.ts` line ~37:
   - `return new Blob([data as Uint8Array<ArrayBuffer>], { type: 'video/mp4' });`

**Why:** TypeScript 5.9 strict mode treats `Uint8Array` (without type param) as incompatible with `Uint8Array<ArrayBuffer>` in some contexts. The cast is safe.

**How to apply:** Re-apply at the start of each session; run `pnpm --filter @workspace/ai-video-studio run typecheck` to confirm.
