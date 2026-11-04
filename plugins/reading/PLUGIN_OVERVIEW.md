## What you get

One panel in the thread's side panel for how a conversation looks. Choose the app theme and the light, dark or system palette, switch the container between BB's default column and full width, and set font, text size and line height. Changes apply at once and are remembered on this device.

The plugin also ships three reading themes, each with a light and a dark variant: Paper (warm off-white), Soft Slate (low-glare grey) and Sepia (aged paper). They appear in Settings → Appearance and in the panel's theme list, built only from BB's own colour tokens.

## How it works

The theme list shows BB's built-in themes, your custom themes and themes from other plugins. Hovering a custom or plugin theme previews it until you move away. Built-in themes cannot be previewed because their CSS is not exposed to plugins.

Column width, font, text size and line height are applied with CSS to the thread view. Choose the Default type style to return to BB's own look.

## Requirements and limits

The container, font, size and line-height options rely on BB's internal thread layout selectors, so a BB update can change them until the plugin is updated. The light, dark and system switch writes the app's private `bb.theme` setting in the browser, since BB has no public API for it. Code blocks keep their own font.
