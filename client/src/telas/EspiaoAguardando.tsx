import { useEffect, useRef } from 'react'
import {
  BarraDeAcao,
  BlocoDeNotas,
  Botao,
  Chat,
  FaixaDeFase,
  MarcadorDeJogador,
  PainelRecolhivel,
  Shell,
  TiraDePacotes,
} from '../componentes'
import { tocarEntrada } from '../sons'
import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import type { PropsDaTela } from './tela'

/**
 * Tela de espera de Espião — quem "começa perguntando" e o botão PRONTO
 * (`ESP-05`, `ESP-06`). Some quando `jogo.espiao.rodadaIniciada` vira `true`;
 * quem decide a troca de tela é `App.tsx` (AD-008), esta tela nunca checa
 * isso sozinha.
 *
 * Uma informação só manda aqui: **quem começa perguntando**. O papel já foi
 * sorteado mas não aparece — é a rodada que abre o papel, e é justamente essa
 * espera que cria a expectativa certa. Por isso cada PRONTO novo dá som e vira
 * verde na hora: a espera é olhando os outros, não a própria tela.
 */
export function EspiaoAguardando({ projecao, enviar, aoSair }: PropsDaTela) {
  const { sala, eu, jogadores } = projecao
  const espiao = projecao.jogo?.espiao
  const ativos = jogadores.filter((jogador) => jogador.situacao === 'ativo')

  // Cada PRONTO novo de outra pessoa dá um retorno audível — a espera aqui é
  // olhando pros outros marcarem, não pra própria tela.
  const prontosAnteriorRef = useRef(espiao?.prontos ?? 0)
  const prontos = espiao?.prontos ?? 0
  useEffect(() => {
    if (prontos > prontosAnteriorRef.current) tocarEntrada()
    prontosAnteriorRef.current = prontos
  }, [prontos])

  if (espiao === undefined) return null

  const faltam = ativos.filter((jogador) => !jogador.pronto)
  const comeca = jogadores.find((jogador) => jogador.id === espiao.comecaPerguntando.id)

  return (
    <Shell
      codigo={sala.codigo}
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={
        <FaixaDeFase selo={eu.pronto ? 'você está pronto' : 'aguardando'} tom={eu.pronto ? 'pronto' : 'esmalte'}>
          {eu.pronto
            ? faltam.length === 0
              ? 'Todo mundo marcou — a rodada abre agora.'
              : `Falta ${listar(faltam.map((jogador) => jogador.apelido))}.`
            : 'A rodada abre quando todo mundo marcar.'}
        </FaixaDeFase>
      }
      aoSair={aoSair}
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <TiraDePacotes pacotes={sala.pacotesSelecionados} />

          <section className="flex flex-col gap-2.5 rounded-papel border-2 border-controle-linha bg-superficie p-4 shadow-botao">
            <span className="font-mono text-rotulo text-texto-3 uppercase">começa perguntando</span>
            <span className="flex items-center gap-3">
              {comeca !== undefined && (
                <MarcadorDeJogador apelido={comeca.apelido} cor={comeca.cor} tamanho="grande" />
              )}
              <span className="min-w-0 truncate font-display text-display text-texto">
                {espiao.comecaPerguntando.apelido}
              </span>
            </span>
            <p className="text-apoio leading-relaxed text-texto-2">
              {espiao.comecaPerguntando.apelido} escolhe a primeira pessoa pra perguntar. Depois
              disso, quem responde escolhe quem responde em seguida.
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-papel border border-linha bg-superficie p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-mono text-rotulo text-texto-3 uppercase">na sala</h2>
              <span className="font-mono text-dado text-texto">
                {espiao.prontos}
                <span className="text-texto-3">/{espiao.total} prontos</span>
              </span>
            </div>

            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ativos.map((jogador) => (
                <li
                  key={jogador.id}
                  className={`flex min-h-12 items-center gap-2 rounded-botao border px-2.5 py-2 ${
                    jogador.pronto ? 'border-pronto' : 'border-linha'
                  } ${jogador.conectado ? '' : 'opacity-55'}`}
                >
                  <MarcadorDeJogador
                    apelido={jogador.apelido}
                    cor={jogador.cor}
                    tamanho="grande"
                  />
                  <span className="min-w-0 flex-1 truncate text-apoio font-semibold text-texto">
                    {jogador.apelido}
                    {jogador.id === eu.id && <span className="text-texto-3"> · você</span>}
                  </span>
                  <span
                    className={`flex-none font-mono text-compacto-apoio ${
                      jogador.pronto ? 'text-pronto' : 'text-texto-3'
                    }`}
                  >
                    <span aria-hidden="true">{jogador.pronto ? '✓' : '···'}</span>
                    <span className="sr-only">{jogador.pronto ? 'pronto' : 'ainda não'}</span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="border-t border-dashed border-linha pt-2.5 text-apoio text-texto-3">
              A rodada abre quando todos marcarem.{' '}
              <strong className="font-semibold text-texto">
                Seu papel aparece nesse momento
              </strong>{' '}
              — nem antes.
            </p>
          </section>

          <div className="flex flex-col gap-3 lg:hidden">
            <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
            <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
              <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
            </PainelRecolhivel>
          </div>
        </div>

        <div className="hidden flex-col gap-3 lg:flex">
          <BlocoDeNotas texto={eu.notas} aoMudar={(texto) => enviar({ t: 'notas', texto })} />
          <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
            <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
          </PainelRecolhivel>
        </div>
      </div>

      <BarraDeAcao>
        <Botao
          larguraTotal
          variante={eu.pronto ? 'secundario' : 'primario'}
          onClick={() => enviar({ t: 'marcarPronto', pronto: !eu.pronto })}
        >
          {eu.pronto ? 'Não estou pronto' : 'Estou pronto'}
        </Botao>
        {faltam.length > 0 && (
          <p className="text-apoio text-texto-3">
            {faltam.length === espiao.total
              ? 'Ninguém marcou ainda.'
              : `${faltam.length === 1 ? 'Falta' : 'Faltam'} ${listar(
                  faltam.map((jogador) => jogador.apelido),
                )}.`}
          </p>
        )}
      </BarraDeAcao>
    </Shell>
  )
}

function listar(apelidos: string[]): string {
  if (apelidos.length === 0) return 'ninguém'
  if (apelidos.length === 1) return apelidos[0] ?? 'alguém'
  return `${apelidos.slice(0, -1).join(', ')} e ${apelidos[apelidos.length - 1]}`
}
