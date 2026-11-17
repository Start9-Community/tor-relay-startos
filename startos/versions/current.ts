import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.9.17:2',
  releaseNotes: {
    en_US:
      'The dashboard now runs as an unprivileged user. Contact Info no longer accepts a trailing backslash.',
    es_ES:
      'El panel ahora se ejecuta como un usuario sin privilegios. La información de contacto ya no admite una barra invertida final.',
    de_DE:
      'Das Dashboard läuft jetzt als nicht privilegierter Benutzer. Die Kontaktinformation akzeptiert keinen abschließenden Backslash mehr.',
    pl_PL:
      'Panel działa teraz jako użytkownik bez uprawnień. Informacje kontaktowe nie akceptują już końcowego ukośnika wstecznego.',
    fr_FR:
      "Le tableau de bord s'exécute désormais sous un utilisateur non privilégié. Les coordonnées n'acceptent plus de barre oblique inverse finale.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
