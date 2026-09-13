# Fleet Performance & Issues Audit

Verified audit of the Fleet codebase conducted 2026-03-23. Each issue was independently verified by a research agent against the actual code.

> **Scope.** This file records the 2026-03-23 pass. Every finding sits in code that predates this fork, and nothing here has been re-verified since. The fork's own audit round (2026-09-13), its per-item evidence and the live list of known issues are in [docs/status.md](status.md); where the two disagree, that file is current.

---

## Confirmed Bugs

### 1. ~~Duplicate `onExit` Listener Stacking (Critical)~~ ✅ Fixed

**Files:** `src/main/ipc-handlers.ts:67-99`, `src/main/pty-manager.ts:201-211`

When `PTY_CREATE` is called for an already-existing pane (idempotent path for HMR reloads), `ptyManager.onExit()` is called unconditionally. It assigns `entry.exitDisposable` to a new listener **without disposing the previous one**, stacking listeners. On PTY exit, both the old and new callbacks fire, producing double `PTY_EXIT` events.

**Fix:** Check whether the PTY already existed before re-registering listeners in the IPC handler. Alternatively, dispose the previous `exitDisposable` inside `onExit()` before assigning the new one.

---

### 2. ~~`onData` Callback Silently Replaced (Important)~~ ✅ Fixed

**Files:** `src/main/pty-manager.ts:189`

`onData()` uses `dataCallbacks.set(paneId, callback)` which silently overwrites any existing callback. On idempotent PTY create, any previous data callback (e.g., Admiral's state detector) is lost without cleanup.

**Fix:** Guard in the IPC handler to skip re-registration if the PTY already existed, or warn/dispose the previous callback.

---

### 3. ~~`shell.openExternal` Accepts Unvalidated URLs (Important)~~ ✅ Fixed

**Files:** `src/main/ipc-handlers.ts:426-428`, `src/main/index.ts:205-215`

The `SHELL_OPEN_EXTERNAL` handler passes URLs directly to `shell.openExternal()` with no scheme validation. The `will-navigate` and `setWindowOpenHandler` handlers also call `shell.openExternal()` unconditionally on non-localhost URLs. Malicious or unexpected URL schemes (`file://`, `smb://`, custom protocols) could be exploited.

**Fix:** Allowlist URL schemes before calling `shell.openExternal()`:

```typescript
const allowed = ['https:', 'http:', 'mailto:'];
const parsed = new URL(url);
if (!allowed.includes(parsed.protocol)) return;
await shell.openExternal(url);
```

---

### 4. ~~`dataDisposable` Not Disposed on Natural PTY Exit (Minor)~~ ✅ Fixed

**Files:** `src/main/pty-manager.ts:204-210`

The `onExit` handler removes the entry from `this.ptys` but does not call `entry.dataDisposable?.dispose()`. Compare with `kill()` (line 121) which correctly disposes it. The orphaned disposable holds a reference to the closure, preventing garbage collection.

**Fix:** Add `entry.dataDisposable?.dispose()` to the `onExit` handler.

---

### 5. ~~Flush Timer Never Stops After Last PTY Killed (Minor)~~ ✅ Fixed

**Files:** `src/main/pty-manager.ts:121-131`

The `kill()` method does not check if `ptys.size === 0` after deletion to clear the flush timer. Only `killAll()` clears it. If users close panes individually, the 16ms interval timer runs indefinitely against an empty Map.

**Fix:** In `kill()`, after deleting the entry, check `if (this.ptys.size === 0)` and clear the flush timer.

---

## Confirmed Performance Issues

### 1. ~~PTY Data O(N) Broadcast (High Impact)~~ ✅ Fixed

**Files:** `src/renderer/src/hooks/use-terminal.ts:214`, `src/preload/index.ts:50-54`

Each `TerminalPane` registers a listener on the single `PTY_DATA` IPC channel via `ipcRenderer.on()`. When any PTY flushes, Electron broadcasts to all N listeners. Each checks `if (paneId === options.paneId)` and discards non-matching data. With N terminals, each flush triggers N callbacks where only 1 does work (O(N) per event, 98% waste at 50 terminals).

**Fix:** Replace per-pane listeners with a single dispatcher in the preload layer that routes by paneId via a Map:

```typescript
// preload/index.ts
const dataListeners = new Map<string, (data: string) => void>();

ipcRenderer.on(IPC_CHANNELS.PTY_DATA, (_event, payload: PtyDataPayload) => {
  dataListeners.get(payload.paneId)?.(payload.data);
});

// Expose register/unregister instead of raw onData
```

---

### 2. ~~Broad Zustand Subscriptions in App and Sidebar (High Impact)~~ ✅ Fixed

**Files:** `src/renderer/src/App.tsx:47-57`, `src/renderer/src/components/Sidebar.tsx:152-165`

`App.tsx` destructures 9 properties and `Sidebar.tsx` destructures 12 properties from `useWorkspaceStore()` without selectors. Any store update (dirty flag toggle, tab reorder, split resize) triggers full re-renders of both components and their entire subtrees.

**Fix:** Use granular selectors or `useShallow`:

```typescript
const workspace = useWorkspaceStore((s) => s.workspace);
const activeTabId = useWorkspaceStore((s) => s.activeTabId);
const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
```

---

### 3. CWD Store Broad Subscription (High Impact) — ⚠️ Partly Fixed

**Files:** `src/renderer/src/store/cwd-store.ts:15-20`, `src/renderer/src/components/Sidebar.tsx:875`

`setCwd` creates `new Map(state.cwds)` on every update (every 5s per pane from the CWD poller), so the Map's identity changes on every pane's tick. The broad destructuring this audit originally found is gone, but the sidebar still subscribes to the whole Map — `useCwdStore((s) => s.cwds)` — in order to read one pane's directory out of it, so it still re-renders whenever an unrelated pane reports a new cwd.

**Remaining fix:** select the single value the sidebar reads, derived from the pane id it already computes, rather than the Map that value comes out of. Carried as a known issue in [docs/status.md](status.md).

---

### 4. ~~`fit()` Called on Every Terminal Click (Medium Impact)~~ ✅ Fixed

**Files:** `src/renderer/src/components/TerminalPane.tsx:91-95`

The `onClick` handler calls `fit()` which triggers `getBoundingClientRect`, `fitAddon.fit()`, and a debounced PTY resize IPC — unnecessary unless the pane was resized since the last fit. The ResizeObserver already handles resize detection.

**Fix:** Remove `fit()` from the click handler.

---

### 5. ~~`workspaceToAgents` Not Memoized (Medium Impact)~~ ✅ Obsolete

The visualizer was removed from Fleet, so this code no longer exists.

---

### 6. ~~`ptyDrain` IPC on Every Write (Low Impact)~~ ✅ Fixed

**Files:** `src/renderer/src/hooks/use-terminal.ts:205-212`

`window.fleet.ptyDrain(paneId)` is called unconditionally in the `term.write()` callback, regardless of whether the PTY is actually paused. Calling `resume()` on a non-paused PTY is a no-op but generates unnecessary IPC traffic.

**Fix:** Track pause state and only call `ptyDrain` when the PTY was actually paused.

---

## Investigated & Dismissed (False Positives)

### Stale `starbaseReady` Promise

**Originally reported:** closure captures `starbaseReadyPromise` by value, so IPC handlers keep awaiting the old rejected promise after bootstrap failure.

**Why false:** `getBootstrapState` is a function called per-request. Each invocation re-evaluates the closure body and reads the current value of `starbaseReadyPromise`. The promise is always fresh.

### CWD Poller Leak on Admiral Stop

**Originally reported:** when Admiral stops, no `pane-closed` event is emitted, so the CWD poller timer leaks.

**Why false:** `AdmiralProcess.stop()` calls `ptyManager.kill()`, which triggers the `onExit` callback, which emits `pane-closed`, which calls `cwdPoller.stopPolling()`. The cleanup chain is properly wired.
