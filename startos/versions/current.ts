import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.9.14-beta.1:0',
  releaseNotes: {
    en_US:
      "Beta 1: the health checks keep one control connection to Tor open instead of reconnecting on every poll, so the log no longer fills with 'New control connection opened'.",
    es_ES:
      "Beta 1: las comprobaciones de estado mantienen abierta una sola conexión de control con Tor en lugar de reconectar en cada sondeo, así que el registro ya no se llena de 'New control connection opened'.",
    de_DE:
      "Beta 1: Die Statusprüfungen halten eine einzige Steuerverbindung zu Tor offen, statt sich bei jeder Abfrage neu zu verbinden. Das Log füllt sich nicht mehr mit 'New control connection opened'.",
    pl_PL:
      "Beta 1: kontrole stanu utrzymują jedno otwarte połączenie sterujące z Torem zamiast łączyć się przy każdym odpytaniu, więc dziennik nie zapełnia się już wpisami 'New control connection opened'.",
    fr_FR:
      "Bêta 1 : les vérifications d'état gardent une seule connexion de contrôle ouverte vers Tor au lieu de se reconnecter à chaque interrogation ; le journal ne se remplit plus de 'New control connection opened'.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
