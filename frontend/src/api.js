import axios from 'axios'
import { store } from './store'
import demoAdapter from './demo/adapter'
import { api as engine } from './demo/engine'

export const DEMO = import.meta.env.VITE_DEMO === '1'

export const BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const api = axios.create({ baseURL: BASE + '/api', ...(DEMO ? { adapter: demoAdapter } : {}) })

api.interceptors.request.use((cfg) => {
  const t = store.get('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && !location.pathname.startsWith('/login')) {
    store.clear(); location.href = '/login'
  }
  return Promise.reject(e)
})

export const errMsg = (e) => e.response?.data?.error || e.message || 'Something went wrong'
export const inr = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN')

// Live stream of agent events (Server-Sent Events)
export function openStream(id, onEvent) {
  if (DEMO) return engine.subscribe(id, onEvent)
  const es = new EventSource(`${BASE}/api/runs/${id}/stream?token=${store.get('token')}`)
  es.onmessage = (m) => onEvent(JSON.parse(m.data))
  return es
}
