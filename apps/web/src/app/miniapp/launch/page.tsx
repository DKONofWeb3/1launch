// apps/web/src/app/miniapp/launch/page.tsx

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MiniAppLaunch() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/launch')
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>
        Loading launch flow...
      </div>
    </div>
  )
}
