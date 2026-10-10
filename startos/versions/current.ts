import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.9.14-beta.0:0',
  releaseNotes: {
    en_US:
      'Beta: run a non-exit Tor relay or an obfs4 bridge, with no onion services. Tor 0.4.9.14 and lyrebird 0.7.0.',
    es_ES:
      'Beta: ejecuta un relé Tor sin salida o un puente obfs4, sin servicios onion. Tor 0.4.9.14 y lyrebird 0.7.0.',
    de_DE:
      'Beta: Betreibe ein Tor-Relay ohne Exit oder eine obfs4-Bridge, ohne Onion-Dienste. Tor 0.4.9.14 und lyrebird 0.7.0.',
    pl_PL:
      'Beta: uruchom przekaźnik Tor bez wyjścia lub mostek obfs4, bez usług onion. Tor 0.4.9.14 i lyrebird 0.7.0.',
    fr_FR:
      'Bêta : exécutez un relais Tor sans sortie ou un pont obfs4, sans services onion. Tor 0.4.9.14 et lyrebird 0.7.0.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
