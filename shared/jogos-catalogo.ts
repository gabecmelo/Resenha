/**
 * Catálogo de exibição dos jogos do hub (`HUB-01`, `HUB-13`, `HUB-14`).
 *
 * Importado por `client/` (desenhar o seletor) e por `server/` (validar
 * `jogoId` recebido antes de criar a sala). Dado estático, não lógica de jogo:
 * o registro de módulos de verdade vive em `server/games/registro.ts`.
 */
import { MIN_JOGADORES } from './protocolo'

export interface JogoCatalogo {
  id: string
  nome: string
  descricao: string
  /** `AD-014` — mínimo de jogadores ativos exigido por este jogo, substitui o antigo `MIN_JOGADORES` único. */
  minJogadores: number
}

/** `HUB-04` — jogo assumido quando a criação da sala não escolhe nenhum. */
export const JOGO_PADRAO = 'quem-sou-eu'

/** O jogo do catálogo, ou `undefined` para um id fora dele. */
export function jogoDoCatalogo(jogoId: string): JogoCatalogo | undefined {
  return CATALOGO_DE_JOGOS.find((jogo) => jogo.id === jogoId)
}

/**
 * `AD-014` — mínimo de jogadores deste jogo. Cai no mínimo do produto para um
 * `jogoId` desconhecido: a tela nunca fica sem número para mostrar, e quem
 * recusa de verdade continua sendo o servidor.
 */
export function minJogadoresDoJogo(jogoId: string): number {
  return jogoDoCatalogo(jogoId)?.minJogadores ?? MIN_JOGADORES
}

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
