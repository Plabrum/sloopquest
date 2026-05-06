/**
 * Gloria dock orchestration store.
 *
 * Module-level state via `useSyncExternalStore`. UI state only — never
 * data. Persisted to localStorage so dock open/closed, the active
 * thread id, and the user's pinned/hidden lists survive page reloads
 * and route navigation.
 */
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "gloria.dock.v1";
const PIN_LIMIT = 10;
const HIDDEN_ROUTES_LIMIT = 50;
/**
 * Page size for the thread-list query that powers the dock's history
 * dropdown and dock-header subtitle lookup. They MUST share one limit
 * so they hit the same TanStack Query cache key.
 */
export const THREAD_LIST_LIMIT = 20;

export type DockMode = "minimized" | "docked";

type PersistedState = {
  mode: DockMode;
  activeThreadId: string | null;
  pinnedThreadIds: string[];
  hiddenIconRoutes: string[];
  /** Epoch ms; drives the unread dot when the dock is closed. */
  lastStreamCompletedAt: number | null;
  /** Epoch ms; clears the unread dot. */
  lastDockOpenAt: number | null;
  /**
   * Stash of the previous thread when an auto-scope navigates the dock
   * to a fresh conversation. The conversation surface reads this to
   * render a "Keep previous chat" banner with a one-click revert.
   */
  contextSwitchPreviousThreadId: string | null;
  /**
   * Pathname where the user explicitly opted into the existing thread
   * via the "Keep previous chat" banner. The dock's auto-clear effect
   * skips when the current pathname matches.
   */
  contextOverridePath: string | null;
};

type Snapshot = {
  state: PersistedState;
  focusComposerPending: boolean;
  /** One-shot seed message for `GloriaConversationNew` to auto-send. */
  pendingSeedMessage: string | null;
};

const DEFAULT_STATE: PersistedState = {
  mode: "minimized",
  activeThreadId: null,
  pinnedThreadIds: [],
  hiddenIconRoutes: [],
  lastStreamCompletedAt: null,
  lastDockOpenAt: null,
  contextSwitchPreviousThreadId: null,
  contextOverridePath: null,
};

function hydrate(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

let snapshot: Snapshot = {
  state: hydrate(),
  focusComposerPending: false,
  pendingSeedMessage: null,
};

const listeners = new Set<() => void>();

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.state));
  } catch (err) {
    console.warn("[gloria-dock] failed to persist state", err);
  }
}

function commit(next: Snapshot, options: { persist?: boolean } = {}): void {
  snapshot = next;
  if (options.persist !== false) persist();
  listeners.forEach((l) => l());
}

function patchState(updater: (s: PersistedState) => PersistedState): void {
  commit({
    state: updater(snapshot.state),
    focusComposerPending: snapshot.focusComposerPending,
    pendingSeedMessage: snapshot.pendingSeedMessage,
  });
}

function setFocusComposerPending(value: boolean): void {
  if (snapshot.focusComposerPending === value) return;
  commit(
    {
      state: snapshot.state,
      focusComposerPending: value,
      pendingSeedMessage: snapshot.pendingSeedMessage,
    },
    { persist: false },
  );
}

function setPendingSeedMessage(value: string | null): void {
  if (snapshot.pendingSeedMessage === value) return;
  commit(
    {
      state: snapshot.state,
      focusComposerPending: snapshot.focusComposerPending,
      pendingSeedMessage: value,
    },
    { persist: false },
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    const next = hydrate();
    commit(
      {
        state: next,
        focusComposerPending: snapshot.focusComposerPending,
        pendingSeedMessage: snapshot.pendingSeedMessage,
      },
      { persist: false },
    );
  });
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): Snapshot => snapshot;

export type GloriaDockApi = {
  state: PersistedState;
  focusComposerPending: boolean;
  pendingSeedMessage: string | null;
  openDock: () => void;
  closeDock: () => void;
  toggleDock: () => void;
  focusComposer: () => void;
  consumeFocusComposer: () => void;
  consumePendingSeedMessage: () => string | null;
  setActiveThreadId: (id: string | null) => void;
  togglePin: (id: string) => void;
  isPinned: (id: string) => boolean;
  hideOnRoute: (path: string) => void;
  unhideOnRoute: (path: string) => void;
  isHiddenOnRoute: (path: string) => boolean;
  markStreamCompleted: () => void;
  markDockOpened: () => void;
  hasUnread: () => boolean;
};

export function useGloriaDockState(): GloriaDockApi {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    state: snap.state,
    focusComposerPending: snap.focusComposerPending,
    pendingSeedMessage: snap.pendingSeedMessage,
    openDock,
    closeDock,
    toggleDock,
    focusComposer,
    consumeFocusComposer,
    consumePendingSeedMessage,
    setActiveThreadId,
    togglePin,
    isPinned: (id) => snap.state.pinnedThreadIds.includes(id),
    hideOnRoute,
    unhideOnRoute,
    isHiddenOnRoute: (path) => snap.state.hiddenIconRoutes.includes(path),
    markStreamCompleted,
    markDockOpened,
    hasUnread: () => {
      const s = snap.state;
      if (s.lastStreamCompletedAt == null) return false;
      if (s.lastDockOpenAt == null) return true;
      return s.lastStreamCompletedAt > s.lastDockOpenAt;
    },
  };
}

export function openDock(): void {
  patchState((s) =>
    s.mode === "docked"
      ? s
      : { ...s, mode: "docked", lastDockOpenAt: Date.now() },
  );
}

export function closeDock(): void {
  patchState((s) => (s.mode === "minimized" ? s : { ...s, mode: "minimized" }));
}

export function toggleDock(): void {
  patchState((s) =>
    s.mode === "docked"
      ? { ...s, mode: "minimized" }
      : { ...s, mode: "docked", lastDockOpenAt: Date.now() },
  );
}

export function focusComposer(): void {
  setFocusComposerPending(true);
}

export function consumeFocusComposer(): void {
  setFocusComposerPending(false);
}

export function consumePendingSeedMessage(): string | null {
  const value = snapshot.pendingSeedMessage;
  if (value != null) setPendingSeedMessage(null);
  return value;
}

export function seedComposer(message: string): void {
  setActiveThreadId(null);
  openDock();
  setPendingSeedMessage(message);
}

export function setActiveThreadId(id: string | null): void {
  patchState((s) =>
    s.activeThreadId === id ? s : { ...s, activeThreadId: id },
  );
}

export function rememberContextSwitch(previousThreadId: string | null): void {
  patchState((s) =>
    s.contextSwitchPreviousThreadId === previousThreadId
      ? s
      : { ...s, contextSwitchPreviousThreadId: previousThreadId },
  );
}

export function dismissContextSwitch(): void {
  patchState((s) =>
    s.contextSwitchPreviousThreadId === null
      ? s
      : { ...s, contextSwitchPreviousThreadId: null },
  );
}

export function restoreContextSwitch(): void {
  patchState((s) => {
    if (s.contextSwitchPreviousThreadId == null) return s;
    const path =
      typeof window !== "undefined" ? window.location.pathname : null;
    return {
      ...s,
      activeThreadId: s.contextSwitchPreviousThreadId,
      contextSwitchPreviousThreadId: null,
      contextOverridePath: path,
    };
  });
}

export function clearContextOverrideIfNotPath(currentPath: string): void {
  patchState((s) =>
    s.contextOverridePath !== null && s.contextOverridePath !== currentPath
      ? { ...s, contextOverridePath: null }
      : s,
  );
}

export function togglePin(id: string): void {
  patchState((s) => {
    if (s.pinnedThreadIds.includes(id)) {
      return {
        ...s,
        pinnedThreadIds: s.pinnedThreadIds.filter((x) => x !== id),
      };
    }
    const next = [id, ...s.pinnedThreadIds].slice(0, PIN_LIMIT);
    return { ...s, pinnedThreadIds: next };
  });
}

export function hideOnRoute(path: string): void {
  patchState((s) => {
    if (s.hiddenIconRoutes.includes(path)) return s;
    const next = [...s.hiddenIconRoutes, path].slice(-HIDDEN_ROUTES_LIMIT);
    return { ...s, hiddenIconRoutes: next };
  });
}

export function unhideOnRoute(path: string): void {
  patchState((s) =>
    s.hiddenIconRoutes.includes(path)
      ? { ...s, hiddenIconRoutes: s.hiddenIconRoutes.filter((p) => p !== path) }
      : s,
  );
}

export function markStreamCompleted(): void {
  patchState((s) => ({ ...s, lastStreamCompletedAt: Date.now() }));
}

export function markDockOpened(): void {
  patchState((s) => ({ ...s, lastDockOpenAt: Date.now() }));
}
