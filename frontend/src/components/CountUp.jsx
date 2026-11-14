import { useEffect, useState } from 'react'
export default function CountUp({ to, format = (n) => Math.round(n) }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf; const t0 = performance.now()
    const tick = (now) => { const k = Math.min(1, (now - t0) / 1400); setV(to * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{format(v)}</>
}
