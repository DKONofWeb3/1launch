// apps/web/src/components/ui/BackButton.tsx

'use client'

import { useRouter } from 'next/navigation'

export function BackButton({ href, label = 'Back' }: { href?: string; label?: string }) {
  const router = useRouter()

  return (
    <button
      onClick={() => href ? router.push(href) : router.back()}
      className="back-btn"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </button>
  )
}
