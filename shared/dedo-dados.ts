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
 * **Nada que humilhe de verdade.** A carta acusa de ser desastrado, exagerado
 * ou sem-vergonha; nunca de ser feio, burro ou pobre. A mesa tem que rir junto,
 * inclusive quem levou os dedos.
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
  'Quem aqui mentiu no currículo e conseguiu a vaga',
  'Quem aqui já stalkeou alguém às três da manhã esta semana',
  'Quem aqui tem a galeria de fotos mais comprometedora',
  'Quem aqui já beijou alguém do grupo e nunca contou',
  'Quem aqui vaza o segredo da mesa depois de duas doses',
  'Quem aqui já fingiu doença pra não trabalhar',
  'Quem aqui já chorou por alguém que nem sabia o nome dele',
  'Quem aqui pediria dinheiro emprestado e sumiria do mapa',
  'Quem aqui mandou mensagem pro contato errado e piorou tentando explicar',
  'Quem aqui usa a mesma senha ruim em tudo desde 2012',
  'Quem aqui voltou com um ex jurando que dessa vez era diferente',
  'Quem aqui contaria tudo num detector de mentira em rede nacional',
  'Quem aqui esconde o pior gosto musical da mesa',
  'Quem aqui já dormiu no trabalho sem ninguém perceber',
  'Quem aqui aguenta menos de um dia sem falar mal de alguém',
  'Quem aqui já terminou um namoro por mensagem',
  'Quem aqui tem mais gente bloqueada no telefone',
  'Quem aqui inventa uma desculpa melhor em menos tempo',
  'Quem aqui leria as mensagens do celular do outro se ficasse sozinho com ele',
  'Quem aqui sai no soco por causa de time',
  'Quem aqui já saiu escondido da festa pra não ter que se despedir',
  'Quem aqui exagera a própria história até ficar irreconhecível',
  'Quem aqui ainda usa a conta de streaming de um ex',
  'Quem aqui já deixou um colega levar a culpa por um erro seu',
  'Quem aqui esconde do resto da casa o que gastou no cartão',
  'Quem aqui responde mensagem bêbado e apaga tudo de manhã',
  'Quem aqui reclama de fofoca e sabe de todas',
  'Quem aqui devolveria a roupa na loja depois de usar uma vez',
  'Quem aqui já fingiu conhecer a música pra não passar vergonha',
  'Quem aqui já mentiu a idade pra alguém que tinha acabado de conhecer',
  'Quem aqui foi barrado em algum lugar e conta a história como vitória',
  'Quem aqui promete parar com alguma coisa toda segunda-feira',
]

const FIM_DO_MUNDO: string[] = [
  'Quem aqui sobrevive mais tempo no apocalipse',
  'Quem aqui entrega o grupo pros zumbis pra se salvar',
  'Quem aqui vira líder de seita com facilidade',
  'Quem aqui gasta a herança inteira em um mês',
  'Quem aqui é demitido por causa de um tuíte',
  'Quem aqui dá o pior conselho amoroso com mais convicção',
  'Quem aqui aceita ir pra Marte sem passagem de volta',
  'Quem aqui ajuda a esconder um corpo sem fazer uma pergunta',
  'Quem aqui é pego na primeira tentativa de crime',
  'Quem aqui vira influencer de alguma coisa duvidosa',
  'Quem aqui aguenta menos tempo sozinho numa ilha deserta',
  'Quem aqui aperta o botão vermelho só pra ver o que acontece',
  'Quem aqui puxa teoria da conspiração no almoço de família',
  'Quem aqui seria o pior presidente',
  'Quem aqui devolve a mala de dinheiro que achou na rua',
  'Quem aqui troca de vida com o próprio inimigo por um ano',
  'Quem aqui volta como fantasma só pra assombrar a mesa',
  'Quem aqui vende o carro pra comprar cripto',
  'Quem aqui não passa de uma semana sem internet',
  'Quem aqui é o vilão do documentário sobre a gente',
  'Quem aqui negocia com o alienígena antes de contar pra alguém',
  'Quem aqui morre tentando salvar o cachorro',
  'Quem aqui monta o abrigo e não deixa a mesa entrar',
  'Quem aqui entrega a senha do cofre na primeira ameaça',
  'Quem aqui inventa uma religião nova em três dias',
  'Quem aqui passaria o último dia da Terra dormindo',
  'Quem aqui usaria a máquina do tempo pra apagar uma vergonha boba',
  'Quem aqui some com o mapa do tesouro e volta rico sozinho',
  'Quem aqui seria clonado e a cópia sairia melhor que o original',
  'Quem aqui viraria testemunha protegida por falar demais',
  'Quem aqui é o cientista maluco desta turma',
  'Quem aqui aceitaria o dinheiro pra guardar o segredo do século',
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
    descricao: 'Ex, senha ruim e mentira no currículo. Não abra na ceia.',
    quantidade: SEM_VERGONHA.length,
    jogoId: 'dedo-na-cara',
    tom: 'pesado',
    cartas: SEM_VERGONHA,
  },
  {
    id: 'dedo-fim-do-mundo',
    emoji: '☄️',
    nome: 'Fim do Mundo',
    descricao: 'Apocalipse, seita e a mala de dinheiro. Quem você seria mesmo.',
    quantidade: FIM_DO_MUNDO.length,
    jogoId: 'dedo-na-cara',
    tom: 'pesado',
    cartas: FIM_DO_MUNDO,
  },
]
