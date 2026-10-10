import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.9.14:0',
  releaseNotes: {
    en_US:
      'First release. Runs Tor as a non-exit relay or an obfs4 bridge, never with onion services, and only on a public IPv4 you confirm; Tor stops and asks again if that address changes. Each mode keeps its own identity, and Import and Export Identity move a relay or bridge between servers with its fingerprint and, for a bridge, its bridge line. Tor 0.4.9.14, lyrebird 0.7.0.',
    es_ES:
      'Primera versión. Ejecuta Tor como relé sin salida o como puente obfs4, nunca con servicios onion, y solo en una IPv4 pública que confirmes; Tor se detiene y vuelve a preguntar si esa dirección cambia. Cada modo conserva su propia identidad, e Importar y Exportar identidad trasladan un relé o puente entre servidores con su huella y, en el caso de un puente, su línea de puente. Tor 0.4.9.14, lyrebird 0.7.0.',
    de_DE:
      'Erste Version. Betreibt Tor als Relay ohne Exit oder als obfs4-Bridge, nie mit Onion-Diensten und nur auf einer öffentlichen IPv4, die Sie bestätigen; ändert sich diese Adresse, stoppt Tor und fragt erneut. Jeder Modus behält seine eigene Identität, und „Identität importieren“ und „Identität exportieren“ ziehen ein Relay oder eine Bridge samt Fingerprint und, bei einer Bridge, Bridge-Zeile auf einen anderen Server um. Tor 0.4.9.14, lyrebird 0.7.0.',
    pl_PL:
      'Pierwsze wydanie. Uruchamia Tora jako przekaźnik bez wyjścia lub mostek obfs4, nigdy z usługami onion, i tylko na potwierdzonym przez ciebie publicznym IPv4; jeśli ten adres się zmieni, Tor zatrzymuje się i pyta ponownie. Każdy tryb ma własną tożsamość, a Importuj i Eksportuj tożsamość przenoszą przekaźnik lub mostek między serwerami wraz z odciskiem, a w przypadku mostka także z linią mostka. Tor 0.4.9.14, lyrebird 0.7.0.',
    fr_FR:
      "Première version. Exécute Tor en relais sans sortie ou en pont obfs4, jamais avec des services onion, et uniquement sur une IPv4 publique que vous confirmez ; si cette adresse change, Tor s'arrête et redemande. Chaque mode conserve sa propre identité, et Importer et Exporter l'identité déplacent un relais ou un pont entre serveurs avec son empreinte et, pour un pont, sa ligne de pont. Tor 0.4.9.14, lyrebird 0.7.0.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
