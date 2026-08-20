/**
 * `DEDO-20`…`DEDO-22` — conteúdo estático do Dedo na Cara.
 *
 * Uma carta é uma pergunta e nada mais: não há resposta certa guardada em
 * lugar nenhum, porque quem responde é a mesa apontando. Adicionar um pacote é
 * adicionar um item na lista do fim.
 *
 * ## Como se escreve uma carta daqui
 *
 * **Toda carta começa em "Quem aqui".** É o que faz a mesa olhar pros lados em
 * vez de pensar sozinha, e é o que garante que a resposta seja sempre uma
 * pessoa da sala.
 *
 * **A carta boa tem mais de um candidato óbvio.** Se a mesa inteira aponta pro
 * mesmo sem pensar, a carta não é engraçada, é um fato — e apurar não revela
 * nada. O alvo é a mesa hesitar entre dois ou três e ter que se explicar
 * depois.
 *
 *     fraca: "Quem aqui é o mais alto?"   — tem resposta, não tem graça.
 *     boa:   "Quem aqui sumiria do rolê sem avisar ninguém?"
 *
 * **O tom pesado é pesado de verdade.** No `leve` a carta acusa de ser
 * desastrado ou exagerado, e dá pra jogar com a família. Nos outros dois a
 * acusação é de ser escroto mesmo — traição, sacanagem com amigo, dinheiro,
 * crime. Carta morna nesses pacotes é carta ruim: se ninguém tem o que
 * negar, ninguém tem o que explicar, e explicar é o jogo.
 *
 * **O limite não é a intensidade, é o alvo.** A carta acusa **escolha** — o
 * que a pessoa faria, o que ela já fez. Nunca o que ela não escolheu: nada de
 * aparência, corpo, dinheiro que ela tem ou deixou de ter, origem, ou qualquer
 * coisa que ela não possa negar rindo. Também não se escreve carta com nome de
 * gente real dentro.
 *
 * **Nada da Buró.** A mecânica é do gênero "quem é mais provável"; o texto é
 * todo nosso. Nenhuma carta daqui sai de baralho comercial nenhum.
 */

export interface PacoteDeDedo {
  id: string
  emoji: string
  nome: string
  descricao: string
  /** Total de cartas do pacote, para o resumo do lobby. */
  quantidade: number
  jogoId: string
  /** O que a mesa está escolhendo de verdade ao marcar o pacote. */
  tom: 'leve' | 'pesado'
  /** A pergunta inteira, do "Quem aqui" ao fim. Sem ponto de interrogação: a tela põe. */
  cartas: string[]
}

const ROLE: string[] = [
  'Quem aqui some do rolê sem avisar ninguém',
  'Quem aqui chega uma hora atrasado e ainda reclama do trânsito',
  'Quem aqui dorme na festa antes da meia-noite',
  'Quem aqui pede o prato mais caro e sugere dividir a conta',
  'Quem aqui tira foto de todo mundo e só posta as que ficou bem',
  'Quem aqui manda áudio de três minutos pra dizer "tá bom"',
  'Quem aqui chora primeiro no filme',
  'Quem aqui perderia o voo por causa de um bar no aeroporto',
  'Quem aqui sabe a vida inteira dos vizinhos sem nunca ter falado com eles',
  'Quem aqui esquenta a discussão no grupo e depois some',
  'Quem aqui pega o microfone do karaokê sem ninguém pedir',
  'Quem aqui prometeu levar a sobremesa e come metade no caminho',
  'Quem aqui diria "eu tinha avisado" no meio do incêndio',
  'Quem aqui teria um canal de culinária com dois inscritos',
  'Quem aqui adota um cachorro na rua sem pensar duas vezes',
  'Quem aqui briga com o atendente e pede desculpa dois minutos depois',
  'Quem aqui aguenta menos tempo sem olhar o celular',
  'Quem aqui se perde numa cidade com o mapa aberto na mão',
  'Quem aqui morre primeiro no filme de terror',
  'Quem aqui organiza a viagem inteira e não deixa ninguém opinar',
  'Quem aqui responde "já tô saindo" ainda deitado',
  'Quem aqui vira o churrasqueiro sem ninguém ter pedido',
  'Quem aqui faz a playlist da viagem e briga com quem quiser trocar',
  'Quem aqui esquece o aniversário e manda parabéns no dia seguinte',
  'Quem aqui discute com o GPS em voz alta',
  'Quem aqui traz o namorado novo pro rolê e some com ele a noite inteira',
  'Quem aqui conta a mesma história de dez anos atrás toda vez que bebe',
  'Quem aqui perde a chave de casa duas vezes no mesmo mês',
  'Quem aqui compra o ingresso e desiste na véspera',
  'Quem aqui aguenta menos pimenta e mesmo assim insiste em provar',
  'Quem aqui entra na mania nova antes de todo mundo e abandona primeiro',
  'Quem aqui fica com a bebida na mão a noite inteira sem terminar',
]

const SEM_VERGONHA: string[] = [
  'Quem aqui trairia a namorada no banheiro de um bar',
  'Quem aqui pegaria a mulher do melhor amigo se desse mole',
  'Quem aqui já ficou com o ex de um amigo e nunca contou',
  'Quem aqui traiu e culpou a bebida no dia seguinte',
  'Quem aqui já ficou com dois irmãos',
  'Quem aqui já ficou com alguém comprometido sabendo que era',
  'Quem aqui já usou aplicativo de namoro estando namorando',
  'Quem aqui dá em cima do crush do amigo no dia seguinte ao desabafo',
  'Quem aqui trocaria a mesa inteira por uma noite com o crush',
  'Quem aqui já mandou nude pro contato errado',
  'Quem aqui tem nude guardado de alguém que não faz ideia disso',
  'Quem aqui já transou em festa de casamento',
  'Quem aqui já ficou com alguém desta mesa e nega até hoje',
  'Quem aqui é o pior de cama e o melhor de conversa',
  'Quem aqui já fingiu orgasmo só pra acabar logo',
  'Quem aqui já chorou depois do sexo',
  'Quem aqui abandonaria o amigo bêbado no rolê pra ir pegar alguém',
  'Quem aqui já deixou um colega levar a culpa por um erro seu',
  'Quem aqui deve dinheiro pra alguém desta mesa e finge que esqueceu',
  'Quem aqui já pegou dinheiro de dentro de casa e negou',
  'Quem aqui venderia o segredo mais pesado da mesa por dez mil reais',
  'Quem aqui já dirigiu bêbado com todo mundo dentro do carro',
  'Quem aqui já bateu no carro de alguém e foi embora',
  'Quem aqui já foi detido e não contou pra ninguém aqui',
  'Quem aqui já vomitou na casa dos outros e foi embora sem limpar',
  'Quem aqui mijou na piscina e olhou na cara de todo mundo depois',
  'Quem aqui tem o perfil fake pra stalkear a gente',
  'Quem aqui já leu o celular do parceiro e brigou com a informação errada',
  'Quem aqui volta pro ex toda vez que bebe',
  'Quem aqui já terminou um namoro por mensagem no meio da viagem',
  'Quem aqui já mentiu no currículo e conseguiu a vaga',
  'Quem aqui vaza o segredo da mesa depois de duas doses',
]

const FIM_DO_MUNDO: string[] = [
  'Quem aqui empurra um amigo pros zumbis pra ganhar dez segundos',
  'Quem aqui entrega a mesa inteira na primeira ameaça',
  'Quem aqui come o outro primeiro na ilha deserta',
  'Quem aqui defende a ideia do canibalismo antes de todo mundo',
  'Quem aqui tranca a porta do abrigo com a gente do lado de fora',
  'Quem aqui rouba o remédio do grupo pra vender depois',
  'Quem aqui monta uma seita e some com o dinheiro dos fiéis',
  'Quem aqui aplicaria um golpe nos próprios amigos',
  'Quem aqui seria preso por pirâmide financeira',
  'Quem aqui esconde um corpo e dorme bem na mesma noite',
  'Quem aqui ajuda a esconder o corpo sem fazer uma pergunta',
  'Quem aqui é dedo-duro na primeira hora de interrogatório',
  'Quem aqui deixa o amigo ser preso no lugar dele',
  'Quem aqui trairia o país por uma mala de dinheiro',
  'Quem aqui sumiria com a herança da família',
  'Quem aqui abandona todo mundo e recomeça a vida com outro nome',
  'Quem aqui aperta o botão que mata mil desconhecidos pra salvar a mesa',
  'Quem aqui aperta o botão vermelho só pra ver o que acontece',
  'Quem aqui venderia um rim pra comprar um carro',
  'Quem aqui é o primeiro a morrer fazendo alguma burrice',
  'Quem aqui morre tentando salvar o cachorro',
  'Quem aqui vira o braço direito do vilão em uma semana',
  'Quem aqui seria o pior ditador possível',
  'Quem aqui denuncia o vizinho pra ficar bem com o poder',
  'Quem aqui volta como fantasma só pra assombrar esta mesa',
  'Quem aqui passaria o último dia da Terra dormindo',
  'Quem aqui gasta a herança inteira em um mês',
  'Quem aqui vende o carro pra comprar cripto de novo',
  'Quem aqui aceita ir pra Marte sem passagem de volta',
  'Quem aqui seria clonado e a cópia sairia melhor que o original',
  'Quem aqui é o vilão do documentário sobre a gente',
  'Quem aqui a mesa entrega primeiro se o resgate for por um só',
]

/** `DEDO-22` — a lista inteira. Um pacote novo entra aqui e mais nada muda. */
export const CARTAS_DEDO: PacoteDeDedo[] = [
  {
    id: 'dedo-role',
    emoji: '🍻',
    nome: 'O Rolê',
    descricao: 'A turma como ela é num sábado. Dá pra jogar com a família.',
    quantidade: ROLE.length,
    jogoId: 'dedo-na-cara',
    tom: 'leve',
    cartas: ROLE,
  },
  {
    id: 'dedo-sem-vergonha',
    emoji: '🙈',
    nome: 'Sem Vergonha',
    descricao: 'Traição, sacanagem com amigo e o que ninguém ia contar. Não abra na ceia.',
    quantidade: SEM_VERGONHA.length,
    jogoId: 'dedo-na-cara',
    tom: 'pesado',
    cartas: SEM_VERGONHA,
  },
  {
    id: 'dedo-fim-do-mundo',
    emoji: '☄️',
    nome: 'Fim do Mundo',
    descricao: 'Quem entrega quem, quem come quem, quem some com a mala. Sem defesa.',
    quantidade: FIM_DO_MUNDO.length,
    jogoId: 'dedo-na-cara',
    tom: 'pesado',
    cartas: FIM_DO_MUNDO,
  },
]
