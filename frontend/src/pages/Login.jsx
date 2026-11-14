import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Brain, ShieldCheck, Zap, Star } from 'lucide-react'
import { api, errMsg } from '../api'
import { store } from '../store'
import Orbs from '../components/Orbs'
import Logo from '../components/Logo'
import OrbitVisual from '../components/OrbitVisual'

export default function Login() {
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e, creds) {
    e?.preventDefault(); setErr(''); setBusy(true)
    try {
      const body = creds || f
      const r = mode === 'login' || creds ? await api.post('/auth/login', { email: body.email, password: body.password }) : await api.post('/auth/register', body)
      store.set('token', r.data.token); store.set('user', JSON.stringify(r.data.user)); nav('/')
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_.9fr] bg-[#e9e5df]">
      <div className="hidden lg:flex relative flex-col justify-center overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(700px 500px at 70% 40%, #f3f0eb, transparent 70%), linear-gradient(120deg,#e4ddd1,#efebe4)' }} />
        <div className="relative z-10 pl-16 xl:pl-24 pr-10">
          <div className="flex items-center gap-3 mb-10"><Logo size={40} /><span className="serif text-3xl tracking-[.06em]">OPS<span className="grad-text">pilot</span></span></div>
          <h1 className="text-6xl xl:text-7xl leading-[1.02]">The Golden<br />Balance.</h1>
          <p className="mt-6 text-[15px] text-stone-700 max-w-md italic leading-relaxed">Seven autonomous agents plan, source, communicate and act across your business systems. Humans only approve the risky moves.</p>
          <div className="mt-8 max-w-[300px]"><OrbitVisual /></div>
          <div className="mt-8 flex gap-3 flex-wrap">
            {[[Brain, 'Plans & reasons'], [ShieldCheck, 'Safe by design'], [Zap, 'Acts, not just advises']].map(([I, t]) => (
              <div key={t} className="statchip"><I size={18} strokeWidth={1.4} className="text-stone-700" /><span className="upper !text-[11px]">{t}</span></div>))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="glass-strong w-full max-w-md p-8 md:p-10 fade-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-6"><Logo size={34} /><span className="serif text-2xl tracking-[.06em]">OPS<span className="grad-text">pilot</span></span></div>
          <h2 className="text-4xl">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="text-stone-500 text-sm mt-2 mb-7">{mode === 'login' ? 'Sign in to your command center' : 'Start commanding your AI crew'}</p>
          <div className="space-y-3">
            {mode === 'register' && <input className="input" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
            <input className="input" type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className="input" type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </div>
          {err && <div className="mt-3 text-sm text-rose-700 bg-rose-500/10 border border-rose-400/30 px-3 py-2">{err}</div>}
          <button className="btn btn-primary w-full justify-center mt-6 !py-3.5" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={15} /></button>
          <button type="button" className="btn btn-ghost w-full justify-center mt-3" onClick={() => submit(null, { email: 'demo@opspilot.ai', password: 'demo1234' })}>Try the live demo account</button>
          <p className="text-center text-sm text-stone-500 mt-6">
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <button type="button" className="text-stone-900 font-semibold underline underline-offset-4" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr('') }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button>
          </p>
        </form>
      </div>
    </div>
  )
}
