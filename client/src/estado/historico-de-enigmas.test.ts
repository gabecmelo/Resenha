import { describe, expect, it } from 'vitest'
import type { PerguntaProjetada, RespostaDoNarrador } from '../../../shared/protocolo'
import { contarPorAba, linhasDoHistorico } from './historico-de-enigmas'

function pergunta(
  id: number,
  resposta: RespostaDoNarrador | null,
  texto = `pergunta ${id}`,
): PerguntaProjetada {
  return { id, texto, autor: { id: `j${id}`, apelido: `j${id}` }, resposta }
}

describe('linhasDoHistorico', () => {
  it('numera pela ordem em que a pergunta foi feita, e não pela posição na lista', () => {
    // A 2 ainda está na fila: a 3 continua sendo a 3.
    const linhas = linhasDoHistorico(
      [pergunta(1, 'sim'), pergunta(2, null), pergunta(3, 'nao')],
      'tudo',
    )
    expect(linhas.map((l) => l.numero)).toEqual([1, 3])
  })

  it('o número não muda quando a mesa troca de aba', () => {
    const perguntas = [pergunta(1, 'nao'), pergunta(2, 'sim'), pergunta(3, 'nao'), pergunta(4, 'sim')]
    const numeroNoTudo = new Map(
      linhasDoHistorico(perguntas, 'tudo').map((l) => [l.pergunta.id, l.numero]),
    )
    for (const aba of ['sim', 'nao', 'naoImporta'] as const) {
      for (const linha of linhasDoHistorico(perguntas, aba)) {
        expect(linha.numero).toBe(numeroNoTudo.get(linha.pergunta.id))
      }
    }
  })

  it('cada aba mostra só as respostas dela, na ordem', () => {
    const perguntas = [
      pergunta(1, 'sim'),
      pergunta(2, 'naoImporta'),
      pergunta(3, 'sim'),
      pergunta(4, 'nao'),
    ]
    expect(linhasDoHistorico(perguntas, 'sim').map((l) => l.numero)).toEqual([1, 3])
    expect(linhasDoHistorico(perguntas, 'nao').map((l) => l.numero)).toEqual([4])
    expect(linhasDoHistorico(perguntas, 'naoImporta').map((l) => l.numero)).toEqual([2])
  })

  it('pergunta ainda na fila nunca aparece no histórico', () => {
    expect(linhasDoHistorico([pergunta(1, null)], 'tudo')).toEqual([])
  })

  it('a batida de voz sem anotação entra igual, valendo pelo número', () => {
    const linhas = linhasDoHistorico([pergunta(1, 'sim', '')], 'tudo')
    expect(linhas).toHaveLength(1)
    expect(linhas[0]!.numero).toBe(1)
    expect(linhas[0]!.pergunta.texto).toBe('')
  })
})

describe('contarPorAba', () => {
  it('conta só as respondidas, e tudo é a soma das três', () => {
    const contagem = contarPorAba([
      pergunta(1, 'sim'),
      pergunta(2, 'sim'),
      pergunta(3, 'nao'),
      pergunta(4, 'naoImporta'),
      pergunta(5, null),
    ])
    expect(contagem).toEqual({ tudo: 4, sim: 2, nao: 1, naoImporta: 1 })
  })

  it('sem pergunta nenhuma, tudo zero', () => {
    expect(contarPorAba([])).toEqual({ tudo: 0, sim: 0, nao: 0, naoImporta: 0 })
  })
})
