import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

// "Install app" button. Chrome/Edge/Android use the install prompt; iPhone shows a short how-to.
export default function InstallApp({ className = '' }) {
  const [evt, setEvt] = useState(null)
  const [help, setHelp] = useState(false)
  const [installed, setInstalled] = useState(false)
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  useEffect(() => {
    const on = (e) => { e.preventDefault(); setEvt(e) }
    window.addEventListener('beforeinstallprompt', on)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone
  if (installed || standalone || (!evt && !ios)) return null
  return (
    <>
      <button className={className} onClick={async () => { if (evt) { evt.prompt(); await evt.userChoice; setEvt(null) } else setHelp(true) }}>
        <Download size={13} />Install app
      </button>
      {help && (
        <div className="fixed inset-0 z-[80] bg-black/40 grid place-items-center p-6" onClick={() => setHelp(false)}>
          <div className="bg-[#f3f0eb] p-6 max-w-sm border border-stone-900/30 text-stone-900 normal-case tracking-normal" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start"><h3 className="text-3xl">Install OpsPilot</h3><button onClick={() => setHelp(false)}><X size={18} /></button></div>
            <p className="text-sm text-stone-700 mt-3 leading-relaxed">On iPhone: tap the <b>Share</b> button in Safari, then choose <b>Add to Home Screen</b>. OpsPilot then opens like a normal app.</p>
          </div>
        </div>)}
    </>
  )
}
