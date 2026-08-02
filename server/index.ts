export { SalaDurableObject } from './core/sala-do'

export default {
  async fetch(_request: Request): Promise<Response> {
    return new Response('não implementado', { status: 501 })
  },
}
