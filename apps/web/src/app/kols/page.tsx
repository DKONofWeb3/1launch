// apps/web/src/app/kols/page.tsx
'use client'

import { ComingSoon } from '@/components/ui/ComingSoon'

export default function KOLsPage() {
  return (
    <ComingSoon
      feature="KOL Marketplace"
      description="Vetted crypto influencers ranked by engagement rate. Book directly through 1launch. Launching soon."
      backHref="/dashboard"
    />
  )
}
