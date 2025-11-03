'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 btn-primary p-4 rounded-full shadow-2xl hover:shadow-glow-lg transition-all animate-pulse-glow"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />
          <div className="lg:hidden fixed top-[65px] left-0 bottom-0 w-64 bg-gradient-to-b from-[#fafafa] via-white to-[#fafafa] z-40 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-300">
            <Sidebar />
          </div>
        </>
      )}
    </>
  )
}
