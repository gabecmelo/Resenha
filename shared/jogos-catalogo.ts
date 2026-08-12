/**
 * Catálogo de exibição dos jogos do hub (`HUB-01`, `HUB-13`, `HUB-14`).
 *
 * Importado por `client/` (desenhar o seletor) e por `server/` (validar
 * `jogoId` recebido antes de criar a sala). Dado estático, não lógica de jogo:
 * o registro de módulos de verdade vive em `server/games/registro.ts`.
 */
export interface JogoCatalogo {
  id: string
  nome: string
  descricao: string
}

/** `HUB-04` — jogo assumido quando a criação da sala não escolhe nenhum. */
export const JOGO_PADRAO = 'quem-sou-eu'

export const CATALOGO_DE_JOGOS: JogoCatalogo[] = [
  {
    id: 'quem-sou-eu',
    nome: 'Quem Sou Eu?',
    descricao: 'Cada um recebe uma carta que todos veem menos ele.',
  },
]
