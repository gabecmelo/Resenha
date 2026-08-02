import { env, runInDurableObject } from 'cloudflare:test'
import { expect, it } from 'vitest'

it('instancia o Durable Object e faz round-trip no storage', async () => {
  const stub = env.SALA.get(env.SALA.idFromName('FUMACA'))

  await runInDurableObject(stub, async (_instancia, state) => {
    await state.storage.put('fumaca', { valor: 42 })
  })

  const lido = await runInDurableObject(stub, (_instancia, state) =>
    state.storage.get<{ valor: number }>('fumaca'),
  )

  expect(lido).toEqual({ valor: 42 })
})

it('usa o backend SQLite exigido pela migração new_sqlite_classes', async () => {
  const stub = env.SALA.get(env.SALA.idFromName('FUMACA-SQL'))

  const linhas = await runInDurableObject(stub, (_instancia, state) => [
    ...state.storage.sql.exec<{ um: number }>('SELECT 1 AS um'),
  ])

  expect(linhas).toEqual([{ um: 1 }])
})
