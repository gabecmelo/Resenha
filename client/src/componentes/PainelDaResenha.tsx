import type { Comando, Projecao } from '../../../shared/protocolo'
import { Chat } from './Chat'
import { PainelRecolhivel } from './PainelRecolhivel'

/**
 * A conversa da sala, no canto de toda tela de partida.
 *
 * Num aparelho só ela não existe: a mesa está na mesma sala, e um campo de
 * recado que ninguém do outro lado vai ler é pior que campo nenhum (`PJ-21`).
 * A decisão mora aqui dentro, e não em cada tela, porque o painel aparece duas
 * vezes em cada uma — a coluna do celular e a do desktop — e a mesma pergunta
 * feita duas vezes por tela é a que um dia sai respondida diferente.
 */
export function PainelDaResenha({
  projecao,
  enviar,
  modo,
}: {
  projecao: Projecao
  enviar(comando: Comando): void
  modo: 'sala' | 'local'
}) {
  if (modo === 'local') return null
  return (
    <PainelRecolhivel rotulo="resenha" contagem={projecao.chat.length}>
      <Chat mensagens={projecao.chat} aoEnviar={(texto) => enviar({ t: 'chat', texto })} />
    </PainelRecolhivel>
  )
}
