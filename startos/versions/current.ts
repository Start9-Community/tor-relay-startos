import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.9.15:1',
  releaseNotes: {
    en_US:
      'Adds an Outbound Gateway health check that fails when Tor would connect to other relays from a different address than the one it publishes. Requires StartOS 0.4.1 or later.',
    es_ES:
      'Añade una comprobación de estado Puerta de enlace de salida que falla cuando Tor se conectaría a otros relés desde una dirección distinta de la que publica. Requiere StartOS 0.4.1 o posterior.',
    de_DE:
      'Fügt eine Integritätsprüfung „Ausgehendes Gateway“ hinzu, die fehlschlägt, wenn Tor sich von einer anderen Adresse als der veröffentlichten mit anderen Relays verbinden würde. Erfordert StartOS 0.4.1 oder neuer.',
    pl_PL:
      'Dodaje kontrolę stanu Brama wychodząca, która zgłasza błąd, gdy Tor łączyłby się z innymi przekaźnikami z innego adresu niż ten, który publikuje. Wymaga StartOS 0.4.1 lub nowszego.',
    fr_FR:
      "Ajoute une vérification d'état Passerelle sortante, qui échoue lorsque Tor se connecterait aux autres relais depuis une adresse différente de celle qu'il publie. Nécessite StartOS 0.4.1 ou ultérieur.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
