export const goLaunch = (nav, loc) => {
  const scroll = () => document.getElementById('launch')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  if (loc.pathname !== '/') { nav('/'); setTimeout(scroll, 350) } else scroll()
}
