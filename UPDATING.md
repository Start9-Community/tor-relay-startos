# Updating the upstream version

Upstream is Alpine's `tor` and `lyrebird` packages, pinned in the `Dockerfile`. Nothing bumps them automatically; every update is a deliberate manual change.

## Determining the upstream version

Look up the versions in the Alpine branch the `Dockerfile` uses (`FROM alpine:3.23`):

- <https://pkgs.alpinelinux.org/package/v3.23/community/x86_64/tor>
- <https://pkgs.alpinelinux.org/package/v3.23/community/x86_64/lyrebird>

Check the same packages under `aarch64` too; both architectures must carry the version you pin. A Tor release that is newer than the branch's package means moving `FROM` to the next Alpine branch.

## Applying the bump

1. Set `TOR_VERSION` and `LYREBIRD_VERSION` in `Dockerfile` to the exact Alpine versions, release suffix included (`0.4.9.14-r0`).
2. In `startos/versions/current.ts`, set `version` to the Tor version as upstream, then `:0` (`0.4.9.15:0`). A wrapper-only change keeps the upstream part and increments the number after the colon.
3. Rewrite `releaseNotes` in all five locales.
4. Build with `make`, sideload the `.s9pk`, and check the Tor health check reports the new version on the dashboard.
