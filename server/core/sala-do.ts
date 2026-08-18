import {
  CONFIG_PADRAO,
  MAX_JOGADORES,
  type CodigoErro,
  type Comando,
  type EstadoSala,
  type JogadorId,
  type PacoteResumo,
} from '../../shared/protocolo'
import { JOGO_PADRAO } from '../../shared/jogos-catalogo'
import * as chat from './chat'
import { aceitar, desvincular, difundir, enviar, jogadorDe, socketsDe, vincular } from './conexoes'
import { type JogoDaSala, avisar, despachar } from './despacho'
import { carregar, destruir, salvar } from './estado'
import { definir, reagendar, vencidos } from './prazos'
import { entrar, migrarHost, reconectar } from './roster'

/** `HOST-04` — tempo de desconexão do host antes da migração automática. */
export const MIGRACAO_HOST_MS = 30_000

/** `CONN-07` — sala sem nenhuma conexão viva. */
export const SALA_VAZIA_MS = 30 * 60_000

/** `CONN-08` — sala sem nenhuma ação de jogador, mesmo com sockets abertos. */
export const SALA_OCIOSA_MS = 6 * 60 * 60_000

const MENSAGENS_DE_ERRO: Record<CodigoErro, string> = {
  SALA_NAO_ENCONTRADA: 'Sala não encontrada.',
  SALA_CHEIA: 'Esta sala já está cheia.',
  SALA_EXPIRADA: 'Esta sala expirou.',
  CODIGO_INVALIDO: 'Código de sala inválido.',
  APELIDO_INVALIDO: 'O apelido precisa ter de 2 a 16 caracteres.',
  APELIDO_EM_USO: 'Esse apelido já está na sala.',
  TOKEN_BANIDO: 'Você foi removido desta sala.',
  SEM_AUTORIDADE: 'Você não pode fazer isso.',
  FASE_INVALIDA: 'Essa ação não vale neste momento da partida.',
  JOGADOR_AGUARDANDO: 'Você entra na próxima partida.',
  JOGADOR_NAO_ENCONTRADO: 'Jogador não encontrado nesta sala.',
  JOGADORES_INSUFICIENTES: 'São necessários ao menos 3 jogadores.',
  PRONTOS_PENDENTES: 'Ainda há gente sem marcar PRONTO.',
  CARTA_INVALIDA: 'A carta precisa ter de 1 a 60 caracteres.',
  NOTAS_MUITO_LONGAS: 'O bloco de notas cabe até 2.000 caracteres.',
  CHAT_MUITO_LONGO: 'A mensagem cabe até 300 caracteres.',
  CHAT_VAZIO: 'Escreva alguma coisa antes de enviar.',
  CHAT_LIMITE_DE_TAXA: 'Calma no chat: espere um instante.',
  COMANDO_INVALIDO: 'Comando inválido.',
  LIMITE_INVALIDO: 'O limite de jogadores não serve para esta sala.',
  PACOTE_NAO_ENCONTRADO: 'Pacote não encontrado.',
  PACOTE_INDISPONIVEL: 'Não foi possível carregar o pacote no momento.',
  PACOTE_INSUFICIENTE: 'Pacote não tem cartas suficientes para esta quantidade de jogadores.',
  JOGO_INVALIDO: 'Jogo inválido.',
}

/**
 * Casca da sala: recebe conexões, roteia comandos, persiste, difunde projeções
 * e processa o alarme.
 *
 * **Nenhum campo mutável de sala vive aqui** (AD-005). Com a Hibernation API o
 * construtor roda de novo a cada hibernação e a memória JS é descartada, então
 * todo handler recarrega o documento do storage e o vínculo socket → jogador
 * vem do `serializeAttachment`.
 *
 * O jogo chega por injeção de um **registro** — `jogoId → JogoDaSala<unknown>`
 * (`AD-013`) — em vez de um único módulo fixo: o `core` continua sem importar
 * nada de `games/` (AD-002), só passa a resolver o módulo por `sala.jogoId` a
 * cada uso.
 */
export class SalaDeJogo {
  private pacotesDisponiveis: PacoteResumo[] | null = null;
  private pacotesCacheTimestamp = 0;

  constructor(
    protected readonly ctx: DurableObjectState,
    protected readonly env: Env,
    protected readonly registro: Record<string, JogoDaSala<unknown>>,
  ) {}

  /** `AD-013` — resolve o módulo do jogo desta sala; `null` é o cenário de ops
   * em que `sala.jogoId` não existe mais no registro (nunca um caminho de
   * usuário). */
  private jogoAtual(sala: EstadoSala): JogoDaSala<unknown> | null {
    return this.registro[sala.jogoId] ?? null
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/criar') {
      // `AJU-36` — sem limite pedido, a sala nasce com o padrão do produto.
      const limite = url.searchParams.get('limite')
      // `HUB-04` — sem jogoId pedido, a sala nasce com o jogo padrão do hub.
      const jogoId = url.searchParams.get('jogoId')
      return this.criar(
        url.searchParams.get('codigo') ?? '',
        limite === null ? MAX_JOGADORES : Number(limite),
        jogoId === null ? JOGO_PADRAO : jogoId,
      )
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('esperado upgrade para websocket', { status: 426 })
    }
    return this.conectar(url.searchParams.get('token'))
  }

  // -------------------------------------------------------------------------
  // Ciclo de vida da sala
  // -------------------------------------------------------------------------

  /** `SALA-01` — 409 quando o código já é de uma sala viva (colisão). */
  private async criar(
    codigo: string,
    limiteJogadores: number,
    jogoId: string,
  ): Promise<Response> {
    if (await this.carregarSala()) return new Response('sala já existe', { status: 409 })

    const agora = Date.now()
    const sala: EstadoSala = {
      codigo,
      fase: 'lobby',
      // O criador vira host ao entrar; até lá a sala não tem comando.
      hostId: '',
      // `AJU-40` — gravado uma vez; nenhum comando o alcança depois.
      limiteJogadores,
      // `HUB-01` — qual jogo esta sala roda; fixado na criação.
      jogoId,
      jogadores: [],
      banidos: [],
      config: { ...CONFIG_PADRAO },
      chat: [],
      jogo: null,
      prazos: { turno: null, migracaoHost: null, salaVazia: null, salaOciosa: null },
      ultimaAcaoEm: agora,
    }
    await this.persistir(sala)
    return new Response(null, { status: 201 })
  }

  /** `AJU-37`, `SALA-06`, `CONN-04` — o que barra a conexão barra no handshake. */
  private async conectar(token: string | null): Promise<Response> {
    const sala = await this.carregarSala()
    if (sala === null) return recusar('SALA_NAO_ENCONTRADA')

    const hash = token === null ? null : await hashDeToken(token)
    if (hash !== null && sala.banidos.includes(hash)) return recusar('TOKEN_BANIDO')

    const temVaga = hash !== null && sala.jogadores.some((j) => j.tokenHash === hash)
    if (!temVaga && sala.jogadores.length >= sala.limiteJogadores) return recusar('SALA_CHEIA')

    return aceitar(this.ctx)
  }

  // -------------------------------------------------------------------------
  // Handlers da Hibernation API
  // -------------------------------------------------------------------------

  async webSocketMessage(ws: WebSocket, mensagem: string | ArrayBuffer): Promise<void> {
    const comando = interpretar(mensagem)
    // Mensagem malformada é descartada; o socket segue aberto.
    if (comando === null) return

    const sala = await this.carregarSala()
    if (sala === null) {
      enviar(ws, erro('SALA_EXPIRADA'))
      ws.close(1000, 'SALA_EXPIRADA')
      return
    }

    if (comando.t === 'entrar') return this.entrarNaSala(ws, sala, comando.apelido)
    if (comando.t === 'ola') return this.reconectarNaSala(ws, sala, comando.token)

    const autorId = jogadorDe(ws)
    if (autorId === null) {
      enviar(ws, erro('SEM_AUTORIDADE'))
      return
    }

    const resultado = await despachar(sala, this.registro, autorId, comando, ambienteAgora(), this.env)
    if (!resultado.ok) {
      enviar(ws, erro(resultado.erro))
      return
    }

    for (const id of resultado.valor.removidos) this.encerrarSockets(id)
    // `CONN-08` — comando de jogador é o que conta como atividade. Reconectar
    // não conta: aba esquecida aberta é exatamente a sala que deve expirar.
    sala.ultimaAcaoEm = Date.now()
    await this.confirmar(sala)
  }

  /** `CONN-03` — a vaga é preservada; só o estado de conexão muda. */
  async webSocketClose(ws: WebSocket): Promise<void> {
    const jogadorId = jogadorDe(ws)
    desvincular(ws)
    if (jogadorId === null) return

    const sala = await this.carregarSala()
    if (sala === null) return

    // Outra aba do mesmo jogador ainda conectada: ele não está fora.
    if (socketsDe(this.ctx, jogadorId).length > 0) return

    const jogador = sala.jogadores.find((j) => j.id === jogadorId)
    if (jogador === undefined) return

    const agora = Date.now()
    jogador.conectado = false
    jogador.desconectadoEm = agora

    // `HOST-04` — a migração é agendada, não imediata.
    if (jogadorId === sala.hostId) definir(sala, 'migracaoHost', agora + MIGRACAO_HOST_MS)

    await this.confirmar(sala)
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws)
  }

  /** AD-010 — todos os prazos da sala chegam por aqui, num alarme só. */
  async alarm(): Promise<void> {
    const sala = await this.carregarSala()
    if (sala === null) return

    const agora = Date.now()
    const devidos = vencidos(sala, agora)

    // `CONN-07`, `CONN-08` — expirar encerra a sala; nada mais importa depois.
    if (devidos.includes('salaVazia') || devidos.includes('salaOciosa')) {
      await this.expirar()
      return
    }

    for (const tipo of devidos) {
      if (tipo === 'turno') {
        // `JOGO-07` — o alarme acorda o Durable Object hibernado.
        definir(sala, 'turno', null)
        // Cenário de ops (jogo removido do registro): pula o efeito neste
        // ciclo em vez de travar a sala.
        const jogo = this.jogoAtual(sala)
        if (jogo !== null) {
          avisar(sala, jogo, { t: 'venceuPrazoTurno' }, { agora, aleatorio: Math.random })
        }
      } else if (tipo === 'migracaoHost') {
        definir(sala, 'migracaoHost', null)
        const novoHost = migrarHost(sala)
        if (novoHost !== null) {
          const apelido = sala.jogadores.find((j) => j.id === novoHost)?.apelido
          chat.registrarSistema(sala, `${apelido} agora comanda a sala.`, agora)
        }
      }
    }

    await this.confirmar(sala)
  }

  // -------------------------------------------------------------------------
  // Handshake
  // -------------------------------------------------------------------------

  /** `CONN-01`, `SALA-01`, `SALA-09`, `SALA-10` */
  private async entrarNaSala(
    ws: WebSocket,
    sala: EstadoSala,
    apelido: string,
  ): Promise<void> {
    const agora = Date.now()
    const token = crypto.randomUUID()
    const id = crypto.randomUUID().slice(0, 8)

    const entrada = entrar(sala, { id, apelido, tokenHash: await hashDeToken(token) }, agora)
    if (!entrada.ok) {
      // A entrada é recusada, mas o socket fica: dá para tentar outro apelido.
      enviar(ws, erro(entrada.erro))
      return
    }

    // `SALA-01` — quem cria a sala é o primeiro a entrar, e vira host.
    if (sala.hostId === '') sala.hostId = id

    vincular(ws, id)
    enviar(ws, { t: 'entrou', token, jogadorId: id })
    chat.registrarSistema(sala, `${entrada.valor.apelido} entrou na sala.`, agora)
    // `ESCR-10` — o jogo decide o que fazer com quem chega no meio.
    // Cenário de ops (jogo removido do registro): pula o efeito neste ciclo.
    const jogo = this.jogoAtual(sala)
    if (jogo !== null) {
      avisar(sala, jogo, { t: 'entrouJogador', jogadorId: id }, { agora, aleatorio: Math.random })
    }

    sala.ultimaAcaoEm = agora
    await this.confirmar(sala)
  }

  /** `CONN-02`, `CONN-04` — mesma vaga, com tudo que ela guardava. */
  private async reconectarNaSala(
    ws: WebSocket,
    sala: EstadoSala,
    token: string,
  ): Promise<void> {
    const volta = reconectar(sala, await hashDeToken(token))
    if (!volta.ok) {
      enviar(ws, erro(volta.erro))
      ws.close(1000, volta.erro)
      return
    }

    vincular(ws, volta.valor.id)
    enviar(ws, { t: 'entrou', token, jogadorId: volta.valor.id })
    // `HOST-04` — o host voltou antes dos 30s: a migração não acontece.
    if (volta.valor.id === sala.hostId) definir(sala, 'migracaoHost', null)

    await this.confirmar(sala)
  }

  // -------------------------------------------------------------------------
  // Auxiliares
  // -------------------------------------------------------------------------

  private carregarSala(): Promise<EstadoSala | null> {
    return carregar<unknown>(this.ctx.storage)
  }

  private async confirmar(sala: EstadoSala): Promise<void> {
    this.atualizarCicloDeVida(sala)
    await this.persistir(sala)

    let pacotes: PacoteResumo[] | undefined = undefined;
    if (sala.fase === 'lobby') {
      const todos = await this.getPacotesDisponiveis();
      // `ESP-22` — cada jogo só vê os pacotes que ele mesmo pode jogar.
      //
      // O catálogo vai no lobby de qualquer sala, e não só quando
      // `modoPacote === 'pacote'`: aquele campo é vocabulário de "Quem Sou
      // Eu?" (que tem escrita livre), e os jogos que só existem com pacote
      // não deveriam precisar falar essa língua pra ver a própria lista
      // (`CCT-31`). Quem não usa pacote simplesmente não desenha a lista.
      pacotes = todos.filter((p) => p.jogoId === sala.jogoId);
    }

    // Cenário de ops (jogo removido do registro): pula a difusão neste ciclo
    // em vez de travar a sala.
    const jogo = this.jogoAtual(sala)
    if (jogo === null) return

    difundir(this.ctx, (paraJogador) => {
      const projecao = jogo.projetar(sala.jogo, sala, paraJogador);
      projecao.agoraServidor = Date.now();
      if (pacotes) {
        projecao.sala.pacotesDisponiveis = pacotes;
      }
      return projecao;
    });
  }

  private async getPacotesDisponiveis(): Promise<PacoteResumo[]> {
    const agora = Date.now();
    if (this.pacotesDisponiveis === null || agora - this.pacotesCacheTimestamp > 60_000) {
      try {
        const pacotes = await this.env.PACOTES_KV.get<PacoteResumo[]>('pacotes:indice', 'json');
        if (pacotes && pacotes.length > 0) {
          this.pacotesDisponiveis = pacotes;
        } else {
          // Fallback para ambiente local de dev onde o miniflare pode não ter lido o SQLite do script
          const { PACOTES } = await import('../../shared/pacotes-dados');
          const { LOCAIS } = await import('../../shared/locais-dados');
          // `CCT-31` — os pacotes de Cartas Contra a Turma têm outro formato
          // (perguntas + respostas, sem dificuldade), mas o resumo do lobby é
          // o mesmo: id, nome, emoji, quantidade e o `jogoId` que filtra.
          const { CARTAS_TURMA } = await import('../../shared/cartas-turma-dados');
          this.pacotesDisponiveis = [...PACOTES, ...LOCAIS, ...CARTAS_TURMA].map(p => ({
            id: p.id,
            jogoId: p.jogoId,
            nome: p.nome,
            descricao: p.descricao,
            emoji: p.emoji,
            quantidade: p.quantidade
          }));
        }
        this.pacotesCacheTimestamp = agora;
      } catch {
        this.pacotesDisponiveis = [];
      }
    }
    return this.pacotesDisponiveis;
  }

  /**
   * `CONN-07`, `CONN-08` — os dois prazos de vida da sala são recalculados a
   * cada mutação, num lugar só. Passam pelo agendador como qualquer outro
   * prazo (AD-010): agendar o turno não pode cancelar a expiração.
   */
  private atualizarCicloDeVida(sala: EstadoSala): void {
    const agora = Date.now()
    const vazia = this.conexoesVivas() === 0
    definir(sala, 'salaVazia', vazia ? agora + SALA_VAZIA_MS : null)
    definir(sala, 'salaOciosa', sala.ultimaAcaoEm + SALA_OCIOSA_MS)
  }

  /** Sockets que já pertencem a um jogador — o socket em fechamento já saiu. */
  private conexoesVivas(): number {
    return this.ctx.getWebSockets().filter((ws) => jogadorDe(ws) !== null).length
  }

  /** Destrói a sala e derruba quem estiver conectado. O código volta a ser livre. */
  private async expirar(): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) {
      enviar(socket, erro('SALA_EXPIRADA'))
      socket.close(1000, 'SALA_EXPIRADA')
    }
    await destruir(this.ctx.storage)
    await this.ctx.storage.deleteAlarm()
  }

  private async persistir(sala: EstadoSala): Promise<void> {
    await salvar(this.ctx.storage, sala)
    await reagendar(this.ctx.storage, sala)
  }

  private encerrarSockets(jogadorId: JogadorId): void {
    for (const socket of socketsDe(this.ctx, jogadorId)) {
      desvincular(socket)
      socket.close(1000, 'fora da sala')
    }
  }
}

// ---------------------------------------------------------------------------
// Funções de plataforma
// ---------------------------------------------------------------------------

function ambienteAgora() {
  return { agora: Date.now(), aleatorio: Math.random }
}

function erro(codigo: CodigoErro): { t: 'erro'; codigo: CodigoErro; mensagem: string } {
  return { t: 'erro', codigo, mensagem: MENSAGENS_DE_ERRO[codigo] }
}

/** Recusa antes de aceitar a conexão na Hibernation API: o socket morre já. */
function recusar(codigo: CodigoErro): Response {
  const par = new WebSocketPair()
  par[1].accept()
  enviar(par[1], erro(codigo))
  par[1].close(1000, codigo)
  return new Response(null, { status: 101, webSocket: par[0] })
}

/** JSON malformado, binário ou sem `t` vira `null` — o socket não cai por isso. */
function interpretar(mensagem: string | ArrayBuffer): Comando | null {
  if (typeof mensagem !== 'string') return null
  try {
    const dados: unknown = JSON.parse(mensagem)
    if (typeof dados !== 'object' || dados === null) return null
    if (typeof (dados as { t?: unknown }).t !== 'string') return null
    return dados as Comando
  } catch {
    return null
  }
}

/** AD-006 — o documento da sala guarda o hash, nunca o token. */
async function hashDeToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
