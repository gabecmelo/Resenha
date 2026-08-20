import { describe, expect, it } from 'vitest'
import { PIX_CHAVE, PIX_PAYLOAD, crcDoPix } from './apoio'

/**
 * O BR Code não tem validação em tempo de execução: um payload corrompido vira
 * um QR bonito que o banco simplesmente recusa. Estes testes são a única rede.
 */
describe('o BR Code do Pix', () => {
  it('fecha com o CRC que o próprio payload declara', () => {
    const corpo = PIX_PAYLOAD.slice(0, -4)
    const declarado = PIX_PAYLOAD.slice(-4)

    expect(crcDoPix(corpo)).toBe(declarado)
  })

  it('carrega a mesma chave que a tela oferece para copiar', () => {
    expect(PIX_PAYLOAD).toContain(PIX_CHAVE)
  })

  it('é estático e reutilizável, então serve a mais de uma doação', () => {
    // Tag `01` = método de iniciação. `11` é reutilizável; `12` seria de uso único.
    expect(camposDoBrCode(PIX_PAYLOAD).get('01')).toBe('11')
  })

  it('não fixa valor — quem doa escolhe quanto', () => {
    const campos = camposDoBrCode(PIX_PAYLOAD)

    expect(campos.has('54')).toBe(false)
  })

  it('tem os campos obrigatórios do Banco Central', () => {
    const campos = camposDoBrCode(PIX_PAYLOAD)

    expect(campos.get('58')).toBe('BR')
    expect(campos.get('53')).toBe('986') // real
    expect(campos.get('26')).toContain('br.gov.bcb.pix')
    expect(campos.get('59')?.length).toBeGreaterThan(0) // recebedor
    expect(campos.get('60')?.length).toBeGreaterThan(0) // cidade
  })
})

/** Desmonta o TLV de primeiro nível: duas casas de tag, duas de tamanho, o valor. */
function camposDoBrCode(payload: string): Map<string, string> {
  const campos = new Map<string, string>()
  let i = 0
  while (i < payload.length) {
    const tag = payload.slice(i, i + 2)
    const tamanho = Number(payload.slice(i + 2, i + 4))
    if (Number.isNaN(tamanho)) throw new Error(`tamanho ilegível na tag ${tag}`)
    campos.set(tag, payload.slice(i + 4, i + 4 + tamanho))
    i += 4 + tamanho
  }
  return campos
}
