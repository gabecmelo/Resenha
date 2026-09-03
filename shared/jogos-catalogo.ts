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
   * Quanta gente o jogo pede pra ficar bom, quando isso é maior que o mínimo
   * técnico. Não trava nada — o servidor só conhece `minJogadores`. É um aviso
   * na tela pra mesa saber no que está se metendo antes de começar.
   */
  recomendadoJogadores?: number
  /**
   * Anunciado mas ainda não jogável: aparece no seletor pontilhado, sem
   * seleção. Quem recusa de verdade continua sendo o servidor, que valida o
   * `jogoId` contra `REGISTRO_DE_JOGOS` — este campo é só a promessa na tela.
   */
  emBreve?: boolean
  /**
   * `PJ-03`, `PJ-04` — o jogo cabe num aparelho só, passando de mão em mão.
   * Fica de fora quem depende de mão privada permanente: Cartas Contra a Turma
   * tem seis cartas na mão de cada um o tempo inteiro, e passar o aparelho a
   * cada jogada mataria o jogo. A lista do Passa e Joga sai daqui — nenhuma
   * tela do modo cita jogo por nome.
   */
  passaEJoga?: boolean
}

/** Os jogos que rodam num aparelho só (`PJ-03`, `PJ-04`). */
export function jogosDoPassaEJoga(): JogoCatalogo[] {
  return CATALOGO_DE_JOGOS.filter((jogo) => jogo.passaEJoga === true && jogo.emBreve !== true)
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

/**
 * Quantos jogadores este jogo pede pra render, quando isso passa do mínimo.
 * `undefined` quando o mínimo já é o suficiente — a tela não desenha aviso.
 */
export function recomendadoDoJogo(jogoId: string): number | undefined {
  return jogoDoCatalogo(jogoId)?.recomendadoJogadores
}

export const CATALOGO_DE_JOGOS: JogoCatalogo[] = [
  {
    id: 'quem-sou-eu',
    nome: 'Quem Sou Eu?',
    descricao: 'Você não sabe sua carta. Pergunte, deduza, chute.',
    minJogadores: 2,
    passaEJoga: true,
  },
  {
    id: 'espiao',
    nome: 'Espião',
    descricao: 'Todos sabem o local. Menos um. Descubra quem.',
    // Em três, cada pergunta é quase uma acusação e uma votação errada já
    // decide a partida. De quatro pra cima o espião tem onde se esconder, que
    // é o que faz o jogo durar (`ESP-02`).
    minJogadores: 3,
    recomendadoJogadores: 4,
    passaEJoga: true,
  },
  {
    id: 'cartas-contra-a-turma',
    nome: 'Cartas Contra a Turma',
    descricao: 'Uma frase no meio da mesa e a pior resposta possível ganha.',
    // Em três, o juiz escolhe entre duas cartas e o julgamento quase não
    // existe. De quatro pra cima a pilha fica grande o bastante pra ter
    // disputa de verdade (`CCT-02`).
    minJogadores: 3,
    recomendadoJogadores: 4,
  },
  {
    id: 'enigmas-sinistros',
    nome: 'Enigmas Sinistros',
    descricao: 'Uma cena impossível na mesa. Só sim, não e indiferente pra desatar.',
    // Em dois o jogo existe: um narra, o outro desata. Só que sem terceiro não
    // há palpite alheio pra puxar o raciocínio, e o placar vira um contra zero.
    // Deixa jogar, avisa que fica melhor em três (`ENIG-02`).
    minJogadores: 2,
    recomendadoJogadores: 3,
    passaEJoga: true,
  },
  {
    id: 'dedo-na-cara',
    nome: 'Dedo na Cara',
    descricao: 'Quem aqui é mais capaz? A mesa aponta e alguém leva a fama.',
    // Em dupla não existe: sem auto-voto cada um só tem um alvo possível, os
    // dois se apontam e toda carta empata (`DEDO-02`). Rende mesmo de 4 pra
    // cima, quando a votação começa a se dividir.
    minJogadores: 3,
    recomendadoJogadores: 4,
    passaEJoga: true,
  },
]

/** O nome de exibição do jogo, ou o próprio id quando ele não está no catálogo. */
export function nomeDoJogo(jogoId: string): string {
  return jogoDoCatalogo(jogoId)?.nome ?? jogoId
}
