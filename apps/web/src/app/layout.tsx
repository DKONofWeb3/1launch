import type { Metadata } from 'next'
import { Providers } from '@/providers'
import './globals.css'

export const metadata: Metadata = {
  title: '1launch — Launch memecoins in minutes',
  description: 'AI-powered memecoin launcher. Narrative intelligence to live token in under 5 minutes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
