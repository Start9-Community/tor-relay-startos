# Tor Node

Tor Node runs Tor as a **non-exit relay** or an **obfs4 bridge**, never with onion services, and only on a public IPv4 you have confirmed.

## Documentation

- [Tor relay guide](https://community.torproject.org/relay/) — what relays do and what running one involves
- [Bridge setup](https://community.torproject.org/relay/setup/bridge/) — how bridges help censored users
- [Tor Metrics relay search](https://metrics.torproject.org/rs.html) — look up your node by fingerprint

## What you get on StartOS

- **Dashboard** — mode, public address, reachability and traffic.
- **Tor ORPort** interface (TCP 9001) — where the Tor network reaches the node.
- **obfs4 Bridge Port** interface (TCP 8443) — where censored users reach the node in bridge mode.
- A separate identity for each mode. Switching between relay and bridge never exposes one identity as the other.

## Getting set up

A relay or bridge needs a public IPv4 that does not change. Behind CGNAT or DS-Lite, route one in through a VPS with StartTunnel.

1. Run **Configure Node**: pick relay or bridge, a nickname, contact info and bandwidth limits.
2. Open **Interfaces → Tor ORPort** and enable exactly one public IPv4, for example through your StartTunnel gateway. In bridge mode, enable the same address on **obfs4 Bridge Port** too.
3. Run **Confirm Public IP** and confirm the address is static.
4. Start the service. After about 20 minutes the **Reachability** check turns green, and a few hours later the node appears on Tor Metrics. **Node Info** shows the fingerprint, the Metrics link and, in bridge mode, the bridge line.

### Moving an existing relay here

Stop the old relay first. Then pack its two identity keys and paste them into **Import Identity** while the service is stopped:

```
tar czf tor-identity.tgz -C <old DataDirectory> keys/secret_id_key keys/ed25519_master_id_secret_key
base64 -i tor-identity.tgz | pbcopy
```

### When the public IP changes

Tor stops and a task asks you to **Confirm Public IP** again. It stays stopped until you do.

### Using your Tor bandwidth wisely

Each direction can use up to the bandwidth burst. Set a **Monthly Traffic Limit** if your VPS has a traffic quota.
