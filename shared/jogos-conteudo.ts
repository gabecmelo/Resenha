/**
 * Como se joga cada jogo, em português corrido.
 *
 * Mora em `shared/` porque tem dois consumidores e eles não podem discordar: as
 * páginas indexáveis (`/espiao`, `/quem-sou-eu`…), geradas no build por
 * `scripts/paginas.ts`, e o "como jogar" do seletor da tela inicial. Texto de
 * tutorial duplicado diverge na primeira correção — e aí metade da mesa lê uma
 * regra e a outra metade lê outra.
 *
 * O nome de exibição não está aqui: vem de `jogos-catalogo.ts`, que já é o dono
 * dele. Este arquivo guarda só o que o catálogo não tem.
 *
 * Não é lógica de jogo. Nada em `server/games/` lê daqui, e mudar uma palavra
 * neste arquivo não muda partida nenhuma.
 */

/** Um passo do "como jogar", na ordem em que a mesa vive. */
export interface PassoDoJogo {
  titulo: string
  texto: string
}

/** Pergunta e resposta — vira `FAQPage` nos dados estruturados da página. */
export interface PerguntaFrequente {
  pergunta: string
  resposta: string
}

export interface ConteudoDoJogo {
  /** Casa com `JogoCatalogo.id`. */
  jogoId: string
  /**
   * Endereço da página, sem barra.
   *
   * **Nunca com 5 letras**: `/ABCDE` é código de sala, e a Cloudflare serve
   * arquivo antes de chamar o Worker — um slug de 5 letras sombrearia uma sala
   * de verdade, e o link que o host mandou no grupo abriria a página errada.
   */
  slug: string
  /** O `<title>` da página. É o que aparece como link no resultado da busca. */
  titulo: string
  h1: string
  /** Uma frase que diz o jogo inteiro. Serve de subtítulo e de resumo na lista. */
  resumo: string
  /** A `<meta name="description">`: o parágrafo embaixo do link, na busca. */
  descricao: string
  jogadores: string
  duracao: string
  abertura: string
  contexto: string
  passos: PassoDoJogo[]
  faq: PerguntaFrequente[]
}

export const CONTEUDO_DOS_JOGOS: ConteudoDoJogo[] = [
  {
    jogoId: 'quem-sou-eu',
    slug: 'quem-sou-eu',
    titulo: 'Quem Sou Eu? online e grátis, direto no navegador',
    h1: 'Quem Sou Eu? online',
    resumo:
      'Cada pessoa recebe uma carta que todo mundo vê, menos ela. Pergunte, deduza e descubra quem você é antes que descubram por você.',
    descricao:
      'Jogue Quem Sou Eu? online e de graça com os amigos, no navegador. Sem instalar app e sem cadastro: crie a sala, mande o código de 5 letras e comecem a perguntar. De 2 a 20 pessoas.',
    jogadores: 'De 2 a 20 pessoas',
    duracao: 'De 10 a 30 minutos',
    abertura:
      'Quem Sou Eu? é aquele jogo do papelzinho na testa — só que sem papel, sem fita e sem alguém ter que escrever tudo antes. Cada pessoa da mesa escreve a carta de outra, e ninguém vê a própria. A partir daí é pergunta, cara feia e dedução até alguém acertar quem é.',
    contexto:
      'No Resenha ele roda inteiro no navegador. Funciona com a galera junta na sala de casa, cada um com o celular na mão, e funciona igual com todo mundo em chamada de vídeo — o que importa é que cada pessoa esteja num aparelho, porque a carta de cada um só existe na tela dos outros.',
    passos: [
      {
        titulo: 'Abra a sala',
        texto:
          'Uma pessoa cria a sala e recebe um código de 5 letras. Não precisa criar conta, confirmar e-mail nem baixar nada.',
      },
      {
        titulo: 'Mande o código no grupo',
        texto:
          'Todo mundo entra com o mesmo código e escolhe um apelido. O código é sem I e sem O, justamente pra ninguém confundir com 1 e 0 ao ditar em voz alta.',
      },
      {
        titulo: 'Escreva a carta de outra pessoa',
        texto:
          'O sistema sorteia pra quem você escreve. Pode ser personagem, famoso, alguém do rolê — o que a mesa achar mais engraçado. Você não vê a sua.',
      },
      {
        titulo: 'Pergunte e deduza',
        texto:
          'Na sua vez, você pergunta e a mesa responde. Quando achar que sacou, chuta. Dá pra deixar o turno com tempo limitado ou sem relógio nenhum, como a mesa preferir.',
      },
    ],
    faq: [
      {
        pergunta: 'Quem Sou Eu? online é grátis?',
        resposta:
          'É. O Resenha é de graça por inteiro, sem anúncio e sem cadastro. Não existe versão paga, item bloqueado nem limite de partidas.',
      },
      {
        pergunta: 'Quantas pessoas precisam para jogar?',
        resposta:
          'A partir de 2, e até 20 na mesma sala. Em dois já funciona, mas a graça cresce com a mesa cheia: mais gente escrevendo carta significa mais chance de aparecer uma que ninguém esperava.',
      },
      {
        pergunta: 'Precisa instalar algum aplicativo?',
        resposta:
          'Não. Roda no navegador do celular, do computador ou do tablet. Quem receber o link entra direto, sem passar por loja de aplicativo.',
      },
      {
        pergunta: 'Dá para jogar por chamada de vídeo?',
        resposta:
          'Dá, e é um dos usos mais comuns. Cada pessoa abre o jogo no próprio aparelho e a chamada fica só para conversar — as cartas continuam escondidas de quem não pode vê-las.',
      },
      {
        pergunta: 'Quem escolhe as cartas?',
        resposta:
          'Vocês. Não há lista pronta: cada pessoa escreve a carta de outra, sorteada pelo sistema. É o que faz a partida ser sobre a sua turma e não sobre um banco de nomes genérico.',
      },
    ],
  },

  {
    jogoId: 'espiao',
    slug: 'espiao',
    titulo: 'Espião online — o jogo do impostor, grátis no navegador',
    h1: 'Espião online',
    resumo:
      'Todo mundo recebe o mesmo local. Menos uma pessoa. Ela precisa fingir que sabe; o resto precisa descobrir quem está fingindo.',
    descricao:
      'Jogue Espião online e de graça com os amigos, no navegador. Todos sabem o local, menos o espião. Perguntem, desconfiem e votem. Sem instalar app e sem cadastro, de 3 a 20 pessoas.',
    jogadores: 'De 3 a 20 pessoas',
    duracao: 'De 8 a 20 minutos por rodada',
    abertura:
      'Espião é um jogo de blefe e dedução: a mesa inteira recebe o mesmo local, e uma pessoa recebe só o aviso de que é o espião. As perguntas circulam. Quem sabe o local precisa provar que sabe sem entregar qual é; quem não sabe precisa improvisar até descobrir.',
    contexto:
      'A tensão do jogo vem de uma coisa só: uma pergunta específica demais entrega o local pro espião, e uma pergunta vaga demais faz a mesa desconfiar de você. É por isso que ele funciona tão bem com gente que se conhece — metade da leitura é do jogo, metade é da pessoa.',
    passos: [
      {
        titulo: 'Abra a sala e chame a mesa',
        texto:
          'Crie a sala, mande o código de 5 letras no grupo e espere todo mundo entrar. São necessárias pelo menos 3 pessoas.',
      },
      {
        titulo: 'Receba o seu papel',
        texto:
          'Ao começar, cada pessoa vê o local na própria tela — menos o espião, que vê apenas que é o espião. Ninguém mais sabe quem é.',
      },
      {
        titulo: 'Perguntem entre si',
        texto:
          'As perguntas passam de pessoa para pessoa. A resposta precisa ser convincente para quem sabe o local e vaga o bastante para não entregá-lo.',
      },
      {
        titulo: 'Votem quando desconfiarem',
        texto:
          'Qualquer pessoa pode abrir uma votação, e há um limite de quantas cabem na partida — acusar cedo demais custa caro. Se o relógio da rodada acabar, a mesa vai para uma votação final.',
      },
    ],
    faq: [
      {
        pergunta: 'Quantas pessoas precisam para jogar Espião?',
        resposta:
          'No mínimo 3, e até 20 na mesma sala. Com 3 o jogo já roda, mas ele rende mais de 5 pessoas para cima, quando há perguntas suficientes para o espião se enrolar.',
      },
      {
        pergunta: 'O espião descobre o local em algum momento?',
        resposta:
          'Só pelo que escutar. Ele começa sem nenhuma informação e precisa deduzir o local pelas respostas dos outros, enquanto responde como se já soubesse.',
      },
      {
        pergunta: 'É o mesmo que Spyfall?',
        resposta:
          'A ideia é a mesma família de jogo de dedução social — uma pessoa não sabe o local e precisa disfarçar. Esta é uma implementação própria, feita para rodar no navegador e em português.',
      },
      {
        pergunta: 'Precisa de baralho ou de algum material?',
        resposta:
          'Não. Cada pessoa usa o próprio aparelho, e é ele que guarda o segredo. Não há carta física para alguém espiar sem querer.',
      },
      {
        pergunta: 'Dá para jogar presencialmente, todo mundo na mesma mesa?',
        resposta:
          'Dá, e funciona muito bem: cada pessoa olha o próprio celular para ver o papel e a conversa acontece ao vivo. O jogo só precisa que ninguém veja a tela alheia.',
      },
    ],
  },

  {
    jogoId: 'cartas-contra-a-turma',
    slug: 'cartas-contra-a-turma',
    titulo: 'Cartas Contra a Turma — party game de cartas online e grátis',
    h1: 'Cartas Contra a Turma online',
    resumo:
      'Uma frase incompleta no meio da mesa e a pior resposta possível ganha a rodada. O juiz muda a cada turno, então todo mundo escolhe e todo mundo é julgado.',
    descricao:
      'Party game de cartas online e grátis no navegador, inspirado no Cards Against Humanity. Uma pergunta no meio da mesa, a resposta mais absurda ganha. Sem app e sem cadastro, de 3 a 20 pessoas.',
    jogadores: 'De 3 a 20 pessoas',
    duracao: 'De 15 a 40 minutos',
    abertura:
      'Cartas Contra a Turma é um party game de completar frases: uma pergunta cai no meio da mesa, cada pessoa joga uma resposta da própria mão, e quem está julgando naquela rodada escolhe a que achou melhor. As respostas só têm autor revelado depois da escolha — o juiz decide no escuro.',
    contexto:
      'O formato é o mesmo consagrado pelo Cards Against Humanity, que é distribuído sob licença aberta justamente para que versões próprias existam. Esta é uma delas: escrita em português, pensada para a turma brasileira e feita para rodar no navegador sem baralho físico. O nome é outro porque o conteúdo e as piadas também são.',
    passos: [
      {
        titulo: 'Abra a sala',
        texto:
          'Crie a sala, mande o código de 5 letras e espere a turma entrar. São necessárias pelo menos 3 pessoas: uma julga e as outras respondem.',
      },
      {
        titulo: 'Receba a sua mão',
        texto:
          'Cada pessoa começa com 7 cartas de resposta. A mão se completa a cada rodada, então ninguém fica sem opção.',
      },
      {
        titulo: 'Jogue a sua resposta',
        texto:
          'A pergunta da rodada aparece para todo mundo. Você escolhe a carta da sua mão que achar mais engraçada — ou escreve a sua do zero, se preferir. As respostas ficam anônimas até a revelação.',
      },
      {
        titulo: 'O juiz escolhe, e o juiz muda',
        texto:
          'Quem está julgando lê as respostas e escolhe a vencedora. Na rodada seguinte, o julgamento passa para outra pessoa — ao longo da partida, todo mundo julga e todo mundo é julgado.',
      },
    ],
    faq: [
      {
        pergunta: 'É o Cards Against Humanity?',
        resposta:
          'Não, é um jogo próprio no mesmo formato. O Cards Against Humanity é distribuído sob licença aberta, o que permite que versões independentes existam — esta tem conteúdo próprio, em português, e não usa as cartas do original.',
      },
      {
        pergunta: 'Preciso comprar o baralho?',
        resposta:
          'Não. Tudo acontece no navegador e as cartas são distribuídas pelo próprio jogo. Não há nada para comprar, imprimir ou recortar.',
      },
      {
        pergunta: 'Quantas pessoas precisam para jogar?',
        resposta:
          'A partir de 3 — uma julga e pelo menos duas respondem, senão o juiz não tem escolha a fazer. O jogo aguenta até 20 na mesma sala, e fica melhor com a mesa cheia.',
      },
      {
        pergunta: 'Dá para escrever a própria carta?',
        resposta:
          'Dá. Além das cartas da mão, cada pessoa pode escrever a própria resposta na hora. É de onde saem as melhores piadas, porque elas falam de algo que só aquela turma entende.',
      },
      {
        pergunta: 'O jogo é para maiores de idade?',
        resposta:
          'O formato é de humor adulto e ácido por natureza. Vale combinar antes com a mesa até onde a brincadeira vai — como o conteúdo escrito na hora é de vocês, o tom é de vocês também.',
      },
    ],
  },

  {
    jogoId: 'enigmas-sinistros',
    slug: 'enigmas-sinistros',
    titulo: 'Enigmas Sinistros online — histórias para desvendar com sim e não',
    h1: 'Enigmas Sinistros online',
    resumo:
      'Uma cena impossível é posta na mesa. Quem narra sabe o que aconteceu; o resto só pode perguntar coisas que se respondam com sim, não ou talvez.',
    descricao:
      'Jogue Enigmas Sinistros online e de graça no navegador: histórias macabras que a mesa desvenda fazendo perguntas de sim ou não. Sem app e sem cadastro, a partir de 2 pessoas.',
    jogadores: 'A partir de 2, melhor com 3 ou mais',
    duracao: 'De 5 a 15 minutos por enigma',
    abertura:
      'Enigmas Sinistros é o jogo das histórias impossíveis: uma cena estranha é anunciada — alguém morto numa sala trancada, um detalhe que não fecha — e a mesa precisa reconstruir o que aconteceu. A única ferramenta é a pergunta fechada, e a única resposta possível é sim, não ou talvez.',
    contexto:
      'É um jogo de raciocínio lateral: quase nunca a resposta está no caminho óbvio, e a virada costuma vir de uma pergunta que parecia boba. Por isso ele rende tanto em grupo — o palpite errado de uma pessoa é o que faz outra enxergar o que estava faltando.',
    passos: [
      {
        titulo: 'Abra a sala',
        texto:
          'Crie a sala e mande o código de 5 letras. Bastam 2 pessoas: uma narra e a outra desata. Com 3 ou mais fica melhor, porque aí há palpite alheio para puxar o raciocínio.',
      },
      {
        titulo: 'Quem narra recebe a solução',
        texto:
          'A cena aparece para todo mundo, mas só quem está narrando vê o que realmente aconteceu. É essa pessoa que responde a mesa.',
      },
      {
        titulo: 'Perguntem de sim ou não',
        texto:
          'A mesa faz perguntas fechadas e quem narra responde apenas sim, não ou talvez. "Talvez" existe para as perguntas que não têm resposta limpa — e costuma ser a resposta mais reveladora das três.',
      },
      {
        titulo: 'Tente desatar',
        texto:
          'Quando alguém achar que montou a história, declara a solução e quem narra julga. Se ainda faltar peça, a mesa volta a perguntar.',
      },
    ],
    faq: [
      {
        pergunta: 'Quantas pessoas precisam para jogar?',
        resposta:
          'A partir de 2: uma narra e a outra investiga. O jogo recomenda 3 ou mais, porque com mais gente perguntando aparecem caminhos que sozinho você não tentaria — mas em dois ele funciona.',
      },
      {
        pergunta: 'Preciso conhecer os enigmas antes?',
        resposta:
          'Não. Quem narra recebe a solução na própria tela quando a partida começa, então nem essa pessoa precisa ter jogado antes.',
      },
      {
        pergunta: 'É o mesmo que Black Stories?',
        resposta:
          'É a mesma família de jogo — histórias sinistras resolvidas com perguntas de sim ou não, um formato clássico de raciocínio lateral. Os enigmas daqui são próprios e em português.',
      },
      {
        pergunta: 'Dá para jogar por chamada de vídeo?',
        resposta:
          'Dá. Quem narra usa a tela para consultar a solução e o resto conversa normalmente. Também funciona com todo mundo na mesma mesa.',
      },
      {
        pergunta: 'As perguntas precisam ser digitadas?',
        resposta:
          'Dá para perguntar em voz alta e usar a tela só para registrar a resposta, o que costuma ser mais rápido quando a turma está junta. Com a mesa espalhada, digitar mantém o histórico visível para todos.',
      },
    ],
  },
]

/** O conteúdo daquele jogo, ou `undefined` para um id fora da lista. */
export function conteudoDoJogo(jogoId: string): ConteudoDoJogo | undefined {
  return CONTEUDO_DOS_JOGOS.find((conteudo) => conteudo.jogoId === jogoId)
}
