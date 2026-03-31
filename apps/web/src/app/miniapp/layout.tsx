// apps/web/src/app/miniapp/layout.tsx

'use client'

import { useEffect, useState } from 'react'

// Telegram WebApp is injected by Telegram automatically
// No npm package needed - just reference window.Telegram.WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        setHeaderColor: (color: string) => void
        setBackgroundColor: (color: string) => void
        initDataUnsafe?: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
          }
        }
      }
    }
  }
}

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  const [tgUser, setTgUser] = useState<any>(null)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      try { tg.setHeaderColor('#0A0A0F') } catch {}
      try { tg.setBackgroundColor('#0A0A0F') } catch {}
      if (tg.initDataUnsafe?.user) setTgUser(tg.initDataUnsafe.user)
    }
  }, [])

  const current = typeof window !== 'undefined' ? window.location.pathname : ''

  const tabs = [
    { href: '/miniapp',         label: 'Feed',    icon: feedIcon    },
    { href: '/miniapp/launch',  label: 'Launch',  icon: launchIcon  },
    { href: '/miniapp/tokens',  label: 'Tokens',  icon: tokensIcon  },
    { href: '/miniapp/timing',  label: 'Timing',  icon: timingIcon  },
  ]

  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1E1E2E',
        padding: '0 16px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#00FF88', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 900, color: '#F9FAFB' }}>1launch</span>
        </div>
        {tgUser && (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>
            gm {tgUser.first_name}
          </span>
        )}
      </div>

      {/* Page content with bottom padding for tab bar */}
      <div style={{ paddingBottom: 68 }}>
        {children}
      </div>

      {/* Bottom tab bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(10,10,15,0.98)',
        borderTop: '1px solid #1E1E2E',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        zIndex: 100,
      }}>
        {tabs.map(tab => {
          const active = current === tab.href || (tab.href !== '/miniapp' && current.startsWith(tab.href))
          return (
            <a
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, padding: '10px 0', textDecoration: 'none',
                color: active ? '#00FF88' : '#4B5563',
                transition: 'color 0.15s',
              }}
            >
              {tab.icon(active)}
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>
                {tab.label}
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

const feedIcon = (active: boolean) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke={active ? '#00FF88' : '#4B5563'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const launchIcon = (active: boolean) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={active ? '#00FF88' : '#4B5563'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const tokensIcon = (active: boolean) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={active ? '#00FF88' : '#4B5563'} strokeWidth="2"/>
    <path d="M12 6v6l4 2" stroke={active ? '#00FF88' : '#4B5563'} strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const timingIcon = (active: boolean) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M18 20V10M12 20V4M6 20v-6" stroke={active ? '#00FF88' : '#4B5563'} strokeWidth="2" strokeLinecap="round"/>
  </svg>
)
