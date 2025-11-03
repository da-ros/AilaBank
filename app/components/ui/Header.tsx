'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useWeb3 } from '@/lib/web3-context'
import { formatAddress } from '@/lib/utils'
import { LogOut, Bell, Settings, User } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const { account, disconnect } = useWeb3()
  const pathname = usePathname()
  const [showDropdown, setShowDropdown] = useState(false)

  const isActive = (path: string) => pathname === path

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity duration-200">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-md bg-white p-1.5 border border-gray-100">
              <Image 
                src="/logo.png" 
                alt="AilaBank Logo" 
                width={40} 
                height={40}
                className="object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <Image 
                src="/logowordart.png" 
                alt="AilaBank" 
                width={130} 
                height={36}
                className="object-contain"
              />
            </div>
            <span className="sm:hidden text-2xl font-bold text-gray-900">
              AilaBank
            </span>
          </Link>

          {/* Right Side */}
          {account && (
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-all relative group">
                <Bell className="w-5 h-5 text-gray-700 group-hover:text-indigo-600 transition-colors" strokeWidth={2.5} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full"></span>
              </button>

              {/* Settings */}
              <Link 
                href="/settings" 
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-all group"
              >
                <Settings className="w-5 h-5 text-gray-700 group-hover:text-indigo-600 transition-colors" strokeWidth={2.5} />
              </Link>

              {/* Account Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="bg-indigo-600 text-white flex items-center gap-2.5 px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md font-semibold"
                >
                  <User className="w-4 h-4" strokeWidth={2.5} />
                  <span className="text-sm hidden sm:inline">{formatAddress(account)}</span>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-3 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link
                      href="/profile"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors font-semibold mx-2 rounded-lg"
                      onClick={() => setShowDropdown(false)}
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4" strokeWidth={2.5} />
                        Profile
                      </div>
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors font-semibold mx-2 rounded-lg"
                      onClick={() => setShowDropdown(false)}
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-4 h-4" strokeWidth={2.5} />
                        Settings
                      </div>
                    </Link>
                    <hr className="my-2 border-gray-200" />
                    <button
                      onClick={() => {
                        disconnect()
                        setShowDropdown(false)
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-bold mx-2 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut className="w-4 h-4" strokeWidth={2.5} />
                        Disconnect
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
