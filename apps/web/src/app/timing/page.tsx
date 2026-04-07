// apps/web/src/app/timing/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function TimingPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard') }, [])
  return null
}
