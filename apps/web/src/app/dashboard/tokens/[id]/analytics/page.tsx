// apps/web/src/app/dashboard/tokens/[id]/analytics/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function Page() {
  const params = useParams()
  return (
    <ComingSoon
      feature="On-Chain Analytics"
      description="Sniper tracker, whale monitor, and holder analysis. Launching soon."
      backHref={`/dashboard/tokens/${params.id}`}
    />
  )
}
