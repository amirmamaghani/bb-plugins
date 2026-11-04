// Readable panel: column width, font, text scale and line height for threads.
// shortcut: relies on internal BB selectors (same as Chat Width); re-check after BB updates.
import * as React from "react";
import { definePluginApp, useSdk } from "@get-bb/plugin-sdk/app";
import "./app.css";

type State = { theme: string; fill: boolean; font: string; scale: number; lh: number };
type Look = Pick<State, "font" | "scale" | "lh">;
const DEFAULTS: State = { theme: "default", fill: false, font: "", scale: 100, lh: 0 }; // 0 / "" = BB default
const THEMES: Record<string, { name: string } & Look> = {
  default: { name: "bb default", font: "", scale: 100, lh: 0 },
  comfortable: { name: "Comfortable", font: "system-ui", scale: 110, lh: 1.7 },
  book: { name: "Book", font: "Georgia", scale: 110, lh: 1.75 },
  large: { name: "Large print", font: "system-ui", scale: 135, lh: 1.7 },
  compact: { name: "Compact", font: "system-ui", scale: 92, lh: 1.4 },
};
const KEY = "bb-readable";
const FONTS = ["system-ui", "Georgia", "Charter", "Iowan Old Style", "Inter", "Menlo"];

function load(): State {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

let state = load();
const listeners = new Set<() => void>();
const TIMELINE = '[data-timeline-row-list="top-level"]';

function css(s: State) {
  const width = s.fill ? "max-width:none !important;" : "";
  const font = s.font.replace(/[{};<>]/g, "");
  const text = (font ? `font-family:${font} !important;` : "") + (s.lh ? `line-height:${s.lh} !important;` : "");
  return [
    width && `[data-thread-window] .mx-auto.w-full:has(${TIMELINE}),[data-thread-window] .chat-prompt-box:has([data-app-composer-role="primary"]){${width}}`,
    s.scale !== 100 && `${TIMELINE}{zoom:${s.scale / 100}}`,
    text && `${TIMELINE} :is(p,li,h1,h2,h3,h4,blockquote,td,th){${text}}`,
  ].filter(Boolean).join("\n");
}

function apply() {
  let el = document.getElementById("bb-readable-style");
  if (!el) {
    el = document.createElement("style");
    el.id = "bb-readable-style";
    document.head.append(el);
  }
  el.textContent = css(state);
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  localStorage.setItem(KEY, JSON.stringify(state));
  apply();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <label className="rd-row">
      <span className="rd-label">{label}<b>{value}</b></span>
      {children}
    </label>
  );
}

function Choices<T extends string>({ items, value, onPick }: { items: [T, string][]; value: T; onPick: (id: T) => void }) {
  return (
    <div className="rd-choices">
      {items.map(([id, name]) => (
        <button key={id} type="button" className="rd-choice" data-on={id === value} onClick={() => onPick(id)}>{name}</button>
      ))}
    </div>
  );
}

// Light/dark/system is a per-client setting with no public SDK API. shortcut: writes the app's private
// localStorage key "bb.theme" (raw string) and fires the storage event the app listens to; re-check after BB updates.
type Mode = "light" | "dark" | "system";
const MODES: [Mode, string][] = [["light", "Light"], ["dark", "Dark"], ["system", "System"]];
const MODE_KEY = "bb.theme";
function readMode(): Mode {
  const raw = (localStorage.getItem(MODE_KEY) ?? "").replace(/"/g, "");
  return raw === "light" || raw === "dark" ? raw : "system";
}
function writeMode(mode: Mode) {
  localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new StorageEvent("storage", { key: MODE_KEY, newValue: mode, storageArea: localStorage }));
  const dark = mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

// Hover preview: resolve a theme's CSS and layer it over the active one until the pointer leaves.
const PREVIEW_ID = "bb-readable-theme-preview";
const clearPreview = () => document.getElementById(PREVIEW_ID)?.remove();
function showPreview(css: string) {
  clearPreview();
  const el = document.createElement("style");
  el.id = PREVIEW_ID;
  el.textContent = css;
  document.head.append(el);
}

// shortcut: built-ins are hardcoded (the typed catalog lists only custom and plugin themes); update if BB adds more.
const BUILT_IN: [string, string][] = [["default", "Default"], ["nord", "Nord"], ["dracula", "Dracula"], ["solarized", "Solarized"], ["gruvbox", "Gruvbox"], ["catppuccin", "Catppuccin"]];

function ReadablePanel() {
  const s = React.useSyncExternalStore(subscribe, () => state);
  const { theme } = useSdk();
  const [palette, setPalette] = React.useState("");
  const [mode, setMode] = React.useState<Mode>(readMode);
  const hovered = React.useRef("");
  const cache = React.useRef(new Map<string, string | null>());
  React.useEffect(() => clearPreview, []);
  const hover = (id: string) => {
    hovered.current = id;
    const apply = (css: string | null) => { if (hovered.current === id && css) showPreview(css); };
    if (cache.current.has(id)) return apply(cache.current.get(id) ?? null);
    theme.resolve({ themeId: id }).then((t) => { cache.current.set(id, t.customCss); apply(t.customCss); }, () => {});
  };
  const unhover = () => { hovered.current = ""; clearPreview(); };
  const [palettes, setPalettes] = React.useState<[string, string][]>(BUILT_IN);
  React.useEffect(() => {
    theme.catalog().then((c) => {
      setPalette(c.active.themeId);
      setPalettes([...BUILT_IN, ...c.custom.map((id): [string, string] => [id, id]),
        ...c.plugins.map((p): [string, string] => [p.id, `${p.name} (${p.pluginId})`])]);
    }, () => {});
  }, [theme]);
  const pick = (id: string) => { unhover(); void theme.set(id).then((t) => setPalette(t.themeId), () => {}); };
  const tune = (patch: Partial<Look>) => set({ ...patch, theme: "custom" });
  return (
    <div className="rd-panel">
      <div className="rd-label">Theme</div>
      <div className="rd-list" onMouseLeave={unhover}>
        {palettes.map(([id, name]) => (
          <button key={id} type="button" className="rd-item" data-on={id === palette}
            onMouseEnter={() => hover(id)} onClick={() => pick(id)}>{name}{id === palette ? " ✓" : ""}</button>
        ))}
      </div>
      <div className="rd-label">Palette</div>
      <Choices items={MODES} value={mode} onPick={(m) => { writeMode(m); setMode(m); }} />
      <div className="rd-label">Container</div>
      <Choices items={[["column", "Default column"], ["fill", "Full width"]]} value={s.fill ? "fill" : "column"}
        onPick={(id) => set({ fill: id === "fill" })} />
      <div className="rd-label">Type style</div>
      <Choices items={Object.entries(THEMES).map(([id, t]): [string, string] => [id, t.name])} value={s.theme}
        onPick={(id) => { const { name: _, ...look } = THEMES[id]; set({ theme: id, ...look }); }} />
      <Row label="Text size" value={`${s.scale}%`}>
        <input type="range" min={80} max={160} step={5} value={s.scale} onChange={(e) => tune({ scale: Number(e.target.value) })} />
      </Row>
      <Row label="Line height" value={s.lh ? String(s.lh) : "default"}>
        <input type="range" min={0} max={2.2} step={0.1} value={s.lh} onChange={(e) => tune({ lh: Number(e.target.value) })} />
      </Row>
      <Row label="Font" value={s.font || "default"}>
        <input list="rd-fonts" value={s.font} placeholder="e.g. Georgia" onChange={(e) => tune({ font: e.target.value })} />
        <datalist id="rd-fonts">{FONTS.map((f) => <option key={f} value={f} />)}</datalist>
      </Row>
    </div>
  );
}

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "readable-style",
    mount() {
      apply();
      return () => document.getElementById("bb-readable-style")?.remove();
    },
  });
  // Fixed: always present in the thread side panel, no launcher needed.
  app.slots.experimental_tab({ context: { kind: "thread" }, availability: "fixed", id: "readable", title: "Readable", icon: "Type", component: ReadablePanel });
});
