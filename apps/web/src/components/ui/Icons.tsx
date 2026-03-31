// ─── 1launch SVG Icon System ─────────────────────────────────────────────────
// All icons are custom SVGs. No emoji. No icon libraries.

interface IconProps {
  size?: number
  className?: string
  color?: string
}

export function IconReddit({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
      <circle cx="9" cy="13" r="1.2" fill={color}/>
      <circle cx="15" cy="13" r="1.2" fill={color}/>
      <path d="M9.5 16c.7.5 1.5.8 2.5.8s1.8-.3 2.5-.8" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="19" cy="6" r="1.5" fill={color}/>
      <path d="M15.5 7.5c.3-.8 1.2-1.5 2.2-1.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8.5 7.5c-.3-.8-1.2-1.5-2.2-1.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M12 7c1.1 0 2.1.3 3 .8" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M12 7c-1.1 0-2.1.3-3 .8" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconTrendingUp({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="16 7 22 7 22 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconGoogle({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M21.8 10.2H12v3.6h5.7C17.2 16.4 14.9 18 12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6c1.5 0 2.9.6 3.9 1.5l2.6-2.6C16.7 3 14.5 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.5 0 10-4.5 10-10 0-.6-.1-1.2-.2-1.8z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconDex({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="14" width="4" height="8" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="9" y="9" width="4" height="13" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="16" y="4" width="4" height="18" rx="1" stroke={color} strokeWidth="1.5"/>
      <path d="M3 8L9 5L15 2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconCoin({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
      <path d="M12 7v10M9.5 9.5h3.75a1.75 1.75 0 0 1 0 3.5H9.5h4.25a1.75 1.75 0 0 1 0 3.5H9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconFire({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2s-5 4-5 9a5 5 0 0 0 10 0c0-2-1-4-2-5 0 2-1 3-2 3-1 0-2-1-2-3 0 1-.5 2-1 2C9 8 12 2 12 2z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconClock({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
      <path d="M12 7v5l3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconRocket({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2s-5 4-5 11l-2 2 2 2 2-1c0 2 1 4 3 4s3-2 3-4l2 1 2-2-2-2C17 6 12 2 12 2z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="11" r="2" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

export function IconBSC({ size = 16, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polygon points="12,3 15,8 12,6.5 9,8" fill="#F3BA2F"/>
      <polygon points="5,10 9,8 12,10.5 9,13" fill="#F3BA2F"/>
      <polygon points="19,10 15,8 12,10.5 15,13" fill="#F3BA2F"/>
      <polygon points="12,10.5 15,13 12,15.5 9,13" fill="#F3BA2F"/>
      <polygon points="9,15 12,17 12,21 9,19" fill="#F3BA2F"/>
      <polygon points="15,15 12,17 12,21 15,19" fill="#F3BA2F"/>
    </svg>
  )
}

export function IconSolana({ size = 16, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 17h12l3-2.5H7L4 17z" fill="#9945FF"/>
      <path d="M4 9h12l3-2.5H7L4 9z" fill="#14F195"/>
      <path d="M7 13h12l-3 2.5H4L7 13z" fill="#00C2FF"/>
    </svg>
  )
}

export function IconWallet({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M21 7H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" stroke={color} strokeWidth="1.5"/>
      <circle cx="16.5" cy="13" r="1.5" fill={color}/>
      <path d="M3 7V5a2 2 0 0 1 2-2h14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconChevronRight({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 18l6-6-6-6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconSignal({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M1.5 8.5C4.5 5.5 8 4 12 4s7.5 1.5 10.5 4.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 12c1.9-1.9 4.3-3 7-3s5.1 1.1 7 3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8.5 15.5c1-1 2.2-1.5 3.5-1.5s2.5.5 3.5 1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="19" r="1.5" fill={color}/>
    </svg>
  )
}

export function IconTikTok({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M19 3h-4v12a3 3 0 1 1-3-3V8a7 7 0 1 0 7 7V7a8 8 0 0 1-4-1V3z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconPulse({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polyline points="2 12 6 12 8 5 10 19 13 9 15 15 17 12 22 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconLaunch({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M15 3h6v6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 14L21 3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// Source icon resolver
export function SourceIcon({ source, size = 14 }: { source: string; size?: number }) {
  const icons: Record<string, JSX.Element> = {
    reddit:        <IconReddit size={size} />,
    google_trends: <IconGoogle size={size} />,
    tiktok:        <IconTikTok size={size} />,
    dexscreener:   <IconDex size={size} />,
    coingecko:     <IconCoin size={size} />,
  }
  return icons[source] ?? <IconSignal size={size} />
}
