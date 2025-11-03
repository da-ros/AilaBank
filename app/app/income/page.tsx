'use client'

import { useState } from 'react'
import { Plus, Check, TrendingUp, Calendar } from 'lucide-react'
import { INCOME_SOURCES } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

export default function IncomePage() {
  const [connectedSources, setConnectedSources] = useState<string[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)

  const handleConnect = (sourceId: string) => {
    setConnecting(sourceId)
    // Simulate API call
    setTimeout(() => {
      setConnectedSources([...connectedSources, sourceId])
      setConnecting(null)
    }, 1500)
  }

  const totalMonthlyIncome = connectedSources.length * 1250 // Mock calculation

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Income Hub</h1>
          <p className="text-gray-600 text-lg font-medium">Connect your income sources for automatic deposits to your vault</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Stats */}
            {connectedSources.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-white mb-8 shadow-xl">
                <h2 className="text-2xl mb-6 font-bold">Monthly Income Overview</h2>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
                    <p className="text-white/95 text-sm mb-2 font-bold uppercase tracking-wide">Total Monthly</p>
                    <p className="text-4xl font-bold">{formatCurrency(totalMonthlyIncome)}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
                    <p className="text-white/95 text-sm mb-2 font-bold uppercase tracking-wide">Sources Connected</p>
                    <p className="text-4xl font-bold">{connectedSources.length}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
                    <p className="text-white/95 text-sm mb-2 font-bold uppercase tracking-wide">Auto-Deposit</p>
                    <p className="text-4xl font-bold">ON</p>
                  </div>
                </div>
              </div>
            )}

            {/* Available Sources */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold mb-8 text-gray-900">Connect Income Sources</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {INCOME_SOURCES.map((source) => {
                  const isConnected = connectedSources.includes(source.id)
                  const isConnecting = connecting === source.id

                  return (
                    <div
                      key={source.id}
                      className={`border-2 rounded-xl p-6 transition-all hover:shadow-md ${
                        isConnected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-indigo-400 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="text-5xl">{source.icon}</div>
                        {isConnected && (
                          <div className="bg-emerald-500 p-1.5 rounded-full shadow-md">
                            <Check className="w-5 h-5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-xl mb-2 text-gray-900">{source.name}</h3>
                      <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed">{source.description}</p>
                      <button
                        onClick={() => !isConnected && handleConnect(source.id)}
                        disabled={isConnected || isConnecting}
                        className={`w-full py-3.5 rounded-xl font-bold transition-all text-base ${
                          isConnected
                            ? 'bg-emerald-500 text-white cursor-default shadow-sm'
                            : isConnecting
                            ? 'bg-gray-200 text-gray-600 cursor-wait'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                        }`}
                      >
                        {isConnected ? '✓ Connected' : isConnecting ? '⏳ Connecting...' : 'Connect'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Connected Sources Details */}
            {connectedSources.length > 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold mb-8 text-gray-900">Your Income Streams</h2>
                <div className="space-y-4">
                  {connectedSources.map((sourceId) => {
                    const source = INCOME_SOURCES.find((s) => s.id === sourceId)
                    if (!source) return null

                    return (
                      <div key={sourceId} className="border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-gray-300 transition-all bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="text-4xl">{source.icon}</div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{source.name}</h3>
                              <p className="text-sm text-gray-500 font-medium">Last deposit: 2 days ago</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-600">+$1,250</p>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">per month</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Auto-Deposit Settings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg mb-5 flex items-center gap-3 text-gray-900">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                Auto-Deposit Settings
              </h3>
              <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed">
                Automatically deposit incoming payments to your AilaBank vault to earn yield
              </p>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                  <span className="text-sm font-bold text-gray-900">Enable Auto-Deposit</span>
                  <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500" defaultChecked={connectedSources.length > 0} />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                  <span className="text-sm font-bold text-gray-900">Instant Yield Allocation</span>
                  <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500" defaultChecked />
                </label>
              </div>
            </div>

            {/* Next Payment */}
            {connectedSources.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="font-bold text-lg mb-5 flex items-center gap-3 text-gray-900">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Next Payment
                </h3>
                <div className="space-y-4">
                  <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-gray-600 mb-2 font-bold uppercase tracking-wide">Expected Amount</p>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalMonthlyIncome)}</p>
                  </div>
                  <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2 font-bold uppercase tracking-wide">Estimated Date</p>
                    <p className="text-xl font-bold text-gray-900">November 15, 2025</p>
                  </div>
                </div>
              </div>
            )}

            {/* Benefits */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 shadow-sm border border-emerald-200">
              <h3 className="font-bold text-lg mb-5 text-gray-900">💡 Pro Tips</h3>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-1" strokeWidth={2.5} />
                  <span className="font-semibold text-gray-700 leading-relaxed">Connect multiple sources for diversified income streams</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-1" strokeWidth={2.5} />
                  <span className="font-semibold text-gray-700 leading-relaxed">Auto-deposit funds start earning yield immediately</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-1" strokeWidth={2.5} />
                  <span className="font-semibold text-gray-700 leading-relaxed">Track all income sources in one unified dashboard</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
