import type { Cor } from '../../../shared/protocolo'

/**
 * Nome da cor no protocolo → variável CSS da paleta de jogadores (`SALA-07`).
 *
 * O servidor manda o nome; o valor visual é do cliente, e muda com o tema. O
 * `Record<Cor, string>` obriga o mapa a cobrir as 20 cores: esquecer uma quebra
 * o typecheck.
 */
const VARIAVEL_DA_COR: Record<Cor, string> = {
  vermelho: '--jogador-vermelho',
  laranja: '--jogador-laranja',
  ambar: '--jogador-ambar',
  mostarda: '--jogador-mostarda',
  oliva: '--jogador-oliva',
  folha: '--jogador-folha',
  esmeralda: '--jogador-esmeralda',
  turquesa: '--jogador-turquesa',
  azul: '--jogador-azul',
  indigo: '--jogador-indigo',
  violeta: '--jogador-violeta',
  purpura: '--jogador-purpura',
  magenta: '--jogador-magenta',
  framboesa: '--jogador-framboesa',
  terracota: '--jogador-terracota',
  taupe: '--jogador-taupe',
  salvia: '--jogador-salvia',
  ardosia: '--jogador-ardosia',
  ameixa: '--jogador-ameixa',
  grafite: '--jogador-grafite',
}

/** Valor da cor do jogador, para `style`. Utilitário do Tailwind não serve: o nome é dinâmico. */
export function corDoJogador(cor: Cor): string {
  return `var(${VARIAVEL_DA_COR[cor]})`
}

/** Cor de texto que se lê por cima da cor do jogador, no tema atual. */
export const CONTRASTE_DO_JOGADOR = 'var(--jogador-contraste)'

/**
 * Inicial exibida no marcador. Acompanha a cor porque cor sozinha não
 * diferencia — e o apelido acompanha o marcador em toda lista, carta e mensagem.
 */
export function inicialDoApelido(apelido: string): string {
  return [...apelido.trim()][0]?.toUpperCase() ?? '?'
}
