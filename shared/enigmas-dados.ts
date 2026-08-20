/**
 * `ENIG-30`…`ENIG-32` — conteúdo estático do Enigmas Sinistros.
 *
 * Formato próprio (e não `PacoteCompleto`): aqui uma carta tem **duas faces** —
 * a cena, que a mesa toda lê, e a solução, que só o narrador vê. Adicionar um
 * pacote é adicionar um item na lista do fim; nada mais muda.
 *
 * ## A regra das duas batidas
 *
 * Uma cena boa tem **duas coisas estranhas**, e a solução precisa explicar as
 * duas. Se a solução tem uma camada que a cena não pediu, essa camada não é
 * jogável — vira epílogo que o narrador conta, e a mesa não teve como chegar
 * lá perguntando.
 *
 *     ruim: "Ela sobreviveu ao naufrágio porque não sabia nadar."
 *           — uma batida. Assim que alguém diz "ela pegou o colete", acabou.
 *           Se a solução falar dos outros passageiros, é informação nova:
 *           a cena nunca disse que morreu mais alguém.
 *
 *     boa:  "De todos a bordo, ela era a única que não sabia nadar.
 *            Foi a única que chegou viva à praia."
 *           — duas batidas. Agora "por que os outros morreram?" é uma
 *           pergunta que a mesa faz sozinha, e a resposta está ao alcance.
 *
 * Segundo critério, igualmente duro: **a solução tem que fechar pra quem nunca
 * viu nada disso.** Nada de perícia que só funciona se você já souber o truque,
 * nem de detalhe que contradiz a própria cena. Se pra solução fazer sentido a
 * mesa precisa aceitar um passo que ninguém explicou, a carta está quebrada —
 * mesmo que soe bem pra quem escreveu.
 *
 * O alvo é a mesa terminar dizendo "ah, boa" — não o narrador terminar
 * explicando.
 */

import type { Dificuldade } from './protocolo'

export type { Dificuldade }

export interface EnigmaDoPacote {
  /** O que a mesa lê. Uma cena que não fecha sozinha, com duas batidas. */
  cena: string
  /** O que desata. Só entra na projeção do narrador (`ENIG-05`). */
  solucao: string
  /**
   * Quanto a cena esconde — e não quanto ela é macabra, que é o `tom` do
   * pacote. É o mesmo `Dificuldade` das cartas de pacote dos outros jogos, de
   * propósito: a mesa não deve aprender duas escalas diferentes.
   *
   * - `facil` — uma virada só, e ela aparece depois da pergunta certa.
   * - `medio` — precisa derrubar uma suposição antes de a virada aparecer.
   * - `dificil` — duas camadas encadeadas, ou uma suposição que a mesa não
   *   percebe que está fazendo. Bom pra mesa rodada; ruim pra mesa nova, que
   *   ainda não sabe que tipo de pergunta funciona e conclui que o jogo é
   *   impossível.
   */
  dificuldade: Dificuldade
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
    dificuldade: 'medio',
  },
  {
    cena: 'Ela apagou todas as luzes da casa e só então conseguiu achar o que estava procurando.',
    solucao: 'Procurava o vaga-lume que tinha entrado pela janela e sumido na sala.',
    dificuldade: 'facil',
  },
  {
    cena: 'O porteiro jurava que o elevador subia sozinho toda tarde, sempre no mesmo horário. Ele estava certo.',
    solucao:
      'O gato do décimo segundo desce pela escada de manhã e volta de elevador, se apoiando no botão com a pata. Sempre depois do almoço.',
    dificuldade: 'medio',
  },
  {
    cena: 'O homem pediu um copo d’água no bar. O barman apontou uma arma pra ele. Ele agradeceu e foi embora.',
    solucao: 'Ele estava com soluço. O susto resolveu, e os dois sabiam disso.',
    dificuldade: 'facil',
  },
  {
    cena: 'O quadro caiu da parede e salvou a vida do dono.',
    solucao:
      'Ele se abaixou pra pegar o quadro no instante exato em que o forro do teto cedeu em cima da poltrona onde ele estava sentado.',
    dificuldade: 'facil',
  },
  {
    // Antes a cena era só "estudou, foi bem e rasgou": uma batida, e a solução
    // trazia sozinha a decisão de carreira. O emprego assinado põe a segunda
    // batida na mesa e faz a pergunta "então por que estudar?" existir.
    cena: 'Ele estudou seis meses pra uma prova, tirou a maior nota da turma e rasgou o envelope do resultado sem abrir. Já tinha outro emprego assinado havia um mês.',
    solucao:
      'Estudou pra provar a si mesmo que era capaz de passar. A carreira ele já tinha decidido não seguir antes mesmo de começar a estudar — abrir o envelope seria pedir uma opinião de que ele não precisava.',
    dificuldade: 'medio',
  },
  {
    cena: 'Todos os funcionários chegaram no horário. Nenhum conseguiu entrar.',
    solucao:
      'A empresa mudou de prédio no fim de semana e o aviso só foi mandado no grupo do turno da tarde.',
    dificuldade: 'facil',
  },
  {
    cena: 'Ela manda a mesma mensagem para o marido todo dia há dez anos. Ele nunca respondeu, e ela nunca reclamou.',
    solucao:
      'O marido morreu. Ela mantém a linha dele ativa e manda bom dia todo dia — sabe que ninguém lê, e é exatamente por isso que continua.',
    dificuldade: 'medio',
  },
  {
    cena: 'O carro estava com o tanque cheio, a bateria nova e o motorista com a chave na mão. Não saiu do lugar.',
    solucao:
      'Ele estava dentro do elevador de carros do prédio, e a energia da garagem tinha caído com o carro no meio do trajeto.',
    dificuldade: 'medio',
  },
  {
    cena: 'Dois times entraram em campo. O jogo terminou sem gol nenhum e os dois comemoraram como se tivessem ganhado.',
    solucao:
      'O empate classificava os dois e eliminava um terceiro time que dependia daquele resultado.',
    dificuldade: 'facil',
  },
  {
    cena: 'Ele pagou uma fortuna por uma casa sabendo que ia demolir tudo no dia seguinte.',
    solucao:
      'O que ele queria era o terreno e a vista que a casa tapava. A casa era o problema, não o produto.',
    dificuldade: 'facil',
  },
  {
    cena: 'A mulher entrou no cinema, assistiu ao filme inteiro e saiu antes dos créditos, furiosa. Nunca tinha visto aquele filme antes.',
    solucao: 'Ela é a autora do livro. Descobriu na sala de cinema que mudaram o final.',
    dificuldade: 'medio',
  },
  {
    // Adaptado do clássico "the man in the elevator", folclore do gênero.
    cena: 'Ele mora no décimo sétimo andar e todo dia sobe de elevador só até o décimo primeiro, subindo o resto a pé. Em dia de chuva, sobe direto até em casa.',
    solucao:
      'Ele é baixo e o botão mais alto que alcança é o do décimo primeiro. Em dia de chuva ele leva guarda-chuva, e com ele aperta o dezessete.',
    dificuldade: 'medio',
  },
  {
    // Adaptado do clássico "man pushing a car to a hotel".
    cena: 'Ele empurrou o carro até o hotel, pagou o dono do hotel e foi embora sem reclamar de nada.',
    solucao:
      'Estavam jogando Banco Imobiliário. O carro é o peão dele, e caiu numa casa com hotel construído.',
    dificuldade: 'facil',
  },
  {
    // Adaptado do clássico "cabin in the woods".
    cena: 'Encontraram todos mortos numa cabine no meio da mata fechada. Não havia estrada, trilha nem uma pegada sequer chegando até lá.',
    solucao:
      'Era a cabine de um avião que caiu. Ninguém chegou até lá por terra porque ninguém chegou por terra.',
    dificuldade: 'medio',
  },
]

const SANGUE_FRIO: EnigmaDoPacote[] = [
  {
    cena: 'O homem morreu de sede dentro de um caminhão-pipa cheio d’água.',
    solucao:
      'Ele era o motorista e ficou preso nas ferragens da cabine depois de capotar numa estrada vazia. A água estava a dois metros e nenhuma válvula ficou ao alcance dele.',
    dificuldade: 'medio',
  },
  {
    cena: 'A mulher matou o marido com uma arma que sumiu antes de a perícia chegar.',
    solucao: 'Um pedaço grande de gelo do freezer. Quando a polícia entrou, era uma poça no chão.',
    dificuldade: 'facil',
  },
  {
    cena: 'Os dois irmãos beberam do mesmo copo, da mesma garrafa, ao mesmo tempo. Só um morreu envenenado.',
    solucao:
      'O veneno estava no gelo. O que morreu bebeu devagar, conversando; o outro virou o copo de uma vez e saiu.',
    dificuldade: 'medio',
  },
  {
    cena: 'A vizinha chamou a polícia por causa do silêncio.',
    solucao:
      'O casal do apartamento ao lado brigava alto todas as noites havia dez anos. Na primeira noite calada, ela entendeu na hora o que tinha acontecido.',
    dificuldade: 'medio',
  },
  {
    cena: 'Ele acordou com a casa em chamas, conseguiu sair pela janela e mesmo assim voltou pra dentro. Morreu com um envelope na mão.',
    solucao:
      'Voltou pela apólice do seguro que ele mesmo tinha contratado três dias antes — e que só valia com a via assinada, guardada na gaveta do quarto. O envelope na mão dele foi o que entregou o incêndio como criminoso.',
    dificuldade: 'medio',
  },
  {
    // Antes: "médico vê radiografia de paciente saudável e chama a polícia",
    // e a solução trazia um irmão e um caso arquivado que a cena nunca citou.
    // Agora a cena diz que o caso é de outra pessoa, e a mesa pode perguntar
    // por ela.
    cena: 'O paciente estava saudável e nunca tinha levado um tiro na vida. Foi a radiografia dele que reabriu o caso da morte do irmão, arquivado dez anos antes.',
    solucao:
      'Havia uma bala cicatrizada nas costas dele, de um tiro que ele levou dormindo e sempre achou que tinha sido pesadelo. Era a mesma arma e a mesma noite em que o irmão apareceu morto na casa ao lado — o que fecharam como suicídio tinha sido alguém atirando nos dois.',
    dificuldade: 'dificil',
  },
  {
    cena: 'O relojoeiro foi encontrado morto e todos os relógios da loja marcavam a mesma hora — menos um.',
    solucao:
      'Ele adiantou aquele um durante a luta, pra deixar registrada a hora do crime. O assassino conferiu os outros e não pensou no que estava fora do padrão.',
    dificuldade: 'medio',
  },
  {
    cena: 'De todos a bordo, ela era a única que não sabia nadar. Foi a única que chegou viva à praia.',
    solucao:
      'Quem sabia nadar recusou o colete no embarque, achando que não ia precisar. Na água a seis graus o corpo perde a força em poucos minutos: quem dependia de nadar parou de conseguir e afundou. Ela nunca dependeu — o colete a segurou na superfície até o resgate chegar.',
    dificuldade: 'medio',
  },
  {
    cena: 'O homem foi enterrado duas vezes, com dez anos de diferença. Nas duas era ele mesmo.',
    solucao:
      'O primeiro enterro foi encenado pra sumir de uma dívida grande demais. O segundo foi de verdade — o credor descobriu.',
    dificuldade: 'medio',
  },
  {
    cena: 'O padeiro assou o pão às quatro da manhã, como todo dia. Ao meio-dia a rua inteira estava no hospital.',
    solucao:
      'O trigo do fornecedor novo veio contaminado. Ele foi o primeiro a comer, na madrugada, e o último a ser socorrido.',
    dificuldade: 'facil',
  },
  {
    // Substitui a carta do bilhete escrito "com a mão direita": num suicídio
    // forjado quem escreve é o assassino, então a mão de quem morreu não
    // explicava nada — e a mesa não tinha como chegar a perícia de caligrafia.
    cena: 'O bilhete de suicídio era da letra dele, sem dúvida nenhuma. Foi exatamente isso que provou que não foi suicídio.',
    solucao:
      'Ele escreveu sob ameaça e deixou um recado dentro do recado: chamou a mulher pelo nome da irmã dela. Em trinta anos de casado ele nunca errou esse nome, e ela foi a primeira a ler o bilhete e a primeira a dizer que aquilo era assassinato.',
    dificuldade: 'dificil',
  },
  {
    cena: 'Todo mundo na mesa comeu do mesmo bolo. Só o aniversariante passou mal.',
    solucao: 'O veneno estava nas velas, que só ele apagou de perto, com o rosto em cima do bolo.',
    dificuldade: 'facil',
  },
  {
    // Adaptado do clássico do enforcado sobre o bloco de gelo.
    cena: 'Estava pendurado a três metros do chão, no meio de um galpão vazio. Embaixo dele não havia escada, caixote nem nada — só uma poça d’água.',
    solucao:
      'Subiu num bloco de gelo grande e esperou. Quando derreteu, não sobrou nada pra explicar como ele tinha chegado àquela altura.',
    dificuldade: 'medio',
  },
  {
    // Adaptado do clássico da mochila no meio do campo.
    cena: 'Encontraram ele de bruços no meio do pasto, sem uma marca de briga no corpo. Tinha uma mochila fechada nas costas.',
    solucao: 'A mochila era o paraquedas, e não abriu. Morreu no impacto, sozinho e a céu aberto.',
    dificuldade: 'facil',
  },
  {
    // Adaptado do clássico do faroleiro.
    cena: 'O faroleiro apagou a luz e foi dormir, como fazia havia meses. Na manhã seguinte ele se matou.',
    solucao:
      'Ele vinha apagando o farol uma hora antes do horário pra economizar óleo, e nunca tinha dado em nada. Naquela noite deu: acordou com os destroços encalhados na pedra, debaixo da janela dele.',
    dificuldade: 'medio',
  },
]

const GOLPE_PERFEITO: EnigmaDoPacote[] = [
  {
    cena: 'Ele devolveu o carro roubado com o tanque cheio e um bilhete de desculpas. Foi preso mesmo assim.',
    solucao:
      'A letra do bilhete era a mesma dos outros seis carros que ele já tinha devolvido do mesmo jeito. A polícia só precisava do sétimo.',
    dificuldade: 'facil',
  },
  {
    cena: 'A loja foi assaltada e o dono agradeceu de coração. Depois entrou em desespero.',
    solucao:
      'O estoque estava encalhado e valia o triplo no seguro. O que ele não esperava é que levassem também o cofre, onde estava a contabilidade de verdade.',
    dificuldade: 'medio',
  },
  {
    cena: 'Ele vendeu a mesma casa para quatro pessoas no mesmo dia. Nenhuma delas reclamou.',
    solucao:
      'As quatro eram sócias e estavam aplicando exatamente o mesmo golpe nele. Ninguém reclama de um contrato que não pretende cumprir.',
    dificuldade: 'medio',
  },
  {
    cena: 'O caixa passou dez anos desviando um centavo por dia e nenhuma auditoria pegou.',
    solucao:
      'Ele arredondava os juros pra baixo e mandava a diferença pra uma conta dele. A auditoria só examinava lançamentos acima de um real.',
    dificuldade: 'facil',
  },
  {
    // Antes a cena dizia que ele entrou "com a chave" e a solução dizia que o
    // novo morador tinha trocado as fechaduras — a carta se contradizia.
    cena: 'Ele entrou pela porta da frente com a chave no bolso, carregou móveis pra fora à luz do dia e acenou pros vizinhos. Ninguém chamou a polícia.',
    solucao:
      'Ele é o antigo morador e a mudança dele ainda estava lá dentro: vendeu a casa mobiliada por engano e resolveu resolver por conta própria. A vizinhança inteira ainda achava que a casa era dele, e a chave era mesmo dele — o comprador só ia trocar a fechadura na segunda.',
    dificuldade: 'medio',
  },
  {
    cena: 'O quadro roubado foi devolvido em uma semana. O museu não quis de volta.',
    solucao:
      'A perícia feita no resgate provou que aquele quadro era falso desde 1974. O museu preferia explicar um buraco na parede a explicar isso.',
    dificuldade: 'medio',
  },
  {
    cena: 'Ele confessou um crime que não cometeu. O delegado sabia que era mentira e prendeu mesmo assim.',
    solucao:
      'Ele confessou pra proteger o filho. O delegado deixou correr porque o filho já tinha confessado na noite anterior, pra proteger a mãe — e enquanto os dois estivessem presos, ninguém ia procurar por ela.',
    dificuldade: 'dificil',
  },
  {
    cena: 'O sequestrador ligou pedindo resgate e desligou pedindo desculpas.',
    solucao:
      'Errou o número. Do outro lado atendeu uma família que tinha um parente desaparecido de verdade, e ele entendeu pela reação que não era o telefone certo.',
    dificuldade: 'medio',
  },
  {
    cena: 'Ela assinou um contrato sabendo que era golpe e ganhou dinheiro com isso.',
    solucao:
      'Ela é a advogada. Cobrou caro depois pra desfazer exatamente o contrato que ela mesma leu, aprovou e deixou passar.',
    dificuldade: 'medio',
  },
  {
    cena: 'O falsificador foi pego por causa de uma nota perfeita.',
    solucao:
      'Perfeita demais: melhor que a original, impressa no papel de segurança que o Banco Central tinha parado de usar dois anos antes.',
    dificuldade: 'medio',
  },
  {
    cena: 'O assalto ao carro-forte durou quarenta segundos. O carro-forte estava vazio.',
    solucao:
      'O aviso da rota tinha sido plantado de propósito pela transportadora, pra descobrir quem dentro da empresa vendia os trajetos.',
    dificuldade: 'medio',
  },
  {
    // Antes a solução dizia "o cartão era da empresa, e a empresa era dele" —
    // o que fazia o cartão ser dele, contradizendo a cena.
    cena: 'Ele pagou a conta com um cartão que não era dele, na frente do dono do cartão, e ainda foi agradecido pela gorjeta.',
    solucao:
      'O cartão era do sócio, que ele estava demitindo naquele jantar. Pagou a própria demissão com o dinheiro de quem demitia, e o sócio só entendeu quando a fatura chegou — o garçom agradeceu porque a gorjeta foi generosa com o dinheiro alheio.',
    dificuldade: 'medio',
  },
  {
    cena: 'A empresa contratou um consultor pra descobrir quem estava desviando dinheiro. Ele descobriu em dois dias e foi demitido na mesma semana.',
    solucao:
      'Quem desviava era o próprio dono, tirando da parte do sócio. Ele contratou a consultoria porque o sócio exigiu, e demitiu assim que a resposta chegou perto demais.',
    dificuldade: 'medio',
  },
  {
    cena: 'O quadro era falso e o comprador sabia. Pagou o preço de um verdadeiro assim mesmo, sem pechinchar.',
    solucao:
      'Ele precisava de uma nota fiscal alta pra justificar dinheiro que não podia explicar. A tela era o de menos: o que ele estava comprando era o recibo.',
    dificuldade: 'medio',
  },
  {
    cena: 'Ele devolveu todo o dinheiro do golpe, com juros, antes de qualquer um perceber que tinha sumido. Ainda assim saiu milionário.',
    solucao:
      'Deixou o dinheiro quarenta dias numa aplicação de rendimento alto e devolveu só o principal mais os juros que a conta de origem renderia. A diferença entre os dois rendimentos ninguém somou, porque ninguém soube que o dinheiro tinha saído do lugar.',
    dificuldade: 'dificil',
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
