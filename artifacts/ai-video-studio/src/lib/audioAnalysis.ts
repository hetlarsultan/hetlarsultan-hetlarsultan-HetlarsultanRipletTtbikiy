export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animationId: number | null = null;

  constructor() {}

  async start(stream: MediaStream, onUpdate: (level: number) => void) {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    const tick = () => {
      if (!this.analyser || !this.dataArray) return;
      this.analyser.getByteFrequencyData(this.dataArray);

      // Calculate average amplitude (volume)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += this.dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Normalize to 0-1
      const level = Math.min(1, average / 128);
      onUpdate(level);

      this.animationId = requestAnimationFrame(tick);
    };

    tick();
  }

  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.source) this.source.disconnect();
    if (this.audioContext) this.audioContext.close();
    
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    this.animationId = null;
  }
}

export const audioAnalyzer = new AudioAnalyzer();
