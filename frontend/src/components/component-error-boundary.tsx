import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode | ((error: unknown, reset: () => void) => ReactNode);
  resetKey?: unknown;
};

type State = { error: unknown };

export class ComponentErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error == null) return this.props.children;
    const { fallback } = this.props;
    if (typeof fallback === "function") return fallback(error, this.reset);
    if (fallback !== undefined) return fallback;
    return <DefaultErrorTile onRetry={this.reset} />;
  }
}

function DefaultErrorTile({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-28 flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-card p-4 text-center">
      <AlertTriangle className="mb-2 size-5 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">Failed to load</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-xs font-medium text-primary hover:underline"
      >
        Retry
      </button>
    </div>
  );
}
