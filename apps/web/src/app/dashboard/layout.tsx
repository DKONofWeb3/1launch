import { Navbar } from '@/components/ui/Navbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
      <Navbar />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
