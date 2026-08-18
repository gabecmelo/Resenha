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
  {
    id: 'locais-brasil',
    emoji: '🇧🇷',
    nome: 'Bem Brasileiro',
    descricao: 'Lugares que só existem por aqui — da laje do churrasco ao Congresso.',
    quantidade: 45,
    jogoId: 'espiao',
    cartas: locais(
      [
        'Boteco da Esquina', 'Churrasco na Laje', 'Feira Livre', 'Rodoviária', 'Posto de Gasolina',
        'Salão de Beleza do Bairro', 'Campinho de Várzea', 'Farmácia', 'Loja de 1,99', 'Açaiteria',
        'Pastelaria da Feira', 'Ponto de Ônibus', 'Lanchonete de Escola', 'Lava-Jato', 'Sorveteria',
      ],
      [
        'Bloco de Carnaval', 'Festa Junina', 'Churrascaria Rodízio', 'Balada Sertaneja', 'Casa de Praia Alugada',
        'Motel de Beira de Estrada', 'Cartório', 'Detran', 'Posto de Saúde', 'Autoescola',
        'Mercado Municipal', 'Quadra de Escola de Samba', 'Camarote de Estádio', 'Casa de Show do Interior', 'Pesque-Pague',
      ],
      [
        'Assembleia Legislativa', 'Congresso Nacional', 'Bolsa de Valores', 'Usina Hidrelétrica', 'Porto de Santos',
        'Refinaria de Petróleo', 'Usina de Cana-de-Açúcar', 'Central de Reciclagem', 'Barragem de Rejeitos', 'Estação Ecológica',
        'Fórum do Interior', 'Central de Abastecimento', 'Terminal de Cargas', 'Estação de Tratamento de Água', 'Arquipélago de Fernando de Noronha',
      ],
    ),
  },
  {
    id: 'locais-trampo',
    emoji: '💼',
    nome: 'Mundo do Trabalho',
    descricao: 'Onde a mesa passa o dia. Fácil fingir que já trabalhou lá.',
    quantidade: 45,
    jogoId: 'espiao',
    cartas: locais(
      [
        'Escritório', 'Call Center', 'Loja de Roupas', 'Obra em Construção', 'Oficina Mecânica',
        'Consultório Odontológico', 'Barbearia', 'Cozinha de Restaurante', 'Caminhão de Entregas', 'Depósito de Loja',
        'Sala de Reunião', 'Recepção de Hotel', 'Estacionamento', 'Pet Shop', 'Papelaria',
      ],
      [
        'Redação de Jornal', 'Estúdio de Rádio', 'Agência de Publicidade', 'Galpão de Logística', 'Frigorífico',
        'Canteiro de Obras do Metrô', 'Fazenda de Gado', 'Estufa de Flores', 'Laboratório de Análises Clínicas', 'Casa de Repouso',
        'Coworking', 'Cozinha Industrial', 'Depósito de Bebidas', 'Concessionária de Carros', 'Gráfica',
      ],
      [
        'Data Center', 'Sala de Servidores', 'Central de Emergência 190', 'Centro Cirúrgico', 'Estaleiro',
        'Sonda de Perfuração', 'Subestação de Energia', 'Fábrica de Vacinas', 'Mesa de Operações Financeiras', 'Sala de Auditoria',
        'Centro de Distribuição Automatizado', 'Planta de Dessalinização', 'Fábrica de Semicondutores', 'Laboratório de Perícia Criminal', 'Sala de Controle de Represa',
      ],
    ),
  },
  {
    id: 'locais-fantasia',
    emoji: '🐉',
    nome: 'Fantasia e Ficção',
    descricao: 'Lugares que ninguém visitou — e todo mundo sabe descrever.',
    quantidade: 45,
    jogoId: 'espiao',
    cartas: locais(
      [
        'Castelo Medieval', 'Nave Espacial', 'Ilha do Tesouro', 'Caverna do Dragão', 'Floresta Encantada',
        'Escola de Magia', 'Vila Viking', 'Torre do Mago', 'Arena de Gladiadores', 'Navio Pirata',
        'Cidade Submersa', 'Fábrica de Chocolate', 'Oficina do Papai Noel', 'Reino de Gelo', 'Portal Dimensional',
      ],
      [
        'Colônia em Marte', 'Estação Orbital Abandonada', 'Laboratório de Clonagem', 'Cidade Cyberpunk', 'Deserto Pós-Apocalíptico',
        'Bunker de Sobreviventes', 'Torre de Vigia Élfica', 'Mercado de Feiticeiras', 'Biblioteca Infinita', 'Coliseu Flutuante',
        'Mina dos Anões', 'Barco Fantasma', 'Prisão Interdimensional', 'Zoológico de Criaturas Míticas', 'Templo Perdido',
      ],
      [
        'Conselho dos Reinos', 'Forja das Estrelas', 'Necrópole Élfica', 'Observatório do Tempo', 'Estação de Salto Hiperespacial',
        'Arquivo dos Mundos', 'Jardim das Almas', 'Oficina de Golens', 'Cúpula de Terraformação', 'Museu de Artefatos Proibidos',
        'Corte dos Sonhos', 'Fenda do Vazio', 'Cidadela Flutuante', 'Ninho do Leviatã', 'Poço das Memórias',
      ],
    ),
  },
  {
    id: 'locais-sinistros',
    emoji: '💀',
    nome: 'Sinistros',
    descricao: 'Lugares que a mesa não visitaria à noite. Tom pesado.',
    quantidade: 45,
    jogoId: 'espiao',
    cartas: locais(
      [
        'Cemitério à Meia-Noite', 'Casa Mal-Assombrada', 'Necrotério', 'Hospital Abandonado', 'Manicômio Desativado',
        'Floresta Escura', 'Porão Alagado', 'Sótão Empoeirado', 'Igreja Abandonada', 'Escola Abandonada',
        'Túnel Sem Luz', 'Parque de Diversões Abandonado', 'Velório', 'Cripta', 'Casa de Sessão Espírita',
      ],
      [
        'Laboratório de Taxidermia', 'Casa de Bonecas Antigas', 'Ossuário', 'Estrada Deserta na Madrugada', 'Fábrica Abandonada',
        'Poço Seco', 'Navio Encalhado', 'Elevador Parado', 'Sanatório na Montanha', 'Depósito de Manequins',
        'Circo Fechado', 'Farol Abandonado', 'Túmulo de Família', 'Casa de Leilão de Relíquias', 'Hotel Fechado na Temporada',
      ],
      [
        'Câmara Mortuária Refrigerada', 'Arquivo de Casos Não Resolvidos', 'Sala de Autópsia', 'Bunker Esquecido', 'Instituto Médico Legal',
        'Cemitério de Navios', 'Mina Desativada', 'Vila Fantasma', 'Zona de Exclusão', 'Catacumbas',
        'Laboratório de Doenças Infecciosas', 'Depósito de Provas Criminais', 'Estação de Trem Fantasma', 'Convento em Ruínas', 'Sala de Espera de Hospital Vazio',
      ],
    ),
  },
]
