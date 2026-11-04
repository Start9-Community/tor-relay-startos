# Updating the upstream version

Upstream is Alpine's `tor` and `lyrebird` packages, pinned in the `Dockerfile`. Nothing bumps them automatically; every update is a deliberate manual change.

## Determining the upstream version

Look up the versions in the Alpine branch the `Dockerfile` uses (`FROM alpine:3.23`):

- <https://pkgs.alpinelinux.org/package/v3.23/community/x86_64/tor>
- <https://pkgs.alpinelinux.org/package/v3.23/community/x86_64/lyrebird>

Check the same packages under `aarch64` too; both architectures must carry the version you pin. A Tor release that is newer than the branch's package means moving `FROM` to the next Alpine branch.

## Applying the bump

1. Set `TOR_VERSION` and `LYREBIRD_VERSION` in `Dockerfile` to the exact Alpine versions, release suffix included (`0.4.9.15-r0`).
2. In `startos/versions/current.ts`, `version` follows the Tor version, not Lyrebird's (`0.4.9.15:0`).
