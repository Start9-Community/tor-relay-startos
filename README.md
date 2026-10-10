<p align="center">
  <img src="icon.svg" alt="Tor Node Logo" width="21%">
</p>

# Tor Node on StartOS

> Everything not listed in this document should behave the same as upstream Tor.
> If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation section of
> `instructions.md` for links.

Runs Tor as a non-exit relay or an obfs4 bridge. It never runs onion services and never lets traffic exit, and Tor starts only on a public IPv4 the user has confirmed.

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)

## Image and Container Runtime

- Built from `Dockerfile`: `alpine:3.23` with pinned `tor` and `lyrebird` packages plus `busybox-extras` for the dashboard.
- Architectures: `x86_64`, `aarch64`.
- One subcontainer (`tor-sub`) runs three processes: a `prepare` oneshot (creates and chowns the mode's DataDirectory), `tor -f /data/torrc` as user `tor`, and `busybox-extras httpd` serving `/www` on port 80.

## Volume and Data Layout

Volume `main`, mounted at `/data`:

| Path          | Contents                                                                        |
| ------------- | ------------------------------------------------------------------------------- |
| `store.json`  | Package settings (see File Models)                                              |
| `torrc`       | Rendered on every start                                                         |
| `status.json` | Written every health-check cycle; read by the dashboard                         |
| `relay/`      | Tor DataDirectory and identity for relay mode                                   |
| `bridge/`     | Tor DataDirectory and identity for bridge mode, including `pt_state/` for obfs4 |

## File Models

- `store.json` (`startos/fileModels/store.json.ts`): `configured`, `mode`, `nickname`, `contactInfo`, `bandwidthRate`/`bandwidthBurst` (KB/s), `accountingMax` (GB per month or null), `confirmedIp`. Written by the Configure Node and Confirm Public IP actions; `main` re-runs whenever it changes.
- `torrc` (`startos/fileModels/torrc.ts`): rendered by `startos/utils/torrc.ts` from the store and the ORPort binding. Hand edits are overwritten on the next start.

## Dependencies

None.

## Network Access and Interfaces

| Interface         | Port                    | Type | Purpose                                                  |
| ----------------- | ----------------------- | ---- | -------------------------------------------------------- |
| Dashboard         | 80 (HTTP)               | ui   | Status page                                              |
| Tor ORPort        | 9001 (TCP, passthrough) | p2p  | Tor network traffic; needs exactly one public IPv4       |
| obfs4 Bridge Port | 8443 (TCP, passthrough) | p2p  | obfs4 clients in bridge mode; needs the same public IPv4 |

When StartOS assigns an external ORPort other than 9001, the torrc advertises the external port with `NoListen` and listens on 9001 with `NoAdvertise`. IPv6 is advertised only when a public IPv6 is enabled on the ORPort.

## Installation and First-Run Flow

1. Configure Node (critical task).
2. Enable one public IPv4 on the Tor ORPort interface (and on obfs4 Bridge Port in bridge mode).
3. Confirm Public IP (critical task).
4. Start. Tor's self-test and descriptor upload take about 20 minutes.

## Actions

| Action            | When                            | Effect                                                                                                                           |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Configure Node    | Any time                        | Mode, nickname, contact info, bandwidth, monthly limit. Restarts the service. Changing mode switches to that mode's identity.    |
| Confirm Public IP | First setup, after an IP change | Checks the input equals the ORPort's single public IPv4, that it is public, and that the user confirmed it is static; stores it. |
| Node Info         | Any time                        | Fingerprint, Tor Metrics link (hashed fingerprint for bridges), bridge line in bridge mode.                                      |
| Import Identity   | Service stopped                 | Installs `secret_id_key` and `ed25519_master_id_secret_key` from a base64 `.tar.gz` into the chosen mode, removing derived keys. |
| Export Identity   | Any time                        | Returns the chosen mode's two identity keys as a base64 `.tar.gz`.                                                               |

## Tasks

- **Configure Node** — critical, raised until the store is configured; cleared once it is.
- **Confirm Public IP** — critical, `input-not-matches` against the ORPort's current single public IPv4. It re-arms whenever that address changes, is removed, or gains a second address, and StartOS keeps the service stopped while it is open.

## Health Checks

- **Node Setup** — present only while Tor is held back; its message names what is missing.
- **Dashboard** — the HTTP port listens.
- **Tor** — reads the control socket; loading while bootstrapping, success at 100%.
- **Reachability** — success once Tor's ORPort self-test passed and a directory authority accepted the descriptor; loading for the first 20 minutes, failure after.

## Backups and Restore

The whole `main` volume is backed up, including both identities. Restoring onto a second server while the first still runs puts the same identity online twice; stop one first.

## Limitations and Differences

- No exit relay mode, no SOCKS port, no onion services.
- obfs4 is the only pluggable transport.
- The package cannot tell whether an address is static; it relies on the user's confirmation and stops Tor when the address changes.

---

## Quick Reference for AI Consumers

```yaml
package_id: 'tor-node'
image: 'Dockerfile (alpine:3.23, tor 0.4.9.14-r0, lyrebird 0.7.0-r6)'
architectures: [x86_64, aarch64]
subcontainers: [tor-sub]
volumes: { main: /data }
file_models: [store.json, torrc]
startos_managed_env_vars: []
dependencies: []
interfaces: { ui: 80, or: 9001, obfs4: 8443 }
actions:
  [
    configure-node,
    confirm-public-ip,
    node-info,
    import-identity,
    export-identity,
  ]
tasks:
  [configure-node (critical), confirm-public-ip (critical, input-not-matches)]
health_checks: [setup, dashboard, tor, reachability]
```
