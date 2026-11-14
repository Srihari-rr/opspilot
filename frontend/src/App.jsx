import { Routes, Route, Navigate, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Home, History as HistoryIcon, BarChart3, Database, User, Plus, Search, Bell, Cpu, LogOut, ArrowRight } from 'lucide-react'
import { api } from './api'
import { store } from './store'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RunView from './pages/RunView'
import Systems from './pages/Systems'
import HistoryPage from './pages/History'
import Insights from './pages/Insights'
import Copilot from './components/Copilot'
import InstallApp from './components/InstallApp'
import Orbs from './components/Orbs'
import Logo from './components/Logo'
import { goLaunch } from './nav'

function Protected({ children }) {
  return store.get('token') ? children : <Navigate to="/login" replace />
}

function Shell({ children }) {
  const nav = useNavigate()
  const loc = useLocation()
  const user = JSON.parse(store.get('user') || '{}')
  const [ai, setAi] = useState(null)
  useEffect(() => { api.get('/health').then((r) => setAi(r.data.ai)).catch(() => {}) }, [])
  const logout = () => { store.clear(); nav('/login') }
  const link = ({ isActive }) => `navlink ${isActive ? 'on' : ''}`
  const AiBadge = () => ai && (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${ai === 'gemini' ? 'bg-emerald-400' : 'bg-amber-300'}`} />
      {ai === 'gemini' ? 'Gemini AI live' : ai === 'demo' ? 'Demo mode' : 'Offline simulation'}
    </span>
  )
  const bn = (to, Icon, label) => (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => `bn ${isActive ? 'on' : ''}`}><Icon size={20} strokeWidth={1.5} />{label}</NavLink>
  )
  const Word = ({ s = 'text-[26px]' }) => <span className={`serif tracking-[.06em] ${s}`}>OPS<span className="grad-text">pilot</span></span>
  return (
    <div className="min-h-screen relative">
      <div className="topbar">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-10 flex items-center justify-between gap-4">
          <span className="hidden sm:block">AI crew online · 24 / 7</span>
          <span className="sm:hidden">AI crew online</span>
          <span className="flex items-center gap-5"><InstallApp className="flex items-center gap-1.5 border border-stone-400/60 px-2.5 py-1 hover:bg-white/10" /><AiBadge /><span className="hidden md:block opacity-80">Agentic AI &amp; Intelligent Systems</span></span>
        </div>
      </div>
      {/* desktop header */}
      <header className="sticky top-0 z-40 hidden md:block border-b border-stone-900/10 bg-[#f3f0eb]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-8 h-[74px] flex items-center">
          <Link to="/" className="flex items-center gap-3"><Logo size={34} /><Word /></Link>
          <nav className="flex gap-10 mx-auto">
            <NavLink to="/" end className={link}>Command Center</NavLink>
            <NavLink to="/insights" className={link}>Insights</NavLink>
            <NavLink to="/systems" className={link}>Business Systems</NavLink>
            <NavLink to="/history" className={link}>Run History</NavLink>
          </nav>
          <div className="flex items-center gap-4">
            <button className="btn btn-primary !py-2.5" onClick={() => goLaunch(nav, loc)}>Launch Crew</button>
            <button title="Log out" onClick={logout} className="w-10 h-10 rounded-full grid place-items-center bg-stone-800 text-stone-100 text-sm serif border border-stone-900">{(user.name || 'U')[0]}</button>
          </div>
        </div>
      </header>
      {/* mobile header */}
      <header className="md:hidden relative z-10 px-5 py-4 flex items-center gap-3 bg-[#f3f0eb] border-b border-stone-900/10">
        <Logo size={34} />
        <div className="leading-tight"><Word s="text-[22px]" /></div>
        <button title="Log out" onClick={logout} className="ml-auto w-9 h-9 rounded-full grid place-items-center bg-stone-800 text-stone-100 text-sm serif">{(user.name || 'U')[0]}</button>
      </header>

      <Copilot />
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-28 md:pb-10 relative z-10">{children}</main>

      <footer className="hidden md:block bg-[#4a4844] text-stone-300 mt-6">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center gap-8">
          <div className="flex items-center gap-3"><span className="serif text-2xl tracking-[.06em] text-stone-100">OPSpilot</span></div>
          <div className="mx-auto flex gap-10 upper"><Link to="/">Home</Link><Link to="/insights">Insights</Link><Link to="/systems">Systems</Link><Link to="/history">History</Link></div>
          <div className="upper !tracking-[.08em] opacity-70">Detect · Decide · Deliver</div>
        </div>
      </footer>

      {/* mobile bottom nav */}
      <nav className="bottomnav md:hidden">
        {bn('/', Home, 'Home')}
        {bn('/insights', BarChart3, 'Insights')}
        <button className="fab" aria-label="Launch" onClick={() => goLaunch(nav, loc)}><Plus size={26} strokeWidth={1.5} /></button>
        {bn('/systems', Database, 'Systems')}
        {bn('/history', HistoryIcon, 'History')}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Shell><Dashboard /></Shell></Protected>} />
      <Route path="/runs/:id" element={<Protected><Shell><RunView /></Shell></Protected>} />
      <Route path="/insights" element={<Protected><Shell><Insights /></Shell></Protected>} />
      <Route path="/systems" element={<Protected><Shell><Systems /></Shell></Protected>} />
      <Route path="/history" element={<Protected><Shell><HistoryPage /></Shell></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
