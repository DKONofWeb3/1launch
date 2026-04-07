// apps/web/src/app/dashboard/tokens/[id]/memekit/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function Page() {
  const params = useParams()
  return (
    <ComingSoon
      feature="Meme Kit Generator"
      description="5 AI-generated meme images tailored to your token's narrative. Launching soon."
      backHref={`/dashboard/tokens/${params.id}`}
    />
  )
}
