import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.9.15:2',
  releaseNotes: {
    en_US:
      'The ORPort and the obfs4 bridge port now accept connections over IPv6 as well as IPv4, so every address StartOS shows for them works. Requires StartOS 0.4.2 or later.',
    es_ES:
      'El ORPort y el puerto de puente obfs4 ahora aceptan conexiones por IPv6 además de IPv4, así que todas las direcciones que StartOS muestra para ellos funcionan. Requiere StartOS 0.4.2 o posterior.',
    de_DE:
      'Der ORPort und der obfs4-Bridge-Port nehmen Verbindungen jetzt auch über IPv6 an, nicht nur über IPv4, sodass jede Adresse funktioniert, die StartOS für sie anzeigt. Erfordert StartOS 0.4.2 oder neuer.',
    pl_PL:
      'ORPort i port mostka obfs4 przyjmują teraz połączenia przez IPv6, a nie tylko przez IPv4, więc działa każdy adres, który StartOS dla nich pokazuje. Wymaga StartOS 0.4.2 lub nowszego.',
    fr_FR:
      "L'ORPort et le port de pont obfs4 acceptent désormais les connexions en IPv6 comme en IPv4 : chaque adresse que StartOS affiche pour eux fonctionne. Nécessite StartOS 0.4.2 ou ultérieur.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
