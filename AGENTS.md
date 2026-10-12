# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

## This repo

- **The torrc never carries `SocksPort` (other than `0`), `HiddenService*` or an exit policy that allows traffic.** Keep `renderTorrc` in `startos/fileModels/torrc.ts` the only writer of the torrc.
- **Tor must not start on an address the user has not confirmed.** `blocker` in `startos/utils.ts` decides it in `main`, and `startos/init/tasks.ts` keeps the Confirm Public IP task armed through `input-not-matches` against the ORPort binding's single public IPv4. Change both together.
- **Each mode has its own DataDirectory (`relay/`, `bridge/`).** Never point both at one directory: a bridge running a published relay's keys is identifiable at once.
- **Versions are pinned by hand in the `Dockerfile`**; see `UPDATING.md`. Do not add a workflow that bumps them.
