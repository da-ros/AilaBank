'use client'

import { useWeb3 } from '@/lib/web3-context'
import Header from './Header'
import Sidebar from './Sidebar'
import MobileSidebar from './MobileSidebar'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { account } = useWeb3()

  if (!account) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 pt-4">
          {children}
        </main>
      </div>
      <MobileSidebar />
    </div>
  )
}
