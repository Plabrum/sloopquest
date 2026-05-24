import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ThreadSocketMessageType,
  type ServerMessage,
  type ClientMessage,
  type Viewer,
} from "@/types/thread-websocket";
import { useWebSocket } from "./use-websocket";

interface UseThreadConnectionOptions {
  threadableType: string;
  threadableId: string;
  enabled?: boolean;
  onMessageUpdate?: () => void;
}

export function useThreadConnection({
  threadableType,
  threadableId,
  enabled = true,
  onMessageUpdate,
}: UseThreadConnectionOptions) {
  const wsUrl = useMemo(() => {
    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const protocol = backendUrl.startsWith("https") ? "wss:" : "ws:";
    const host = backendUrl.replace(/^https?:\/\//, "");
    return `${protocol}//${host}/ws/threads/${threadableType}/${threadableId}`;
  }, [threadableType, threadableId]);

  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [userNameCache, setUserNameCache] = useState<Map<string, string>>(new Map());
  const [isPageVisible, setIsPageVisible] = useState(
    typeof document !== "undefined" ? document.visibilityState === "visible" : true,
  );

  const { isConnected, lastMessage, send } = useWebSocket({
    url: wsUrl,
    enabled,
    onOpen: () => {
      send({ message_type: ThreadSocketMessageType.MARK_READ } as ClientMessage);
    },
    onClose: () => {
      setViewers([]);
    },
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!lastMessage) return;

    const message: ServerMessage = JSON.parse(lastMessage.data);

    const getViewerFromId = (userId: string): Viewer => ({
      user_id: userId,
      name: userNameCache.get(userId) || `User ${userId.slice(0, 6)}`,
      is_typing: false,
    });

    switch (message.message_type) {
      case ThreadSocketMessageType.USER_JOINED:
        setViewers(message.viewers.map(getViewerFromId));
        break;

      case ThreadSocketMessageType.USER_LEFT:
        if (message.user_id) {
          setViewers((prev) => prev.filter((v) => v.user_id !== message.user_id));
        }
        break;

      case ThreadSocketMessageType.USER_FOCUS:
        if (message.user_id) {
          setViewers((prev) =>
            prev.map((v) =>
              v.user_id === message.user_id ? { ...v, is_typing: true } : v,
            ),
          );
        }
        break;

      case ThreadSocketMessageType.USER_BLUR:
        if (message.user_id) {
          setViewers((prev) =>
            prev.map((v) =>
              v.user_id === message.user_id ? { ...v, is_typing: false } : v,
            ),
          );
        }
        break;

      case ThreadSocketMessageType.MESSAGE_CREATED:
      case ThreadSocketMessageType.MESSAGE_UPDATED:
      case ThreadSocketMessageType.MESSAGE_DELETED:
        onMessageUpdate?.();
        if (message.message_type === ThreadSocketMessageType.MESSAGE_CREATED && isPageVisible) {
          send({ message_type: ThreadSocketMessageType.MARK_READ } as ClientMessage);
        }
        break;
    }
  }, [lastMessage, userNameCache, onMessageUpdate, isPageVisible, send]);

  const handleInputFocus = useCallback(() => {
    send({ message_type: ThreadSocketMessageType.USER_FOCUS } as ClientMessage);
  }, [send]);

  const handleInputBlur = useCallback(() => {
    send({ message_type: ThreadSocketMessageType.USER_BLUR } as ClientMessage);
  }, [send]);

  const sendMarkRead = useCallback(() => {
    send({ message_type: ThreadSocketMessageType.MARK_READ } as ClientMessage);
  }, [send]);

  return {
    viewers,
    isConnected,
    handleInputFocus,
    handleInputBlur,
    sendMarkRead,
    updateUserName: useCallback((userId: string, name: string) => {
      setUserNameCache((prev) => new Map(prev).set(userId, name));
    }, []),
  };
}
