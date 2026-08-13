import { describe, expect, it } from 'vitest'
import type { PacoteCompleto } from './pacotes-dados'
import { montarPoolDeCartas } from './pacotes'

function pacote(id: string, cartas: PacoteCompleto['cartas']): PacoteCompleto {
  return { id, jogoId: 'quem-sou-eu', emoji: '🎲', nome: id, descricao: '', quantidade: cartas.length, cartas }
}

describe('montarPoolDeCartas', () => {
  it('um pacote, uma dificuldade: retorna só as cartas daquela dificuldade', () => {
    const filmes = pacote('filmes', [
      { texto: 'A', dificuldade: 'facil' },
      { texto: 'B', dificuldade: 'medio' },
      { texto: 'C', dificuldade: 'dificil' },
    ])

    expect(montarPoolDeCartas([filmes], ['facil'])).toEqual(['A'])
  })

  it('duas dificuldades ativas: inclui as duas, exclui a terceira', () => {
    const filmes = pacote('filmes', [
      { texto: 'A', dificuldade: 'facil' },
      { texto: 'B', dificuldade: 'medio' },
      { texto: 'C', dificuldade: 'dificil' },
    ])

    expect(montarPoolDeCartas([filmes], ['facil', 'medio'])).toEqual(['A', 'B'])
  })

  it('dois pacotes sem sobreposição: pool é a união', () => {
    const filmes = pacote('filmes', [{ texto: 'A', dificuldade: 'facil' }])
    const animes = pacote('animes', [{ texto: 'Z', dificuldade: 'facil' }])

    expect(montarPoolDeCartas([filmes, animes], ['facil'])).toEqual(['A', 'Z'])
  })

  it('texto idêntico em dois pacotes, ambas dificuldades ativas: aparece uma única vez (PKT2-06, PKT2-23)', () => {
    const livros = pacote('livros', [{ texto: 'Harry Potter', dificuldade: 'facil' }])
    const personagensFilmes = pacote('personagens-filmes', [
      { texto: 'Harry Potter', dificuldade: 'dificil' },
    ])

    const pool = montarPoolDeCartas([livros, personagensFilmes], ['facil', 'dificil'])

    expect(pool).toEqual(['Harry Potter'])
  })

  it('texto idêntico onde só a dificuldade da segunda ocorrência passa o filtro: ainda aparece', () => {
    const livros = pacote('livros', [{ texto: 'Harry Potter', dificuldade: 'dificil' }])
    const personagensFilmes = pacote('personagens-filmes', [
      { texto: 'Harry Potter', dificuldade: 'facil' },
    ])

    expect(montarPoolDeCartas([livros, personagensFilmes], ['facil'])).toEqual(['Harry Potter'])
  })

  it('nenhum pacote selecionado: retorna pool vazio (PKT2-21, PKT2-22)', () => {
    expect(montarPoolDeCartas([], ['facil', 'medio', 'dificil'])).toEqual([])
  })

  it('nenhuma dificuldade ativa: retorna pool vazio', () => {
    const filmes = pacote('filmes', [{ texto: 'A', dificuldade: 'facil' }])

    expect(montarPoolDeCartas([filmes], [])).toEqual([])
  })

  it('preserva a ordem de primeira ocorrência na ordem dos pacotes de entrada', () => {
    const filmes = pacote('filmes', [
      { texto: 'A', dificuldade: 'facil' },
      { texto: 'B', dificuldade: 'facil' },
    ])
    const animes = pacote('animes', [{ texto: 'Z', dificuldade: 'facil' }])

    expect(montarPoolDeCartas([filmes, animes], ['facil'])).toEqual(['A', 'B', 'Z'])
  })
})
