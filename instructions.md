# Tor Relay

> **Run this only somewhere that shares no power, internet connection or location with a server hosting onion services** — not on your Tor service's server, and not on another server at the same site. If both can go offline together or share a connection, an attacker can link the onion address to this node's address.

## Documentation

- [Tor Relay Guide](https://community.torproject.org/relay/*) — the Tor Project's guide to running relays and bridges

## What you get on StartOS

- **Dashboard** — reachability, traffic over the last day, week and since install, use of your bandwidth limit, consensus flags and weight, current load, and how often Tor's DoS defenses have acted. Traffic history is kept across restarts; the load and DoS counters start over each time Tor restarts.
- **Tor ORPort** interface (TCP 9001) — where the Tor network reaches the node.
- **obfs4 Bridge Port** interface (TCP 8443) — where censored users reach the node in bridge mode.
- A separate identity for each mode. Switching between relay and bridge never exposes one identity as the other.

## Getting set up

A relay or bridge needs a public IPv4 that does not change. Behind CGNAT or DS-Lite, route one in through a VPS with StartTunnel.

1. Run **Configure Node**: pick relay or bridge, a nickname, contact info and bandwidth limits.
2. Open **Interfaces → Tor ORPort** and enable exactly one public IPv4, for example through your StartTunnel gateway. In bridge mode, enable the same address on **obfs4 Bridge Port** too.
3. Run **Confirm Public IP** and confirm the address is static.
4. Start the service. After about 20 minutes the **Reachability** check turns green, and a few hours later the node appears on Tor Metrics.

## Using Tor Relay

### Actions

- **Node Info** — the fingerprint, the Tor Metrics link and, in bridge mode, the bridge line to share.
- **Configure Node** — change mode, nickname, contact info or bandwidth. Each mode keeps its own identity, so switching back returns to the same fingerprint.
- **Confirm Public IP** — asked for again whenever the public address changes; Tor stays stopped until you confirm the new one.
- **Export Identity** / **Import Identity** — move a relay or bridge between servers with its fingerprint, and for a bridge its bridge line. Never run the same identity in two places at once.

### Moving a relay from the Tor service

If you ran a relay or bridge on the Tor service, its keys are still on your server. Import them into the mode you ran; a bridge gets a new obfs4 bridge line, since the Tor service's bridges had none. Over SSH, print them as one line to paste into **Import Identity**:

```
sudo tar czf - -C /media/startos/data/package-data/volumes/tor/data/tor keys/secret_id_key keys/ed25519_master_id_secret_key | base64 -w0
```

### Moving a relay or bridge from another machine

Stop the old node first. Then pack its identity from its Tor DataDirectory, adding `pt_state/obfs4_state.json` for a bridge, and paste the output into **Import Identity**:

```
tar czf - -C <DataDirectory> keys/secret_id_key keys/ed25519_master_id_secret_key | base64 -w0
```

### After restoring from a backup

Open **Interfaces → Tor ORPort** (and **obfs4 Bridge Port** in bridge mode) and enable the public IPv4 again. If it is the address you confirmed before, the node starts without asking again.

### Traffic limits

Set a **Monthly Traffic Limit** if your VPS has a traffic quota; Tor hibernates once it has used that much in either direction.
