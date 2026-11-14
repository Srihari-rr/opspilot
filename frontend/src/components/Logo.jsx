export default function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="#2b2824" strokeWidth="1.2" aria-hidden>
      <circle cx="20" cy="20" r="17" />
      <circle cx="20" cy="20" r="10.5" strokeDasharray="2 2.5" opacity=".6" />
      <path d="M10 22 L30 11 L23 29 L20 22.5 Z" fill="#2b2824" stroke="none" />
    </svg>
  )
}
