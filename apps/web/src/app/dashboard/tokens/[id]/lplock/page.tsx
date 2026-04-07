// apps/web/src/app/dashboard/tokens/[id]/lplock/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function Page() {
  const params = useParams()
  return (
    <ComingSoon
      feature="LP Lock"
      description="Lock liquidity via Unicrypt directly from the dashboard. Verifiable on-chain trust signal. Launching soon."
      backHref={`/dashboard/tokens/${params.id}`}
    />
  )
}
