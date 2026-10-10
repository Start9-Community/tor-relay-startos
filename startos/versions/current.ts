import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.9.14-beta.3:0',
  releaseNotes: {
    en_US:
      "Beta 3: in bridge mode, Export Identity also saves obfs4's state and Import Identity restores it, so a bridge keeps its bridge line when it moves to another server.",
    es_ES:
      'Beta 3: en modo puente, Exportar identidad también guarda el estado de obfs4 e Importar identidad lo restaura, así un puente conserva su línea de puente al trasladarse a otro servidor.',
    de_DE:
      'Beta 3: Im Bridge-Modus sichert „Identität exportieren“ auch den obfs4-Zustand, und „Identität importieren“ stellt ihn wieder her. So behält eine Bridge beim Umzug auf einen anderen Server ihre Bridge-Zeile.',
    pl_PL:
      'Beta 3: w trybie mostka Eksportuj tożsamość zapisuje też stan obfs4, a Importuj tożsamość go przywraca, więc mostek zachowuje swoją linię mostka po przeniesieniu na inny serwer.',
    fr_FR:
      "Bêta 3 : en mode pont, Exporter l'identité enregistre aussi l'état d'obfs4 et Importer une identité le restaure ; un pont conserve ainsi sa ligne de pont lorsqu'il change de serveur.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
