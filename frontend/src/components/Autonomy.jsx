import { useState } from 'react'
import { ShieldCheck, Scale, Rocket } from 'lucide-react'
import { store } from '../store'

export const LEVELS = [
  { id: 'cautious', icon: ShieldCheck, name: 'Cautious', d: 'Every purchase order waits for your approval' },
  { id: 'balanced', icon: Scale, name: 'Balanced', d: 'Auto-approve up to ₹50,000 within policy' },
  { id: 'autonomous', icon: Rocket, name: 'Autonomous', d: 'Auto-approve up to ₹1,00,000 within policy' },
]
export const getAutonomy = () => store.get('autonomy') || 'balanced'

export default function Autonomy() {
  const [v, setV] = useState(getAutonomy())
  return (
    <div>
      <div className="upper text-stone-500 mb-2">Autonomy level · how much the crew may do alone</div>
      <div className="grid sm:grid-cols-3 gap-2">
        {LEVELS.map((l) => (
          <button key={l.id} onClick={() => { setV(l.id); store.set('autonomy', l.id) }}
            className={`text-left p-3.5 border transition ${v === l.id ? 'bg-stone-900 text-stone-100 border-stone-900' : 'bg-white/50 border-stone-900/20 hover:border-stone-900'}`}>
            <div className="flex items-center gap-2 text-sm font-semibold"><l.icon size={16} strokeWidth={1.5} />{l.name}</div>
            <div className={`text-[11px] mt-1 leading-snug ${v === l.id ? 'text-stone-300' : 'text-stone-500'}`}>{l.d}</div>
          </button>))}
      </div>
    </div>
  )
}
