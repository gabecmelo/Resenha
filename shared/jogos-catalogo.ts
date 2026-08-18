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
  /**
   * Anunciado mas ainda não jogável: aparece no seletor pontilhado, sem
   * seleção. Quem recusa de verdade continua sendo o servidor, que valida o
   * `jogoId` contra `REGISTRO_DE_JOGOS` — este campo é só a promessa na tela.
   */
  emBreve?: boolean
}

/** Os jogos que dá para escolher agora — o "em breve" fica de fora. */
export function jogosJogaveis(): JogoCatalogo[] {
  return CATALOGO_DE_JOGOS.filter((jogo) => jogo.emBreve !== true)
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
    descricao: 'Você não sabe sua carta. Pergunte, deduza, chute.',
    minJogadores: 2,
  },
  {
    id: 'espiao',
    nome: 'Espião',
    descricao: 'Todos sabem o local. Menos um. Descubra quem.',
    minJogadores: 3,
  },
  {
    id: 'cartas-contra-a-turma',
    nome: 'Cartas Contra a Turma',
    descricao: 'Uma frase no meio da mesa e a pior resposta possível ganha.',
    minJogadores: 3,
    emBreve: true,
  },
  {
    id: 'enigmas-macabros',
    nome: 'Enigmas Macabros',
    descricao: 'Uma cena impossível na mesa. Só sim, não e talvez pra desatar.',
    minJogadores: 3,
    emBreve: true,
  },
]

/** O nome de exibição do jogo, ou o próprio id quando ele não está no catálogo. */
export function nomeDoJogo(jogoId: string): string {
  return jogoDoCatalogo(jogoId)?.nome ?? jogoId
}
