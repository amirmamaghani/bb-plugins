# bb-plugins

Plugins for [BB](https://getbb.app), plus a small marketplace that lists them.

| Plugin | What it does |
|---|---|
| [Reading](plugins/reading) | Themes, light/dark mode, column width, font, text size and line height in one panel. |

## Install

Add the marketplace once, then install from BB's plugin store:

```sh
bb marketplace add git:github.com/amirmamaghani/bb-plugins@main
bb plugin install reading@amirmamaghani-plugins
```

Or install one plugin straight from the repository:

```sh
bb plugin install git:https://github.com/amirmamaghani/bb-plugins.git@main --plugin reading
```

Plugins run with full trust inside the BB server. Read the source before installing.

## Layout

- `.bb/plugins.json` is the collection manifest that indexes each plugin directory.
- `marketplace.json` is the catalog `bb marketplace add` reads.
- `plugins/<id>/` holds one plugin with its own `package.json`, `PLUGIN_OVERVIEW.md` and `LICENSE`.

## Releasing a plugin

Releases are git tags with the plugin as prefix, for example `reading/v0.1.0`. The catalog entry tracks `^0.1.0` with `tagPrefix: "reading/"`, so a new compatible tag reaches users without a catalog change. Tags are immutable: publish a fix as a new version.

```sh
bb plugin build            # inside plugins/<id>
git tag -a reading/v0.1.0 -m "Release reading v0.1.0"
git push origin reading/v0.1.0
```

## Submitting to the BB Community marketplace

Each plugin is kept ready for the official `bb-community` catalog (https://github.com/get-bb/marketplace): the plugin id matches its entry, `bb.description` is a single hook under 140 characters, `PLUGIN_OVERVIEW.md` follows the store rules, and releases use semver tags. Use BB's `submit-a-plugin` skill to open the pull request.

## License

MIT
