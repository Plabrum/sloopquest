import { useEffect, useRef, useState, useCallback } from "react";

interface UseWebSocketOptions {
  url: string;
  enabled?: boolean;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
}

export function useWebSocket({
  url,
  enabled = true,
  onOpen,
  onClose,
  onError,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);

  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onOpen, onClose, onError]);

  useEffect(() => {
    if (!enabled) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      onOpenRef.current?.();
    };

    ws.onmessage = (event) => {
      setLastMessage(event);
    };

    ws.onerror = (error) => {
      setIsConnected(false);
      onErrorRef.current?.(error);
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      onCloseRef.current?.(event);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [enabled, url]);

  const send = useCallback((data: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === "string" ? data : JSON.stringify(data);
      wsRef.current.send(message);
    }
  }, []);

  return { isConnected, lastMessage, send };
}
