// apps/web/src/app/dashboard/layout.tsx

import { Navbar } from '@/components/ui/Navbar'
import { WalletGuard } from '@/components/ui/WalletGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
      <Navbar />
      <main className="dashboard-main">
        <WalletGuard>
          {children}
        </WalletGuard>
      </main>
    </div>
  )
}
