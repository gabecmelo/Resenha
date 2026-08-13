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
  /** `AD-014` — mínimo de jogadores ativos exigido por este jogo, substitui o antigo `MIN_JOGADORES` único. */
  minJogadores: number
}

/** `HUB-04` — jogo assumido quando a criação da sala não escolhe nenhum. */
export const JOGO_PADRAO = 'quem-sou-eu'

export const CATALOGO_DE_JOGOS: JogoCatalogo[] = [
  {
    id: 'quem-sou-eu',
    nome: 'Quem Sou Eu?',
    descricao: 'Cada um recebe uma carta que todos veem menos ele.',
    minJogadores: 2,
  },
  {
    id: 'espiao',
    nome: 'Espião',
    descricao: 'Um local secreto é sorteado; só o espião não sabe qual é.',
    minJogadores: 3,
  },
]
