import { useState } from "react";

export type DockMode = "minimized" | "docked";

export type LlmDockState = {
  mode: DockMode;
  activeThreadId: string | null;
};

export type LlmDockApi = LlmDockState & {
  openDock: () => void;
  closeDock: () => void;
  toggleDock: () => void;
  setActiveThreadId: (id: string | null) => void;
};

export function useLlmDockState(): LlmDockApi {
  const [mode, setMode] = useState<DockMode>("minimized");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  return {
    mode,
    activeThreadId,
    openDock: () => setMode("docked"),
    closeDock: () => setMode("minimized"),
    toggleDock: () => setMode((prev) => (prev === "docked" ? "minimized" : "docked")),
    setActiveThreadId,
  };
}
