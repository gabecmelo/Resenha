import type { EnigmaDoPacote, PacoteDeEnigmas } from './enigmas-dados'

/**
 * `ENIG-31` — junta os pacotes escolhidos num baralho só.
 *
 * Vive em `shared/` porque é conteúdo compartilhado (`AD-012`) e é função pura:
 * o servidor embaralha, a tela nunca chama isso.
 */
export function montarBaralho(pacotes: PacoteDeEnigmas[]): EnigmaDoPacote[] {
  const vistas = new Set<string>()
  const baralho: EnigmaDoPacote[] = []
  for (const pacote of pacotes) {
    for (const enigma of pacote.enigmas) {
      // Dois pacotes podem repetir uma cena; a mesa não pode vê-la duas vezes.
      if (vistas.has(enigma.cena)) continue
      vistas.add(enigma.cena)
      baralho.push(enigma)
    }
  }
  return baralho
}
