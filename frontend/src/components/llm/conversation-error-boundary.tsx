/**
 * Local error boundary for the LLM conversation tree.
 *
 * Prevents conversation-level failures (most commonly a 404 on the
 * thread-messages query when the persisted thread has been removed,
 * or transient backend errors) from bubbling to the route's catch-all
 * boundary and replacing the entire page with a generic error UI.
 *
 * On a 404 we auto-clear `activeThreadId` so the next render falls
 * back to LlmConversationNew (fresh-conversation surface) — the
 * stale pointer was the root cause of the page crash, and recovering
 * inside the dock is the right UX.
 */
import type { AxiosError } from "axios";
import { Component, type ReactNode } from "react";

type Props = {
  threadId: string | null;
  fallback: ReactNode;
  children: ReactNode;
  onThreadNotFound?: () => void;
};

type State = { error: unknown };

function isThreadMessages404(err: unknown): boolean {
  // Only catch 404s for the THIS-thread messages endpoint. A 404 from an
  // unrelated nested fetch must NOT trigger the activeThread reset —
  // that would silently discard the user's in-flight conversation.
  //
  // Auto-clear only works on the dock (where `threadId` comes from
  // `dock.state.activeThreadId`, so `setActiveThreadId(null)` flips the
  // prop and breaks the catch loop). On a URL-driven fullscreen surface
  // auto-clear can't break the loop — the page relies on the fallback's
  // recovery action.
  const ax = err as Partial<AxiosError>;
  if (ax?.isAxiosError !== true) return false;
  if (ax.response?.status !== 404) return false;
  const url = ax.config?.url ?? "";
  return /\/llm\/threads\/[^/]+\/messages(\?|$)/.test(url);
}

export class ConversationErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown): void {
    if (isThreadMessages404(error) && this.props.threadId !== null) {
      this.props.onThreadNotFound?.();
      this.setState({ error: null });
    }
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.threadId !== this.props.threadId && this.state.error) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (this.state.error != null) return this.props.fallback;
    return this.props.children;
  }
}
