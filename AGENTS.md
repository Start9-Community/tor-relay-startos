# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

## This repo

- **The torrc never carries `SocksPort` (other than `0`), `HiddenService*` or an exit policy that allows traffic.** That separation from onion services is the package's reason to exist; Start9's Tor package dropped relay mode because a listed relay on a server hosting onions links the two. Keep `startos/utils/torrc.ts` the only writer of the torrc.
- **Tor must not start on an address the user has not confirmed.** `startos/utils/gate.ts` decides it in `main`, and `startos/init/tasks.ts` keeps the Confirm Public IP task armed through `input-not-matches` against the ORPort binding's single public IPv4. Change both together.
- **Each mode has its own DataDirectory (`relay/`, `bridge/`).** Never point both at one directory: a bridge running a published relay's keys is identifiable at once.
- **Versions are pinned by hand in the `Dockerfile`**; see `UPDATING.md`. Do not add a workflow that bumps them.
- `npx tsc --noEmit` typechecks; `node --test test/*.test.js` runs the unit tests for the torrc renderer, the identity archive, and the IP checks.
