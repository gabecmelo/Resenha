import { useState } from 'react'
import type { Ambiente, CodigoErro, Config, PacoteResumo } from '../../../../shared/protocolo'
import { CONFIG_PADRAO } from '../../../../shared/protocolo'
import { minJogadoresDoJogo, nomeDoJogo, recomendadoDoJogo } from '../../../../shared/jogos-catalogo'
import { PACOTES } from '../../../../shared/pacotes-dados'
import { LOCAIS } from '../../../../shared/locais-dados'
import { ENIGMAS } from '../../../../shared/enigmas-dados'
import { CARTAS_DEDO } from '../../../../shared/dedo-dados'
import { BarraDeAcao, Botao, Shell } from '../../componentes'
import { tocarClique } from '../../sons'
import { MAX_NA_MESA, motivoParaComecar, nomesDaMesa } from '../../passaejoga/nomes'
import { type MesaLocal, iniciar } from '../../passaejoga/motor'
import { RegrasDoJogo } from '../Lobby'

/**
 * A mesa: quem vai jogar e como (`PJ-06`–`PJ-10`).
 *
 * É a única configuração que existe no modo, e cada campo a mais aqui é meio
 * minuto de festa parada. Por isso a tela pede duas coisas e nada além: os
 * nomes, **na ordem da roda**, e as regras daquele jogo.
 *
 * As regras vêm do mesmo bloco do Lobby (`RegrasDoJogo`), com `local` ligado:
 * o que descreve coordenação entre aparelhos some da tela porque num aparelho
 * só ninguém escolhe isso — o motor já o fixa (`PJ-09`). Duas listas de regras
 * pro mesmo jogo divergiriam na primeira opção nova.
 *
 * Cor de jogador e ordem de circulação não aparecem em lugar nenhum: são
 * sorteadas no `iniciar` (`PJ-10`).
 */
export function Mesa({
  jogoId,
  aoComecar,
  aoVoltar,
}: {
  jogoId: string
  aoComecar(mesa: MesaLocal): void
  aoVoltar(): void
}) {
  const minimo = minJogadoresDoJogo(jogoId)
  const [nomes, setNomes] = useState<string[]>(() => Array<string>(minimo).fill(''))
  const [config, setConfig] = useState<Config>(() => configInicial(jogoId))
  const [recusa, setRecusa] = useState<string | null>(null)

  const motivo = motivoParaComecar(nomes, jogoId)
  const recomendado = recomendadoDoJogo(jogoId)
  const abaixoDoRecomendado =
    recomendado !== undefined && motivo === undefined && nomes.length < recomendado

  const mudar = (indice: number, nome: string) =>
    setNomes((antes) => antes.map((atual, i) => (i === indice ? nome : atual)))

  const somar = () => {
    tocarClique()
    setNomes((antes) => [...antes, ''])
  }

  const tirar = (indice: number) => {
    tocarClique()
    setNomes((antes) => antes.filter((_, i) => i !== indice))
  }

  /*
    O adaptador que faz os blocos de regra do Lobby servirem aqui: na sala eles
    mandam `configurar` pelo socket e o servidor responde com a projeção nova;
    aqui a config é estado local e ainda não existe partida. Mesclagem rasa
    basta porque cada bloco já monta o objeto aninhado inteiro antes de enviar.
  */
  const configurar: React.ComponentProps<typeof RegrasDoJogo>['enviar'] = (comando) => {
    if (comando.t !== 'configurar') return
    setConfig((antes) => ({ ...antes, ...comando.config }))
    setRecusa(null)
  }

  const comecar = () => {
    const ambiente: Ambiente = { agora: Date.now(), aleatorio: Math.random }
    const partida = iniciar(jogoId, nomesDaMesa(nomes), config, ambiente)
    if (!partida.ok) {
      setRecusa(FRASE_DA_RECUSA[partida.erro] ?? 'Não deu pra começar agora.')
      return
    }
    aoComecar(partida.valor)
  }

  return (
    <Shell titulo={nomeDoJogo(jogoId)}>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5">
        <div className="flex flex-col items-start gap-2">
          <span className="selo bg-acento text-acento-contraste">um celular só</span>
          <h1 className="font-display text-display text-balance text-texto">Quem vai jogar?</h1>
          {/*
            `PJ-07` — a ordem digitada é a ordem de passagem. Dito antes dos
            campos, e com o porquê junto: sem o motivo a mesa digita na ordem
            em que lembra dos nomes, e aí o aparelho atravessa a mesa a cada
            volta em vez de andar de vizinho pra vizinho.
          */}
          <p className="text-corpo text-texto-3">
            Escreva na ordem da roda, do seu lado esquerdo pro direito. É por ela que o aparelho
            vai circular — assim ele só anda de vizinho pra vizinho.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {nomes.map((nome, indice) => (
            <div key={indice} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-6 flex-none text-right font-mono text-[13px] text-texto-3 tabular-nums"
              >
                {indice + 1}
              </span>
              <input
                type="text"
                value={nome}
                aria-label={`Jogador ${indice + 1}`}
                placeholder="Nome de quem senta aqui"
                onChange={(evento) => mudar(indice, evento.target.value)}
                className="min-h-[52px] w-full min-w-0 rounded-chip border border-linha bg-superficie px-3.5 text-[17px] text-texto caret-acento placeholder:text-texto-apagado focus:border-controle-linha focus:outline-none"
              />
              <button
                type="button"
                aria-label={`Tirar o jogador ${indice + 1} da roda`}
                disabled={nomes.length <= minimo}
                onClick={() => tirar(indice)}
                className="flex h-11 w-9 flex-none cursor-pointer items-center justify-center rounded-chip text-[20px] text-texto-3 hover:text-texto disabled:cursor-not-allowed disabled:text-texto-apagado"
              >
                ×
              </button>
            </div>
          ))}

          <Botao
            variante="terciario"
            onClick={somar}
            motivo={
              nomes.length >= MAX_NA_MESA
                ? `A mesa cabe até ${MAX_NA_MESA} pessoas.`
                : undefined
            }
          >
            + mais uma pessoa
          </Botao>
        </div>

        <div className="flex flex-col overflow-hidden rounded-papel border border-linha bg-superficie">
          <div className="border-b border-linha px-3.5 py-2.5">
            <h2 className="font-mono text-rotulo text-texto-3 uppercase">as regras da partida</h2>
          </div>
          <div className="p-3.5">
            <RegrasDoJogo
              jogoId={jogoId}
              config={config}
              pacotesDisponiveis={pacotesDoJogo(jogoId)}
              souHost
              local
              enviar={configurar}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={aoVoltar}
          className="min-h-11 cursor-pointer self-start font-mono text-rotulo text-texto-3 uppercase underline underline-offset-4"
        >
          ← trocar de jogo
        </button>
      </div>

      <BarraDeAcao>
        <div className="flex flex-col gap-2">
          {recusa !== null && (
            <p className="flex gap-2 text-apoio text-acento">
              <span aria-hidden="true">▲</span>
              <span>{recusa}</span>
            </p>
          )}
          {abaixoDoRecomendado && (
            <p className="text-apoio text-texto-3">
              Dá pra jogar assim, mas fica melhor com {recomendado}.
            </p>
          )}
          <Botao larguraTotal onClick={comecar} motivo={motivo}>
            Começar a partida
          </Botao>
        </div>
      </BarraDeAcao>
    </Shell>
  )
}

/**
 * O que a mesa lê quando `iniciarRodada` recusa (`PJ-08`, `PJ-31`).
 *
 * Quem cobra o mínimo e o pacote é o mesmo `iniciarRodada` da sala online — a
 * tela não repete a regra, só traduz a recusa em português.
 */
const FRASE_DA_RECUSA: Partial<Record<CodigoErro, string>> = {
  JOGADORES_INSUFICIENTES: 'Esse jogo pede mais gente na roda.',
  PACOTE_NAO_ENCONTRADO: 'Escolha pelo menos um pacote nas regras acima.',
  PACOTE_INSUFICIENTE: 'O que está escolhido não dá cartas pra uma partida.',
  JOGO_INVALIDO: 'Esse jogo não roda num aparelho só.',
}

/**
 * Os pacotes daquele jogo, direto do dado que já vive em `shared/` (`AD-012`).
 *
 * Na sala online esta lista vem na projeção, montada pelo servidor a partir do
 * mesmo dado. Sem rede, ela é montada aqui — é o que faz a mesa escolher o
 * pacote no fundo do bar sem sinal (`PJ-15`).
 */
function pacotesDoJogo(jogoId: string): PacoteResumo[] {
  return [...PACOTES, ...LOCAIS, ...ENIGMAS, ...CARTAS_DEDO]
    .filter((pacote) => pacote.jogoId === jogoId)
    .map((pacote) => ({
      id: pacote.id,
      jogoId: pacote.jogoId,
      nome: pacote.nome,
      descricao: pacote.descricao,
      emoji: pacote.emoji,
      quantidade: pacote.quantidade,
      // A chave não vai quando não há o que dizer (`exactOptionalPropertyTypes`).
      ...('creditos' in pacote && pacote.creditos !== undefined
        ? { creditos: pacote.creditos }
        : {}),
      ...('aviso' in pacote && pacote.aviso !== undefined ? { aviso: pacote.aviso } : {}),
    }))
}

/**
 * A config com que a mesa abre: o padrão do produto, com os pacotes daquele
 * jogo já marcados.
 *
 * Marcar por padrão porque numa festa a primeira tela não pode ser uma
 * pendência: quem quiser trocar troca nas regras acima, e quem não quiser
 * começa. `modoPacote` fica como o padrão manda — quem precisa dele em
 * `pacote` é o próprio bloco de regras do jogo, que já cuida disso.
 */
function configInicial(jogoId: string): Config {
  return { ...CONFIG_PADRAO, pacoteIds: pacotesDoJogo(jogoId).map((pacote) => pacote.id) }
}
