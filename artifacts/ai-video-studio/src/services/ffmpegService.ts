import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  // Use official CDN for stability
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

export async function mergeAudioVideo(videoBlob: Blob, audioBlob: Blob): Promise<Blob> {
  const instance = await loadFFmpeg();
  
  const videoData = new Uint8Array(await videoBlob.arrayBuffer());
  const audioData = new Uint8Array(await audioBlob.arrayBuffer());

  await instance.writeFile('input.mp4', videoData);
  await instance.writeFile('input.mp3', audioData);

  // Simple merge command
  await instance.exec(['-i', 'input.mp4', '-i', 'input.mp3', '-c', 'copy', '-map', '0:v:0', '-map', '1:a:0', 'output.mp4']);

  const data = await instance.readFile('output.mp4');
  return new Blob([data], { type: 'video/mp4' });
}
