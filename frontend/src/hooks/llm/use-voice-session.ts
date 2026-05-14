/**
 * Voice session state machine. One concurrent session per hook instance.
 *
 * Lifecycle:
 *   idle → (start) → connecting → listening ⇄ speaking → (stop|error) → idle
 *
 * The session opens a WebSocket to `/llm/voice`, captures mic audio through
 * a PCM16 worklet at 24kHz, streams binary frames upstream, and plays the
 * server's PCM16 audio frames through a playback worklet.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import workletUrl from "@/lib/voice/audio-worklet.ts?url";

export type VoiceSessionState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

type Refs = {
  ws: WebSocket | null;
  audioContext: AudioContext | null;
  micStream: MediaStream | null;
  recorderNode: AudioWorkletNode | null;
  playerNode: AudioWorkletNode | null;
  sourceNode: MediaStreamAudioSourceNode | null;
};

function emptyRefs(): Refs {
  return {
    ws: null,
    audioContext: null,
    micStream: null,
    recorderNode: null,
    playerNode: null,
    sourceNode: null,
  };
}

const WS_BASE = ((): string => {
  if (typeof window === "undefined") return "";
  const apiBase = (import.meta.env.VITE_API_URL ?? "/api") as string;
  if (apiBase.startsWith("ws://") || apiBase.startsWith("wss://")) return apiBase;
  if (apiBase.startsWith("http://")) return `ws://${apiBase.slice("http://".length)}`;
  if (apiBase.startsWith("https://")) return `wss://${apiBase.slice("https://".length)}`;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}${apiBase}`;
})();

export function useVoiceSession() {
  const [state, setState] = useState<VoiceSessionState>("idle");
  const refs = useRef<Refs>(emptyRefs());
  const queryClient = useQueryClient();

  const stop = useCallback(() => {
    const r = refs.current;
    refs.current = emptyRefs();

    try {
      r.recorderNode?.disconnect();
      r.playerNode?.disconnect();
      r.sourceNode?.disconnect();
    } catch {
      // ignore
    }
    if (r.micStream) {
      for (const track of r.micStream.getTracks()) track.stop();
    }
    if (r.audioContext && r.audioContext.state !== "closed") {
      r.audioContext.close().catch(() => undefined);
    }
    if (r.ws && r.ws.readyState <= WebSocket.OPEN) {
      try {
        r.ws.close();
      } catch {
        // ignore
      }
    }
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (refs.current.ws) return;
    setState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 24000 });
      await audioContext.audioWorklet.addModule(workletUrl);

      const sourceNode = audioContext.createMediaStreamSource(stream);
      const recorderNode = new AudioWorkletNode(audioContext, "pcm16-recorder");
      const playerNode = new AudioWorkletNode(audioContext, "pcm16-player");

      sourceNode.connect(recorderNode);
      playerNode.connect(audioContext.destination);

      const ws = new WebSocket(`${WS_BASE}/llm/voice`);
      ws.binaryType = "arraybuffer";

      recorderNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          setState("speaking");
          playerNode.port.postMessage(event.data, [event.data]);
          return;
        }
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === "invalidate" && Array.isArray(msg.keys)) {
            for (const key of msg.keys) {
              queryClient.invalidateQueries({ queryKey: [key] });
            }
          }
        } catch {
          // ignore
        }
      };

      ws.onopen = () => setState("listening");
      ws.onerror = () => {
        toast.error("Voice connection failed");
        setState("error");
        stop();
      };
      ws.onclose = () => {
        if (refs.current.ws === ws) {
          stop();
        }
      };

      refs.current = {
        ws,
        audioContext,
        micStream: stream,
        recorderNode,
        playerNode,
        sourceNode,
      };
    } catch (err) {
      toast.error("Could not start voice session");
      console.error(err);
      setState("error");
      stop();
    }
  }, [queryClient, stop]);

  const toggle = useCallback(() => {
    if (state === "idle" || state === "error") {
      void start();
    } else {
      stop();
    }
  }, [state, start, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { state, toggle, start, stop };
}
