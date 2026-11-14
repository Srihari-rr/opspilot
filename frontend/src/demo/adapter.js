// Fake axios adapter: answers /api calls from the in-browser engine.
import { api as E } from './engine'

const fail = (status, error, config) => Promise.reject(Object.assign(new Error(error), { response: { status, data: { error }, config } }))
export default function adapter(config) {
  const url = (config.url || '').replace(/^\/api/, '').split('?')[0]
  const method = (config.method || 'get').toLowerCase()
  const body = config.data ? JSON.parse(config.data) : {}
  const ok = (data) => new Promise((r) => setTimeout(() => r({ data, status: 200, statusText: 'OK', headers: {}, config }), 60))
  let m
  if (url === '/health') return ok({ ok: true, ai: 'demo', policy: {} })
  if (url === '/auth/login') return body.email === 'demo@opspilot.ai' && body.password === 'demo1234'
    ? ok({ token: 'demo-token', user: { id: 1, name: 'Demo Manager', email: body.email } }) : fail(401, 'Wrong email or password', config)
  if (url === '/auth/register') return ok({ token: 'demo-token', user: { id: 2, name: body.name || 'Guest', email: body.email } })
  if (url === '/systems') return ok(E.systems())
  if (url === '/signals') return ok(E.signals())
  if (url === '/insights') return ok(E.insights())
  if (url === '/ask') return ok(E.ask(body.question || ''))
  if (url === '/reset') return ok(E.reset())
  if (url === '/runs' && method === 'post') return body.incident?.length >= 8 ? ok(E.createRun(body.incident, body.autonomy)) : fail(400, 'Describe the incident in a sentence', config)
  if (url === '/runs') return ok(E.runsList())
  if ((m = url.match(/^\/runs\/(\d+)\/decision$/))) return ok(E.decide(m[1], body.decisions))
  if ((m = url.match(/^\/runs\/(\d+)$/))) { const r = E.run(m[1]); return r ? ok(r) : fail(404, 'Run not found', config) }
  return fail(404, 'Not found', config)
}
