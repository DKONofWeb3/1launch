// apps/web/src/app/dashboard/tokens/[id]/bot/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function Page() {
  const params = useParams()
  return (
    <ComingSoon
      feature="Volume Bot"
      description="Automated market activity across 3-50 wallets. Keeps your chart alive on DEX screeners. Launching soon."
      backHref={`/dashboard/tokens/${params.id}`}
    />
  )
}
