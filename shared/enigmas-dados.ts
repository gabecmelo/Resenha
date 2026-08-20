/**
 * `ENIG-30`…`ENIG-32` — conteúdo estático do Enigmas Sinistros.
 *
 * Formato próprio (e não `PacoteCompleto`): aqui uma carta tem **duas faces** —
 * a cena, que a mesa toda lê, e a solução, que só o narrador vê. Não há
 * dificuldade; o que separa os pacotes é o **tom**, escolhido no lobby.
 * Adicionar um pacote é adicionar um item nesta lista; nada mais muda.
 */
export interface EnigmaDoPacote {
  /** O que a mesa lê. Uma cena que não fecha sozinha. */
  cena: string
  /** O que desata. Só entra na projeção do narrador (`ENIG-05`). */
  solucao: string
}

export interface PacoteDeEnigmas {
  id: string
  emoji: string
  nome: string
  descricao: string
  /** Total de enigmas do pacote, para o resumo do lobby. */
  quantidade: number
  jogoId: string
  /** `ENIG-30` — o que a mesa está escolhendo de verdade ao marcar o pacote. */
  tom: 'leve' | 'pesado'
  enigmas: EnigmaDoPacote[]
}

const CASOS_ESTRANHOS: EnigmaDoPacote[] = [
  {
    cena: 'Todo dia, às seis da manhã, ele compra um pão na padaria e joga no lixo da esquina. Faz trinta anos.',
    solucao:
      'Ele é o antigo dono da padaria. Vendeu o ponto há trinta anos e desde então compra um pão por dia pra conferir se mantiveram a receita dele. Nunca mantiveram, e ele nunca disse nada.',
  },
  {
    cena: 'Ela apagou todas as luzes da casa e só então conseguiu achar o que estava procurando.',
    solucao: 'Procurava o vaga-lume que tinha entrado pela janela e sumido na sala.',
  },
  {
    cena: 'O porteiro jurava que o elevador subia sozinho toda tarde, sempre no mesmo horário. Ele estava certo.',
    solucao:
      'O gato do décimo segundo desce pela escada de manhã e volta de elevador, se apoiando no botão com a pata. Sempre depois do almoço.',
  },
  {
    cena: 'O homem pediu um copo d’água no bar. O barman apontou uma arma pra ele. Ele agradeceu e foi embora.',
    solucao: 'Ele estava com soluço. O susto resolveu, e os dois sabiam disso.',
  },
  {
    cena: 'O quadro caiu da parede e salvou a vida do dono.',
    solucao:
      'Ele se abaixou pra pegar o quadro no instante exato em que o forro do teto cedeu em cima da poltrona onde ele estava sentado.',
  },
  {
    cena: 'Ele estudou seis meses para uma prova, foi muito bem, e rasgou o resultado sem abrir o envelope.',
    solucao:
      'Prestou a prova só pra provar a si mesmo que conseguia passar. A carreira ele já tinha decidido não seguir antes mesmo de começar a estudar.',
  },
  {
    cena: 'Todos os funcionários chegaram no horário. Nenhum conseguiu entrar.',
    solucao:
      'A empresa mudou de prédio no fim de semana e o aviso só foi mandado no grupo do turno da tarde.',
  },
  {
    cena: 'Ela manda a mesma mensagem para o marido todo dia há dez anos. Ele nunca respondeu, e ela nunca reclamou.',
    solucao:
      'O marido morreu. Ela mantém a linha dele ativa e manda bom dia todo dia — sabe que ninguém lê, e é exatamente por isso que continua.',
  },
  {
    cena: 'O carro estava com o tanque cheio, a bateria nova e o motorista com a chave na mão. Não saiu do lugar.',
    solucao:
      'Ele estava dentro do elevador de carros do prédio, e a energia da garagem tinha caído com o carro no meio do trajeto.',
  },
  {
    cena: 'Dois times entraram em campo. O jogo terminou sem gol nenhum e os dois comemoraram como se tivessem ganhado.',
    solucao: 'O empate classificava os dois e eliminava um terceiro time que dependia daquele resultado.',
  },
  {
    cena: 'Ele pagou uma fortuna por uma casa sabendo que ia demolir tudo no dia seguinte.',
    solucao:
      'O que ele queria era o terreno e a vista que a casa tapava. A casa era o problema, não o produto.',
  },
  {
    cena: 'A mulher entrou no cinema, assistiu ao filme inteiro e saiu antes dos créditos, furiosa. Nunca tinha visto aquele filme antes.',
    solucao: 'Ela é a autora do livro. Descobriu na sala de cinema que mudaram o final.',
  },
]

const SANGUE_FRIO: EnigmaDoPacote[] = [
  {
    cena: 'O homem morreu de sede dentro de um caminhão-pipa cheio d’água.',
    solucao:
      'Ele era o motorista e ficou preso nas ferragens da cabine depois de capotar numa estrada vazia. A água estava a dois metros e nenhuma válvula ficou ao alcance dele.',
  },
  {
    cena: 'A mulher matou o marido com uma arma que sumiu antes de a perícia chegar.',
    solucao: 'Um pedaço grande de gelo do freezer. Quando a polícia entrou, era uma poça no chão.',
  },
  {
    cena: 'Os dois irmãos beberam do mesmo copo, da mesma garrafa, ao mesmo tempo. Só um morreu envenenado.',
    solucao:
      'O veneno estava no gelo. O que morreu bebeu devagar, conversando; o outro virou o copo de uma vez e saiu.',
  },
  {
    cena: 'A vizinha chamou a polícia por causa do silêncio.',
    solucao:
      'O casal do apartamento ao lado brigava alto todas as noites havia dez anos. Na primeira noite calada, ela entendeu na hora o que tinha acontecido.',
  },
  {
    cena: 'Ele acordou com a casa em chamas, conseguiu sair, e mesmo assim voltou pra dentro. Morreu com um envelope na mão.',
    solucao:
      'Voltou pela apólice do seguro que ele mesmo tinha contratado três dias antes. Foi o envelope na mão dele que entregou o incêndio como criminoso.',
  },
  {
    cena: 'O médico olhou a radiografia de um paciente saudável e chamou a polícia.',
    solucao:
      'Havia uma bala alojada nas costas dele, cicatrizada havia anos. O caso do irmão dele tinha sido arquivado como suicídio.',
  },
  {
    cena: 'O relojoeiro foi encontrado morto e todos os relógios da loja marcavam a mesma hora — menos um.',
    solucao:
      'Ele adiantou aquele um durante a luta, pra deixar registrada a hora do crime. O assassino conferiu os outros e não pensou no que estava fora do padrão.',
  },
  {
    cena: 'Ela sobreviveu ao naufrágio porque não sabia nadar.',
    solucao:
      'Foi a única a aceitar o colete quando ofereceram, ainda no embarque. Quem sabia nadar recusou, e a água estava a seis graus.',
  },
  {
    cena: 'O homem foi enterrado duas vezes, com dez anos de diferença. Nas duas era ele mesmo.',
    solucao:
      'O primeiro enterro foi encenado pra sumir de uma dívida grande demais. O segundo foi de verdade — o credor descobriu.',
  },
  {
    cena: 'O padeiro assou o pão às quatro da manhã, como todo dia. Ao meio-dia a rua inteira estava no hospital.',
    solucao:
      'O trigo do fornecedor novo veio contaminado. Ele foi o primeiro a comer, na madrugada, e o último a ser socorrido.',
  },
  {
    cena: 'O bilhete de suicídio estava escrito com a letra dele. Foi justamente isso que provou que era assassinato.',
    solucao:
      'Estava escrito com a mão direita, e ele tinha perdido dois dedos da direita aos cinco anos. Escrevia com a esquerda desde então — a letra era imitada de documentos antigos.',
  },
  {
    cena: 'Todo mundo na mesa comeu do mesmo bolo. Só o aniversariante passou mal.',
    solucao: 'O veneno estava nas velas, que só ele apagou de perto, com o rosto em cima do bolo.',
  },
]

const GOLPE_PERFEITO: EnigmaDoPacote[] = [
  {
    cena: 'Ele devolveu o carro roubado com o tanque cheio e um bilhete de desculpas. Foi preso mesmo assim.',
    solucao:
      'A letra do bilhete era a mesma dos outros seis carros que ele já tinha devolvido do mesmo jeito. A polícia só precisava do sétimo.',
  },
  {
    cena: 'A loja foi assaltada e o dono agradeceu de coração. Depois entrou em desespero.',
    solucao:
      'O estoque estava encalhado e valia o triplo no seguro. O que ele não esperava é que levassem também o cofre, onde estava a contabilidade de verdade.',
  },
  {
    cena: 'Ele vendeu a mesma casa para quatro pessoas no mesmo dia. Nenhuma delas reclamou.',
    solucao:
      'As quatro eram sócias e estavam aplicando exatamente o mesmo golpe nele. Ninguém reclama de um contrato que não pretende cumprir.',
  },
  {
    cena: 'O caixa passou dez anos desviando um centavo por dia e nenhuma auditoria pegou.',
    solucao:
      'Ele arredondava os juros pra baixo e mandava a diferença pra uma conta dele. A auditoria só examinava lançamentos acima de um real.',
  },
  {
    cena: 'O ladrão entrou pela porta da frente, com a chave, e ninguém chamou a polícia.',
    solucao:
      'Ele é o antigo morador. O novo trocou todas as fechaduras, menos a da área de serviço, e a vizinhança ainda achava que a casa era dele.',
  },
  {
    cena: 'O quadro roubado foi devolvido em uma semana. O museu não quis de volta.',
    solucao:
      'A perícia feita no resgate provou que aquele quadro era falso desde 1974. O museu preferia explicar um buraco na parede a explicar isso.',
  },
  {
    cena: 'Ele foi preso por um crime que confessou e não cometeu.',
    solucao:
      'Confessou pra proteger o filho. O que ele não sabia é que o filho já tinha confessado antes, pra proteger a mãe.',
  },
  {
    cena: 'O sequestrador ligou pedindo resgate e desligou pedindo desculpas.',
    solucao:
      'Errou o número. Do outro lado atendeu uma família que tinha um parente desaparecido de verdade, e ele entendeu pela reação que não era o telefone certo.',
  },
  {
    cena: 'Ela assinou um contrato sabendo que era golpe e ganhou dinheiro com isso.',
    solucao:
      'Ela é a advogada. Cobrou caro depois pra desfazer exatamente o contrato que ela mesma leu, aprovou e deixou passar.',
  },
  {
    cena: 'O falsificador foi pego por causa de uma nota perfeita.',
    solucao:
      'Perfeita demais: melhor que a original, impressa no papel de segurança que o Banco Central tinha parado de usar dois anos antes.',
  },
  {
    cena: 'O assalto ao carro-forte durou quarenta segundos. O carro-forte estava vazio.',
    solucao:
      'O aviso da rota tinha sido plantado de propósito pela transportadora, pra descobrir quem dentro da empresa vendia os trajetos.',
  },
  {
    cena: 'Ele pagou a conta com um cartão que não era dele e o garçom ainda agradeceu pela gorjeta.',
    solucao:
      'O cartão era da empresa, e a empresa era dele. O garçom era o sócio que ele estava demitindo naquele jantar.',
  },
]

/** `ENIG-30`, `ENIG-32` — os pacotes disponíveis, separados por tom. */
export const ENIGMAS: PacoteDeEnigmas[] = [
  {
    id: 'enigmas-casos-estranhos',
    emoji: '🕯️',
    nome: 'Casos Estranhos',
    descricao: 'Cenas que não fecham, sem ninguém morrendo. Dá pra jogar na sala.',
    quantidade: CASOS_ESTRANHOS.length,
    jogoId: 'enigmas-sinistros',
    tom: 'leve',
    enigmas: CASOS_ESTRANHOS,
  },
  {
    id: 'enigmas-sangue-frio',
    emoji: '💀',
    nome: 'Sangue Frio',
    descricao: 'O clássico do gênero: um corpo, uma cena impossível. Tom pesado.',
    quantidade: SANGUE_FRIO.length,
    jogoId: 'enigmas-sinistros',
    tom: 'pesado',
    enigmas: SANGUE_FRIO,
  },
  {
    id: 'enigmas-golpe-perfeito',
    emoji: '🎩',
    nome: 'Golpe Perfeito',
    descricao: 'Fraude, roubo e gente esperta demais. Tom pesado, sem sangue.',
    quantidade: GOLPE_PERFEITO.length,
    jogoId: 'enigmas-sinistros',
    tom: 'pesado',
    enigmas: GOLPE_PERFEITO,
  },
]
