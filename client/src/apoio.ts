/**
 * O Resenha é de graça e sem anúncio. Quem quiser ajudar, ajuda — por vontade
 * própria, nunca por bloqueio.
 *
 * O payload abaixo é um BR Code **estático e reutilizável** (`010211`), sem
 * campo de valor: quem paga escolhe quanto. A chave é aleatória, não é CPF nem
 * telefone. Nome e cidade do recebedor fazem parte do padrão do Banco Central —
 * o pagante sempre os vê antes de confirmar, então não há como omiti-los.
 */
export const PIX_PAYLOAD =
  '00020101021126580014br.gov.bcb.pix0136391a8adb-968b-4b29-a43d-02a54cbeac205204000053039865802BR5919GABRIEL CABRAL MELO6007MARINGA62070503***6304C973'

/** A chave sozinha, para quem prefere colar no campo "chave" do banco. */
export const PIX_CHAVE = '391a8adb-968b-4b29-a43d-02a54cbeac20'

/** Como o nome aparece no app do banco de quem paga. */
export const PIX_RECEBEDOR = 'Gabriel Cabral Melo'

/**
 * CRC-16/CCITT-FALSE sobre o payload inteiro menos os quatro dígitos finais,
 * que é onde o próprio CRC mora (tag `63`).
 *
 * Existe para o teste: um caractere trocado na constante acima gera um QR que
 * o banco recusa **em silêncio**, e isso é o tipo de erro que só aparece com
 * alguém tentando doar de verdade.
 */
export function crcDoPix(payload: string): string {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(payload)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}
