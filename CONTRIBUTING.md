# Contributing

This repo is a community fork of [khang859/fleet](https://github.com/khang859/fleet). Patches are welcome; because it is a fork, the first question for any change is "does this belong upstream or here?"

- **Bug fixes, performance work and anything that makes Fleet better for everyone** are usually worth sending to [upstream](https://github.com/khang859/fleet/pulls) as well. Keeping the fork close to upstream is what makes the next sync cheap.
- **The pane-layout additions** (drag re-docking, tab merge by dropping a pane on a tab row, corner resize, balance, keyboard pane moves) are this fork's reason to exist. See `docs/pane-layout-review.md` and `docs/blocks-plan.md`.

## Development

```bash
npm install
npm run dev
```

Node 22 or newer, and a real terminal you can use for the dev window — the app drives a PTY, so a headless CI runner cannot verify most of its behaviour.

## Checks before a pull request

Run these; they are also what CI runs.

```bash
npm run typecheck                       # both tsconfigs
npx eslint --no-cache <files you changed>
npx vitest run <test files you touched> # NEVER `npm test` while a dev window is open:
                                        # its pretest hook rebuilds better-sqlite3
                                        # and will break the running app
```

Layout work has a live pass too. Start `npm run dev`, then:

```bash
npm run qa:panes
```

It drives the real window through nine scenarios (divider hit strip and arrow keys, split equalization, balance, keyboard pane moves, the three drag destinations, corner resize, workspace restore). It snapshots the tabs you have open and asserts they come back untouched, so it is safe to run against a session you care about.

## Style

- Conventional Commits (`feat(panes): …`, `fix(terminal): …`), English, imperative.
- No `as any`, no `@ts-ignore`, no `@ts-expect-error`. An escape hatch that hides a type error is worse than the error.
- Type-heavy code should stay readable: prefer a named type over a cast, and a small pure function with tests over a clever one without.
- Follow the file's existing comment voice. Comments explain _why_, and the repo's are long on purpose; a comment that restates the code is noise.
- Keep changes scoped. Delete-as-you-go is welcome, unrelated formatting is not.

## Secrets

Never commit credentials. `.env` is ignored; signing and notarization credentials belong in GitHub Actions secrets (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) and nothing else. macOS notarization is off by default in `electron-builder.yml` for exactly that reason.

## Syncing with upstream

The fork deliberately has no upstream remote configured. Add one when you need it:

```bash
git remote add upstream https://github.com/khang859/fleet.git
git fetch upstream
git merge upstream/main      # or rebase, if you prefer a linear fork
```
