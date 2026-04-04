// apps/web/src/app/miniapp/layout.tsx
// Lightweight shell that redirects to main site pages
// The main site IS the mini app — one UI for everything

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    // Initialize Telegram WebApp if available
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      try { tg.setHeaderColor('#0A0A0F') } catch {}
      try { tg.setBackgroundColor('#0A0A0F') } catch {}
    }
  }, [])

  // Just render children — the main dashboard layout handles everything
  return <>{children}</>
}
