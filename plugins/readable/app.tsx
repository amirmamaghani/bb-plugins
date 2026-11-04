// Readable: one side-panel tab to switch the BB theme and palette (light/dark/system), the thread container
// width, and the type style (font, text size, line height).
// shortcut: container and type style use internal BB selectors (like Chat Width); re-check after BB updates.
import * as React from "react";
import { definePluginApp, useSdk } from "@get-bb/plugin-sdk/app";
import "./app.css";

type State = { style: string; fill: boolean; font: string; scale: number; lh: number };
type Look = Pick<State, "font" | "scale" | "lh">;
const DEFAULTS: State = { style: "default", fill: false, font: "", scale: 100, lh: 0 }; // 0 / "" = BB default
const STYLES: Record<string, { name: string } & Look> = {
  default: { name: "bb default", font: "", scale: 100, lh: 0 },
  comfortable: { name: "Comfortable", font: "system-ui", scale: 110, lh: 1.7 },
  book: { name: "Book", font: "Georgia", scale: 110, lh: 1.75 },
  large: { name: "Large print", font: "system-ui", scale: 135, lh: 1.7 },
  compact: { name: "Compact", font: "system-ui", scale: 92, lh: 1.4 },
};
const STORAGE_KEY = "bb-readable";
const FONTS = ["system-ui", "Georgia", "Charter", "Iowan Old Style", "Inter", "Menlo"];

function load(): State {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

let state = load();
const listeners = new Set<() => void>();
const STYLE_ID = "bb-readable-style";
const TIMELINE_SELECTOR = '[data-timeline-row-list="top-level"]';

function buildCss(s: State) {
  const width = s.fill ? "max-width:none !important;" : "";
  const font = s.font.replace(/[{};<>]/g, "");
  const text = (font ? `font-family:${font} !important;` : "") + (s.lh ? `line-height:${s.lh} !important;` : "");
  return [
    width && `[data-thread-window] .mx-auto.w-full:has(${TIMELINE_SELECTOR}),[data-thread-window] .chat-prompt-box:has([data-app-composer-role="primary"]){${width}}`,
    s.scale !== 100 && `${TIMELINE_SELECTOR}{zoom:${s.scale / 100}}`,
    text && `${TIMELINE_SELECTOR} :is(p,li,h1,h2,h3,h4,blockquote,td,th){${text}}`,
  ].filter(Boolean).join("\n");
}

function applyCss() {
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.append(el);
  }
  el.textContent = buildCss(state);
}

function update(patch: Partial<State>) {
  state = { ...state, ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  applyCss();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <label className="rb-row">
      <span className="rb-label">{label}<b>{value}</b></span>
      {children}
    </label>
  );
}

function Choices<T extends string>({ items, value, onPick }: { items: [T, string][]; value: T; onPick: (id: T) => void }) {
  return (
    <div className="rb-choices">
      {items.map(([id, name]) => (
        <button key={id} type="button" className="rb-choice" data-on={id === value} onClick={() => onPick(id)}>{name}</button>
      ))}
    </div>
  );
}

// Light/dark/system is a per-client setting with no public SDK API. shortcut: writes the app's private
// localStorage key "bb.theme" (raw string) and fires the storage event the app listens to; re-check after BB updates.
type Palette = "light" | "dark" | "system";
const PALETTES: [Palette, string][] = [["light", "Light"], ["dark", "Dark"], ["system", "System"]];
const PALETTE_KEY = "bb.theme";
function readPalette(): Palette {
  const raw = (localStorage.getItem(PALETTE_KEY) ?? "").replace(/"/g, "");
  return raw === "light" || raw === "dark" ? raw : "system";
}
function writePalette(palette: Palette) {
  localStorage.setItem(PALETTE_KEY, palette);
  window.dispatchEvent(new StorageEvent("storage", { key: PALETTE_KEY, newValue: palette, storageArea: localStorage }));
  const dark = palette === "dark" || (palette === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
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
const BUILT_IN_THEMES: [string, string][] = [["default", "Default"], ["nord", "Nord"], ["dracula", "Dracula"], ["solarized", "Solarized"], ["gruvbox", "Gruvbox"], ["catppuccin", "Catppuccin"]];

function ReadablePanel() {
  const s = React.useSyncExternalStore(subscribe, () => state);
  const { theme } = useSdk();
  const [activeTheme, setActiveTheme] = React.useState("");
  const [palette, setPalette] = React.useState<Palette>(readPalette);
  const hovered = React.useRef("");
  const cache = React.useRef(new Map<string, string | null>());
  React.useEffect(() => clearPreview, []);
  const hover = (id: string) => {
    hovered.current = id;
    const preview = (css: string | null) => { if (hovered.current === id && css) showPreview(css); };
    if (cache.current.has(id)) return preview(cache.current.get(id) ?? null);
    theme.resolve({ themeId: id }).then((t) => { cache.current.set(id, t.customCss); preview(t.customCss); }, () => {});
  };
  const unhover = () => { hovered.current = ""; clearPreview(); };
  const [themes, setThemes] = React.useState<[string, string][]>(BUILT_IN_THEMES);
  React.useEffect(() => {
    theme.catalog().then((c) => {
      setActiveTheme(c.active.themeId);
      setThemes([...BUILT_IN_THEMES, ...c.custom.map((id): [string, string] => [id, id]),
        ...c.plugins.map((p): [string, string] => [p.id, `${p.name} (${p.pluginId})`])]);
    }, () => {});
  }, [theme]);
  const pickTheme = (id: string) => { unhover(); void theme.set(id).then((t) => setActiveTheme(t.themeId), () => {}); };
  const tune = (patch: Partial<Look>) => update({ ...patch, style: "custom" });
  return (
    <div className="rb-panel">
      <div className="rb-label">Theme</div>
      <div className="rb-list" onMouseLeave={unhover}>
        {themes.map(([id, name]) => (
          <button key={id} type="button" className="rb-item" data-on={id === activeTheme}
            onMouseEnter={() => hover(id)} onClick={() => pickTheme(id)}>{name}{id === activeTheme ? " ✓" : ""}</button>
        ))}
      </div>
      <div className="rb-label">Palette</div>
      <Choices items={PALETTES} value={palette} onPick={(p) => { writePalette(p); setPalette(p); }} />
      <div className="rb-label">Container</div>
      <Choices items={[["column", "Default column"], ["fill", "Full width"]]} value={s.fill ? "fill" : "column"}
        onPick={(id) => update({ fill: id === "fill" })} />
      <div className="rb-label">Type style</div>
      <Choices items={Object.entries(STYLES).map(([id, t]): [string, string] => [id, t.name])} value={s.style}
        onPick={(id) => { const { name: _, ...look } = STYLES[id]; update({ style: id, ...look }); }} />
      <Row label="Text size" value={`${s.scale}%`}>
        <input type="range" min={80} max={160} step={5} value={s.scale} onChange={(e) => tune({ scale: Number(e.target.value) })} />
      </Row>
      <Row label="Line height" value={s.lh ? String(s.lh) : "default"}>
        <input type="range" min={0} max={2.2} step={0.1} value={s.lh} onChange={(e) => tune({ lh: Number(e.target.value) })} />
      </Row>
      <Row label="Font" value={s.font || "default"}>
        <input list="rb-fonts" value={s.font} placeholder="e.g. Georgia" onChange={(e) => tune({ font: e.target.value })} />
        <datalist id="rb-fonts">{FONTS.map((f) => <option key={f} value={f} />)}</datalist>
      </Row>
    </div>
  );
}

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "readable-style",
    mount() {
      applyCss();
      return () => document.getElementById(STYLE_ID)?.remove();
    },
  });
  // Fixed: always present in the thread side panel, no launcher needed.
  app.slots.experimental_tab({ context: { kind: "thread" }, availability: "fixed", id: "readable", title: "Readable", icon: "Type", component: ReadablePanel });
});
