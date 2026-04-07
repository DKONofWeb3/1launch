// apps/web/src/app/dashboard/tokens/[id]/roadmap/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function Page() {
  const params = useParams()
  return (
    <ComingSoon
      feature="Post-Launch Roadmap"
      description="AI-generated 30-day action plan with milestones and KPIs. Launching soon."
      backHref={`/dashboard/tokens/${params.id}`}
    />
  )
}
