import type { PacoteDeDedo } from './dedo-dados'

/**
 * `DEDO-21` — junta os pacotes escolhidos num baralho só.
 *
 * Vive em `shared/` porque é conteúdo compartilhado (`AD-012`) e é função pura:
 * o servidor embaralha, a tela nunca chama isso.
 */
export function montarBaralho(pacotes: PacoteDeDedo[]): string[] {
  const vistas = new Set<string>()
  const baralho: string[] = []
  for (const pacote of pacotes) {
    for (const carta of pacote.cartas) {
      // Dois pacotes podem repetir uma pergunta; a mesa não pode vê-la duas vezes.
      if (vistas.has(carta)) continue
      vistas.add(carta)
      baralho.push(carta)
    }
  }
  return baralho
}
