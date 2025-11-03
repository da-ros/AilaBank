'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  DollarSign,
  Mic,
  CreditCard,
  MessageSquare,
  TrendingUp,
  Settings,
  HelpCircle,
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    name: 'Income Hub',
    href: '/income',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Voice Banking',
    href: '/voice',
    icon: Mic,
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Virtual Cards',
    href: '/cards',
    icon: CreditCard,
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Chat with Aila',
    href: '/chat',
    icon: MessageSquare,
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    name: 'Yield Analytics',
    href: '/analytics',
    icon: TrendingUp,
    gradient: 'from-indigo-500 to-blue-500',
  },
]

const secondaryNav = [
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    name: 'Help & Support',
    href: '/support',
    icon: HelpCircle,
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 fixed left-0 top-[73px] bottom-0 overflow-y-auto shadow-sm">
      {/* Logo Section */}
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-md bg-white p-1">
            <Image
              src="/logo.png"
              alt="Aila Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <h2 className="font-bold text-xl text-gray-900">AilaBank</h2>
            <p className="text-xs text-gray-600 font-semibold">AI-Powered Banking</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-6">
        {/* Main Navigation */}
        <nav className="space-y-1.5">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-600'}`} strokeWidth={2.5} />
                <span className={`font-semibold text-sm ${active ? 'text-white' : ''}`}>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Divider */}
        <div className="my-6 border-t border-gray-200" />

        {/* Secondary Navigation */}
        <nav className="space-y-1.5">
          {secondaryNav.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={2.5} />
                <span className="font-semibold text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Card */}
      <div className="p-5">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white shadow-lg">
          <div className="relative">
            <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-xl shadow-lg">
              💡
            </div>
            <h3 className="font-bold text-base mb-2">Pro Tip</h3>
            <p className="text-sm text-white/95 mb-4 leading-relaxed font-medium">
              Connect your income sources to maximize your yield earnings automatically!
            </p>
            <Link
              href="/income"
              className="bg-white text-indigo-700 block text-center text-sm py-2.5 px-4 rounded-lg font-bold hover:bg-indigo-50 transition-all shadow-md"
            >
              Connect Now →
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}
