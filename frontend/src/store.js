// localStorage with an in-memory fallback (sandboxed preview frames block localStorage)
const mem = {}
const ok = (() => { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return true } catch { return false } })()
export const store = {
  get: (k) => (ok ? localStorage.getItem(k) : mem[k] ?? null),
  set: (k, v) => { ok ? localStorage.setItem(k, v) : (mem[k] = v) },
  clear: () => { ok ? localStorage.clear() : Object.keys(mem).forEach((k) => delete mem[k]) },
}
