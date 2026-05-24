/**
 * Audio worklet processors for the voice assistant.
 *
 * Two processors live in this file because the AudioWorklet API is one
 * module per worklet — registering both here keeps setup to a single
 * `addModule()` call on the client.
 *
 * `pcm16-recorder` downsamples mic input (typically 48 kHz Float32) to 24 kHz
 * PCM16 and posts ArrayBuffers of Int16 samples to the main thread.
 *
 * `pcm16-player` receives Int16 ArrayBuffers from the main thread, queues
 * them in a ring of Float32 frames, and renders them at 24 kHz.
 */

// Minimal worklet-global typings. The Web Audio AudioWorkletGlobalScope
// isn't part of the default lib.dom — declare just what we use.
declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
}
declare function registerProcessor(
  name: string,
  ctor: new () => AudioWorkletProcessor,
): void;

class Pcm16RecorderProcessor extends AudioWorkletProcessor {
  private leftover: Float32Array = new Float32Array(0);

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (!channel || channel.length === 0) return true;

    const merged = new Float32Array(this.leftover.length + channel.length);
    merged.set(this.leftover, 0);
    merged.set(channel, this.leftover.length);

    const ratio = sampleRate / 24000;
    const outLen = Math.floor(merged.length / ratio);
    if (outLen === 0) {
      this.leftover = merged;
      return true;
    }
    const out = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const sample = merged[Math.floor(i * ratio)] ?? 0;
      const clipped = Math.max(-1, Math.min(1, sample));
      out[i] = clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff;
    }
    const consumed = Math.floor(outLen * ratio);
    this.leftover = merged.slice(consumed);
    this.port.postMessage(out.buffer, [out.buffer]);
    return true;
  }
}

class Pcm16PlayerProcessor extends AudioWorkletProcessor {
  private queue: Float32Array[] = [];
  private current: Float32Array | null = null;
  private cursor = 0;

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<ArrayBuffer | "clear">) => {
      if (event.data === "clear") {
        this.queue = [];
        this.current = null;
        this.cursor = 0;
        return;
      }
      const i16 = new Int16Array(event.data);
      const f32 = new Float32Array(i16.length);
      for (let i = 0; i < i16.length; i++) {
        f32[i] = i16[i] / 0x8000;
      }
      this.queue.push(f32);
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const channel = outputs[0]?.[0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      if (!this.current || this.cursor >= this.current.length) {
        this.current = this.queue.shift() ?? null;
        this.cursor = 0;
      }
      channel[i] = this.current ? this.current[this.cursor++] : 0;
    }
    return true;
  }
}

registerProcessor("pcm16-recorder", Pcm16RecorderProcessor);
registerProcessor("pcm16-player", Pcm16PlayerProcessor);
