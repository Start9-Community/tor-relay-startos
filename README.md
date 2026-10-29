<p align="center">
  <img src="icon.svg" alt="Tor Relay Logo" width="21%">
</p>

# Tor Relay on StartOS

> Everything not listed in this document should behave the same as upstream
> Tor. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation section of
> `instructions.md` for links.

Runs [Tor](https://gitlab.torproject.org/tpo/core/tor) as a non-exit relay or an obfs4 bridge. It never runs onion services or a SOCKS port and never lets traffic exit, and Tor starts only on a public IPv4 the user has confirmed.

---

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

---

## Image and Container Runtime

The image is built from the package's `Dockerfile`: Alpine with its `tor` and `lyrebird` (obfs4) packages pinned, plus `busybox-extras` for the dashboard.

| Property      | Value                                 |
| ------------- | ------------------------------------- |
| Image         | Custom `Dockerfile` on Alpine         |
| Architectures | x86_64, aarch64                       |
| Subcontainer  | `tor-sub`, shared by every process    |
| Entrypoint    | Set per daemon by the package (below) |

`tor-sub` runs three processes: a `prepare` oneshot that creates the active mode's DataDirectory and hands it to the `tor` user, `tor -f /data/torrc` as user `tor`, and `busybox-extras httpd` serving the dashboard from `/www` on port 80.

The `tor` health check polls Tor every 30 seconds over the control socket and Tor's Prometheus MetricsPort (`127.0.0.1:9035`, loopback only, no interface). It writes the result to `status.json` and adds the traffic since the last poll to `history.json`. The dashboard shows traffic totals and charts from `history.json`, the current rate against the configured bandwidth limit, consensus flags and weight (relay mode), open circuits, relay connections, circuit handshakes, directory requests, and every `tor_relay_dos_total` counter (the `begindir_*` ones need Tor 0.4.9.15) together with overload signals.

## Volume and Data Layout

Everything lives on the single `main` volume, mounted at `/data`. Each mode has its own DataDirectory and therefore its own identity.

| Path           | Contents                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store.json`   | Package settings (see File Models)                                                                                                                   |
| `torrc`        | Rendered on every start                                                                                                                              |
| `status.json`  | Written every health-check cycle; read by the dashboard                                                                                              |
| `history.json` | Lifetime traffic totals, hourly (31 days) and daily (3 years) buckets, and Tor start count; saved every 5 minutes, so a stop loses at most 5 minutes |
| `relay/`       | Tor DataDirectory and identity for relay mode                                                                                                        |
| `bridge/`      | Tor DataDirectory and identity for bridge mode, including `pt_state/` for obfs4                                                                      |

## File Models

The package owns both files it writes; neither keeps a hand edit.

| File         | Seeded by                                                                                                                                                                              | Rewritten                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `store.json` | Configure Node (`configured`, `mode`, `nickname`, `contactInfo`, `bandwidthRate`/`bandwidthBurst` in KB/s, `accountingMax` in GB per month or null); Confirm Public IP (`confirmedIp`) | Only by those actions. `main` restarts whenever it changes. |
| `torrc`      | `main`, from `store.json` and the ORPort binding                                                                                                                                       | On every start. Hand edits are overwritten.                 |

## Dependencies

None.

## Network Access and Interfaces

Three interfaces. The two Tor ports are raw TCP passed through as-is; Tor negotiates its own TLS.

| Interface         | ID      | Type | Port                    | Purpose                                                                                          |
| ----------------- | ------- | ---- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| Dashboard         | `ui`    | ui   | 80 (HTTP)               | Status page: reachability, traffic history, bandwidth limit, consensus flags, load, DoS counters |
| Tor ORPort        | `or`    | p2p  | 9001 (TCP, passthrough) | Tor network traffic; needs exactly one public IPv4                                               |
| obfs4 Bridge Port | `obfs4` | p2p  | 8443 (TCP, passthrough) | obfs4 clients in bridge mode; needs the same public IPv4                                         |

When StartOS assigns an external ORPort other than 9001, the torrc advertises the external port with `NoListen` and listens on 9001 with `NoAdvertise`. The obfs4 port has no such split: bridge mode refuses to start unless it is reachable on 8443. IPv6 is advertised only when a public IPv6 is enabled on the ORPort.

## Installation and First-Run Flow

Tor stays stopped until the node is configured and its public address confirmed; both are critical tasks, so the user meets them in this order:

1. Configure Node.
2. Enable one public IPv4 on the Tor ORPort interface, and in bridge mode the same one on obfs4 Bridge Port.
3. Confirm Public IP.
4. Start. Tor's reachability self-test and descriptor upload take about 20 minutes.

## Actions

None of the actions is hidden. Configure Node and Confirm Public IP are also the targets of the two tasks.

| Action            | When to run it                                      | What it changes                                                                                                                                                                                             | Repeat safety                                                     |
| ----------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Configure Node    | First setup; to change mode, nickname or limits     | `store.json`; restarts the service. Changing mode switches to that mode's identity, creating it on first start in that mode.                                                                                | Safe                                                              |
| Confirm Public IP | First setup; after the ORPort's public IPv4 changes | `confirmedIp`. Refuses an input that is not the ORPort's single public IPv4, is not public, or is not confirmed as static.                                                                                  | Safe                                                              |
| Node Info         | To find the fingerprint or share a bridge line      | Nothing. Returns the fingerprint, the Tor Metrics link (hashed fingerprint for bridges), and in bridge mode the bridge line.                                                                                | Safe                                                              |
| Import Identity   | Moving an existing relay or bridge here             | Replaces the chosen mode's `secret_id_key` and `ed25519_master_id_secret_key` and deletes the keys Tor derives from them; in bridge mode also restores `pt_state/obfs4_state.json` when the archive has it. | Destructive: the mode's previous identity is gone unless exported |
| Export Identity   | Moving this node to another machine                 | Nothing. Returns the chosen mode's two identity keys as a base64 `.tar.gz`, plus `pt_state/obfs4_state.json` in bridge mode.                                                                                | Safe                                                              |

Running an exported identity in two places at once gets both flagged by the directory authorities; stop one first.

## Tasks

Both tasks are critical, so the service cannot start while either is open.

| Task              | Raised when                                                                                                          | Cleared when                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configure Node    | Configure Node has never been run                                                                                    | Configure Node runs. Does not return.                                                                                                                                |
| Confirm Public IP | The ORPort's single public IPv4 differs from the confirmed one — it changed, was removed, or gained a second address | Confirm Public IP runs with the current address, or the address returns to the confirmed one (as after re-enabling it following a restore). Returns on every change. |

## Health Checks

`Node Setup` replaces the Tor checks while Tor is held back; once it starts, `Tor` and `Reachability` take over.

| Check        | Probes                                                                  | Failure means                                                                                                                      |
| ------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Node Setup   | Nothing; present only while Tor is held back                            | Its message names what is missing: configuration, the public IPv4, its confirmation, or (bridge mode) the obfs4 address or port.   |
| Dashboard    | Port 80 listening                                                       | The dashboard process died.                                                                                                        |
| Tor          | Bootstrap progress over the control socket                              | Loading while bootstrapping; stuck below 100% means Tor cannot reach the network.                                                  |
| Reachability | Tor's ORPort self-test and the directory's acceptance of the descriptor | Loading for the first 20 minutes (45 with a public IPv6), then failure: the public IPv4's port forward does not reach this server. |

## Backups and Restore

The whole `main` volume is copied (`ofVolumes`), including both identities, the obfs4 state and the confirmed IP. StartOS does not restore which addresses were enabled on the interfaces, so a restored node stays stopped until the user enables the public IPv4 again; if it is the confirmed address, the task clears without re-confirming. Restoring onto a second server while the first still runs puts the same identity online twice.

## Limitations and Differences

1. A relay or bridge that shares power, an internet connection or a location with anything hosting onion services can be linked to those onion addresses: outages that coincide, and load on a shared connection, give the link away. A separate process or server at the same site does not prevent it, and routing the ORPort through StartTunnel does not either, since the node still runs and loses power at home. The package cannot detect this.
2. No exit relay mode, no SOCKS port, no onion services.
3. obfs4 is the only pluggable transport.
4. The package cannot tell whether an address is static; it relies on the user's confirmation and stops Tor when the address changes.

---

## Quick Reference for AI Consumers

```yaml
package_id: tor-relay
image: Dockerfile (alpine, tor, lyrebird)
architectures: [x86_64, aarch64]
subcontainers: [tor-sub]
volumes:
  main: /data
file_models:
  - store.json
  - torrc
startos_managed_env_vars: []
dependencies: none
interfaces:
  ui: { type: ui, port: 80 }
  or: { type: p2p, port: 9001 }
  obfs4: { type: p2p, port: 8443 }
actions:
  - configure-node
  - confirm-public-ip
  - node-info
  - import-identity
  - export-identity
tasks:
  - { action: configure-node, severity: critical }
  - { action: confirm-public-ip, severity: critical }
health_checks:
  - setup
  - dashboard
  - tor
  - reachability
```
