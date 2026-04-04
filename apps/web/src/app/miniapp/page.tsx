// apps/web/src/app/miniapp/page.tsx
// Redirect to main dashboard — one UI for everything

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MiniAppHome() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard') }, [])
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0A0A0F' }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>Loading...</div>
    </div>
  )
}
