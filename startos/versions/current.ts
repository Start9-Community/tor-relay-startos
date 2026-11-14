import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.9.17:0',
  releaseNotes: {
    en_US:
      "Updates Tor to 0.4.9.17, an emergency security release for relays: the DoS defenses now track IPv6 clients by their /64 prefix instead of each address (TROVE-2026-031), and RESOLVED cells with an invalid hostname are rejected (TROVE-2026-075). It also removes the keys of the bastet directory authority and updates maatuska's address. Relay operators should update as soon as possible.",
    es_ES:
      'Actualiza Tor a 0.4.9.17, una versión de seguridad urgente para relés: las defensas contra DoS ahora agrupan a los clientes IPv6 por su prefijo /64 en lugar de por cada dirección (TROVE-2026-031), y se rechazan las celdas RESOLVED con un nombre de host no válido (TROVE-2026-075). También elimina las claves de la autoridad de directorio bastet y actualiza la dirección de maatuska. Los operadores de relés deberían actualizar lo antes posible.',
    de_DE:
      'Aktualisiert Tor auf 0.4.9.17, ein dringendes Sicherheitsrelease für Relays: Die DoS-Abwehr erfasst IPv6-Clients jetzt nach ihrem /64-Präfix statt nach jeder einzelnen Adresse (TROVE-2026-031), und RESOLVED-Zellen mit ungültigem Hostnamen werden abgelehnt (TROVE-2026-075). Außerdem werden die Schlüssel der Directory Authority bastet entfernt und die Adresse von maatuska aktualisiert. Relay-Betreiber sollten so schnell wie möglich aktualisieren.',
    pl_PL:
      'Aktualizuje Tor do 0.4.9.17, pilnego wydania bezpieczeństwa dla przekaźników: zabezpieczenia przed DoS śledzą teraz klientów IPv6 według prefiksu /64 zamiast każdego adresu osobno (TROVE-2026-031), a komórki RESOLVED z nieprawidłową nazwą hosta są odrzucane (TROVE-2026-075). Usuwa też klucze urzędu katalogowego bastet i aktualizuje adres maatuska. Operatorzy przekaźników powinni zaktualizować jak najszybciej.',
    fr_FR:
      "Met à jour Tor vers 0.4.9.17, une version de sécurité urgente pour les relais : les défenses anti-DoS suivent désormais les clients IPv6 par leur préfixe /64 au lieu de chaque adresse (TROVE-2026-031), et les cellules RESOLVED contenant un nom d'hôte invalide sont rejetées (TROVE-2026-075). Elle supprime aussi les clés de l'autorité d'annuaire bastet et met à jour l'adresse de maatuska. Les opérateurs de relais devraient mettre à jour dès que possible.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
