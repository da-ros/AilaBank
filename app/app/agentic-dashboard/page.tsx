'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@/hooks/useWallet'
import { useVault } from '@/hooks/useVault'
import VoiceAgent from '@/components/voice/VoiceAgent'
import ChatAgent from '@/components/chat/ChatAgent'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  Wallet,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'

export default function AgenticDashboard() {
  const { account, isConnected, connect } = useWallet()
  const {
    userBalance,
    userYield,
    totalBalance,
    apy,
    tvl,
    loading,
    error,
  } = useVault()
  
  const router = useRouter()

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  if (!isConnected) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome to Your Agentic Bank
          </h1>
          <p className="text-gray-600">
            Talk to Aila or chat to manage your money. AI handles everything.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Balance */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Balance</span>
              <Wallet className="w-5 h-5 text-cyan-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${loading ? '...' : formatCurrency(totalBalance)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              ↑ {apy}% APY
            </div>
          </div>

          {/* Principal */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Principal</span>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${loading ? '...' : formatCurrency(userBalance)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Your deposits
            </div>
          </div>

          {/* Yield Earned */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Yield Earned</span>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${loading ? '...' : formatCurrency(userYield)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Interest earned
            </div>
          </div>

          {/* TVL */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Value Locked</span>
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${loading ? '...' : formatCurrency(tvl)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Platform TVL
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voice Agent */}
          <VoiceAgent className="lg:col-span-1" />

          {/* Chat Agent */}
          <ChatAgent />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center gap-2 p-4 bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-lg hover:shadow-md transition-all">
              <ArrowUpRight className="w-6 h-6 text-cyan-600" />
              <span className="text-sm font-medium text-gray-700">Deposit</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:shadow-md transition-all">
              <ArrowDownLeft className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Withdraw</span>
            </button>

            <button className="flex flex-col items-center gap-2 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:shadow-md transition-all">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium text-gray-700">View Yield</span>
            </button>

            <button className="flex flex-col items-center gap-2 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-all">
              <Activity className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">History</span>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-6 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">
                🎙️ Voice-First Banking Experience
              </h3>
              <p className="text-cyan-50 text-sm">
                Simply tell Aila what you want to do: "Deposit 100 USDC", "What's my balance?", "Withdraw 50 dollars". 
                No buttons, no forms - just talk naturally and Aila handles everything on the blockchain for you.
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 text-sm">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
