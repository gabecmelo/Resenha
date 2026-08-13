import type { CartaDoPacote, Dificuldade, PacoteCompleto } from './pacotes-dados'

export type { CartaDoPacote, Dificuldade, PacoteCompleto }

/** `PKT2-18`-like — monta as cartas de um pacote de locais a partir de três listas (fácil/médio/difícil). */
function locais(facil: string[], medio: string[], dificil: string[]): CartaDoPacote[] {
  return [
    ...facil.map((texto): CartaDoPacote => ({ texto, dificuldade: 'facil' })),
    ...medio.map((texto): CartaDoPacote => ({ texto, dificuldade: 'medio' })),
    ...dificil.map((texto): CartaDoPacote => ({ texto, dificuldade: 'dificil' })),
  ]
}

/** `ESP-22` — conteúdo estático dos pacotes de locais de Espião, mesmo formato de `pacotes-dados.ts`. */
export const LOCAIS: PacoteCompleto[] = [
  {
    id: 'locais-classicos',
    emoji: '🗺️',
    nome: 'Locais Clássicos',
    descricao: 'Lugares icônicos, de praças movimentadas a bases secretas.',
    quantidade: 45,
    jogoId: 'espiao',
    cartas: locais(
      [
        'Praia', 'Escola', 'Hospital', 'Restaurante', 'Cinema',
        'Shopping', 'Aeroporto', 'Banco', 'Padaria', 'Academia',
        'Igreja', 'Parque', 'Zoológico', 'Supermercado', 'Praça',
      ],
      [
        'Submarino', 'Estação Espacial', 'Circo', 'Cassino', 'Delegacia de Polícia',
        'Navio de Cruzeiro', 'Acampamento', 'Estúdio de TV', 'Presídio', 'Tribunal',
        'Boate', 'Feira Medieval', 'Spa', 'Hotel de Luxo', 'Fábrica',
      ],
      [
        'Base Militar Secreta', 'Laboratório de Pesquisas', 'Embaixada', 'Plataforma de Petróleo', 'Estação Polar',
        'Bunker Nuclear', 'Mina de Diamantes', 'Torre de Controle de Tráfego Aéreo', 'Reator Nuclear', 'Set de Filmagem de Ficção Científica',
        'Leilão de Arte', 'Fórum Econômico Mundial', 'Escavação Arqueológica', 'Sala de Situação Presidencial', 'Cofre de Sementes',
      ],
    ),
  },
]
