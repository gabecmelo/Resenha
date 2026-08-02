import type { EstadoSala } from '../../shared/protocolo'

/**
 * Persistência do documento da sala (AD-005).
 *
 * É o único ponto do sistema que toca o storage do Durable Object. O documento
 * inteiro é lido e gravado de uma vez: a sala tem poucos KB e é sempre usada
 * inteira, então normalizar em tabelas seria custo de migração sem ganho.
 *
 * Com a Hibernation API a memória JS do Durable Object é descartada quando a
 * sala fica ociosa. Guardar o documento aqui, a cada mutação, é o que faz
 * `CONN-05` valer — nada de estado de sala sobrevive fora do storage.
 */
const CHAVE = 'sala'

/** `SALA-06` — `null` significa "esta sala nunca foi criada" (ou já expirou). */
export async function carregar<E>(storage: DurableObjectStorage): Promise<EstadoSala<E> | null> {
  const documento = await storage.get<EstadoSala<E>>(CHAVE)
  return documento ?? null
}

export async function salvar<E>(
  storage: DurableObjectStorage,
  sala: EstadoSala<E>,
): Promise<void> {
  await storage.put(CHAVE, sala)
}

/** `CONN-07`, `CONN-08` — devolve o Durable Object ao estado não-inicializado. */
export async function destruir(storage: DurableObjectStorage): Promise<void> {
  await storage.deleteAll()
}
