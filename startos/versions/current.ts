import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.9.14-beta.2:0',
  releaseNotes: {
    en_US:
      'Beta 2: after a restore, re-enabling the same public IPv4 on the interfaces is enough. Confirm Public IP is no longer asked again for an address you already confirmed.',
    es_ES:
      'Beta 2: tras una restauración basta con volver a activar la misma IPv4 pública en las interfaces. Ya no se vuelve a pedir Confirmar IP pública para una dirección ya confirmada.',
    de_DE:
      'Beta 2: Nach einer Wiederherstellung genügt es, dieselbe öffentliche IPv4 an den Schnittstellen wieder zu aktivieren. „Öffentliche IP bestätigen“ wird für eine bereits bestätigte Adresse nicht erneut verlangt.',
    pl_PL:
      'Beta 2: po przywróceniu z kopii wystarczy ponownie włączyć ten sam publiczny IPv4 w interfejsach. Potwierdź publiczny IP nie jest już wymagane ponownie dla adresu, który został już potwierdzony.',
    fr_FR:
      "Bêta 2 : après une restauration, il suffit de réactiver la même IPv4 publique sur les interfaces. Confirmer l'IP publique n'est plus redemandé pour une adresse déjà confirmée.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
