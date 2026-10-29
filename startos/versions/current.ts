import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.9.15:0',
  releaseNotes: {
    en_US:
      "Updates Tor to 0.4.9.15, a security release that strengthens the DoS defenses for relays. The dashboard now keeps traffic history across restarts and shows daily, weekly and monthly charts, bandwidth-limit use, consensus flags and weight, relay load, and Tor's DoS defense counters.",
    es_ES:
      'Actualiza Tor a 0.4.9.15, una versión de seguridad que refuerza las defensas DoS de los relés. El panel ahora conserva el historial de tráfico entre reinicios y muestra gráficos diarios, semanales y mensuales, el uso del límite de ancho de banda, las banderas y el peso en el consenso, la carga del relé y los contadores de las defensas DoS de Tor.',
    de_DE:
      'Aktualisiert Tor auf 0.4.9.15, ein Sicherheits-Release, das die DoS-Abwehr für Relays verstärkt. Das Dashboard behält den Traffic-Verlauf über Neustarts hinweg und zeigt Tages-, Wochen- und Monatsdiagramme, die Auslastung des Bandbreitenlimits, Konsens-Flags und -Gewicht, die Relay-Last sowie die Zähler der DoS-Abwehr von Tor.',
    pl_PL:
      'Aktualizuje Tora do wersji 0.4.9.15, wydania bezpieczeństwa wzmacniającego obronę przekaźników przed DoS. Panel zachowuje teraz historię ruchu między restartami i pokazuje wykresy dzienne, tygodniowe i miesięczne, wykorzystanie limitu przepustowości, flagi i wagę w konsensusie, obciążenie przekaźnika oraz liczniki obrony Tora przed DoS.',
    fr_FR:
      "Met à jour Tor vers 0.4.9.15, une version de sécurité qui renforce les défenses DoS des relais. Le tableau de bord conserve désormais l'historique du trafic entre les redémarrages et affiche des graphiques quotidiens, hebdomadaires et mensuels, l'utilisation de la limite de bande passante, les drapeaux et le poids dans le consensus, la charge du relais et les compteurs des défenses DoS de Tor.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
