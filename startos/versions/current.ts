import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.9.14:1',
  releaseNotes: {
    en_US: 'The Node Setup health check runs once per start.',
    es_ES:
      'La comprobación de estado Configuración del nodo se ejecuta una vez por inicio.',
    de_DE: 'Die Statusprüfung Knoteneinrichtung läuft einmal pro Start.',
    pl_PL:
      'Kontrola stanu Konfiguracja węzła jest wykonywana raz przy każdym uruchomieniu.',
    fr_FR:
      "La vérification d'état Configuration du nœud s'exécute une fois par démarrage.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
