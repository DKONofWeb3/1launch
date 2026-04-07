// apps/web/src/app/dashboard/tokens/[id]/whitepaper/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function Page() {
  const params = useParams()
  return (
    <ComingSoon
      feature="Whitepaper Generator"
      description="AI-generated litepaper with tokenomics, roadmap, and disclaimer. Exports as a PDF. Launching soon."
      backHref={`/dashboard/tokens/${params.id}`}
    />
  )
}
