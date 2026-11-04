# Readable

A BB plugin that tunes how threads read.

- **Theme** — BB's built-in themes, your custom themes and plugin themes, with a hover preview for custom and plugin themes.
- **Palette** — light, dark or system.
- **Container** — BB's default column or full width.
- **Type style** — presets for font, text size and line height, with fine controls.
- Ships three themes with light and dark variants: Paper, Soft Slate and Sepia.

The panel is a fixed tab in the thread's side panel. Settings are stored per browser.

## Develop

```sh
npm install --include=dev
npm run typecheck
bb plugin build
bb plugin install .       # from this directory; bb plugin dev rebuilds on save
```

## Limits

Width, font, size and line height depend on BB's internal layout selectors. The light/dark/system switch writes BB's private `bb.theme` client setting because no public API exists. Re-check both after a BB update.

## License

MIT
