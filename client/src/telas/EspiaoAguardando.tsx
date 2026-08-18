import { useEffect, useRef } from 'react'
import { Botao, FaixaDeFase, FichaDeJogador, Shell } from '../componentes'
import { tocarEntrada } from '../sons'
import { nomeDoJogo } from '../../../shared/jogos-catalogo'
import type { PropsDaTela } from './tela'

/**
 * Tela de espera de Espião — quem "começa perguntando" e o botão PRONTO
 * (`ESP-05`, `ESP-06`). Some quando `jogo.espiao.rodadaIniciada` vira `true`;
 * quem decide a troca de tela é `App.tsx` (AD-008), esta tela nunca checa
 * isso sozinha.
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

  return (
    <Shell
      codigo={sala.codigo}
      titulo={nomeDoJogo(sala.jogoId)}
      faixa={<FaixaDeFase>{`Aguardando prontos · ${espiao.prontos}/${espiao.total}`}</FaixaDeFase>}
      aoSair={aoSair}
    >
      <div className="mx-auto flex max-w-[480px] flex-col gap-6">
        <div className="flex flex-col gap-1.5 rounded-bloco border border-linha bg-superficie p-5">
          <span className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
            começa perguntando
          </span>
          <h2 className="text-titulo text-texto">{espiao.comecaPerguntando.apelido}</h2>
        </div>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-mono text-[11px] tracking-[0.12em] text-texto-3 uppercase">
              na sala
            </h2>
            <span className="font-mono text-[11px] text-texto-3">
              {espiao.prontos}/{espiao.total} prontos
            </span>
          </div>
          <ul className="flex flex-col">
            {ativos.map((jogador) => (
              <FichaDeJogador
                key={jogador.id}
                apelido={jogador.apelido}
                cor={jogador.cor}
                ehVoce={jogador.id === eu.id}
                ehHost={jogador.id === sala.hostId}
                conectado={jogador.conectado}
                pronto={jogador.pronto}
              />
            ))}
          </ul>
        </section>

        <Botao
          larguraTotal
          variante={eu.pronto ? 'secundario' : 'primario'}
          onClick={() => enviar({ t: 'marcarPronto', pronto: !eu.pronto })}
        >
          {eu.pronto ? 'Não estou pronto' : 'PRONTO'}
        </Botao>
      </div>
    </Shell>
  )
}
