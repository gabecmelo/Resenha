import { useState } from 'react'
import { PIX_CHAVE, PIX_PAYLOAD, PIX_RECEBEDOR } from '../apoio'
import { tocarClique } from '../sons'
import { Modal } from './Modal'
import { QrDoPix } from './QrDoPix'

/**
 * O pires ao lado da mesa (`APOIO-01`…`APOIO-04`).
 *
 * Nada aqui bloqueia nada: o Resenha continua inteiro de graça, sem cadastro e
 * sem anúncio, e quem fecha esta janela não perde função nenhuma. Por isso ela
 * só existe atrás de um clique deliberado — nunca aparece sozinha, nunca
 * interrompe partida.
 *
 * São dois caminhos porque são duas situações reais: quem está no celular
 * copia o código e cola no banco; quem está no computador aponta a câmera para
 * a tela. O QR resolve o segundo caso, que é o mais comum quando a mesa está
 * jogando em volta de um notebook.
 */
export function ModalDeApoio({ aoFechar }: { aoFechar(): void }) {
  return (
    <Modal titulo="Se o Resenha rendeu boas risadas…" rotuloCancelar="Fechar" aoCancelar={aoFechar}>
      <p className="text-corpo text-texto-2">
        Ele é de graça, sem anúncio e sem cadastro — e vai continuar assim. Um Pix de qualquer
        valor paga o domínio e o servidor, e me diz que vale a pena seguir fazendo jogo novo.
      </p>

      {/*
        O QR não segue o tema: câmera espera tinta escura sobre papel claro, e um
        QR invertido é recusado por leitor de celular mais velho. A placa clara
        fica clara nos dois temas, e como o creme é o mesmo papel do resto do
        produto, ela não parece um corpo estranho colado na tela.
      */}
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-papel border-2 border-controle-linha bg-[#fbf5e9] p-3 shadow-botao">
          <QrDoPix className="block h-[200px] w-[200px] text-[#141210]" />
        </div>
        <p className="text-center font-mono text-rotulo text-texto-3 uppercase">
          aponte a câmera do celular
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <CopiarPix rotulo="Copiar código Pix" texto={PIX_PAYLOAD} destaque />
        <CopiarPix rotulo="Copiar só a chave" texto={PIX_CHAVE} legenda={PIX_CHAVE} />
      </div>

      <p className="text-apoio leading-relaxed text-texto-3">
        Cai na conta de <span className="font-semibold text-texto-2">{PIX_RECEBEDOR}</span>, que
        mantém o Resenha. A chave é aleatória — não é CPF nem telefone.
      </p>
    </Modal>
  )
}

/**
 * Copiar com resposta na própria etiqueta, no mesmo desenho do código da sala
 * lá no cabeçalho: o rótulo vira "copiado ✓" por dois segundos e volta. Sem
 * alerta, sem balão — a confirmação mora onde o dedo acabou de tocar.
 */
function CopiarPix({
  rotulo,
  texto,
  legenda,
  destaque = false,
}: {
  rotulo: string
  texto: string
  legenda?: string
  destaque?: boolean
}) {
  const [copiado, setCopiado] = useState(false)

  const copiar = () => {
    void navigator.clipboard
      ?.writeText(texto)
      .then(() => {
        tocarClique()
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2000)
      })
      .catch(() => setCopiado(false))
  }

  const pintura = destaque
    ? 'border-0 bg-acento text-acento-contraste font-display shadow-botao motion-safe:active:translate-x-[3px] motion-safe:active:translate-y-[3px] motion-safe:active:shadow-none'
    : 'border border-controle-linha bg-transparent text-texto font-semibold'

  return (
    <button
      type="button"
      onClick={copiar}
      className={`flex min-h-11 w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-chip px-4 py-2.5 transition-transform ${pintura}`}
    >
      <span>{copiado ? 'copiado ✓' : rotulo}</span>
      {legenda !== undefined && (
        <span className="w-full truncate text-center font-mono text-rotulo text-texto-3 lowercase">
          {legenda}
        </span>
      )}
    </button>
  )
}
