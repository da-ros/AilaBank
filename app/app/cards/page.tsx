'use client'

import { useState } from 'react'
import { CreditCard, Plus, Lock, Unlock, Eye, EyeOff, Copy, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Card = {
  id: string
  name: string
  last4: string
  balance: number
  limit: number
  status: 'active' | 'frozen'
  color: string
}

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([
    {
      id: '1',
      name: 'Primary Card',
      last4: '4242',
      balance: 1250.00,
      limit: 5000,
      status: 'active',
      color: 'from-blue-500 to-purple-600',
    },
    {
      id: '2',
      name: 'Shopping Card',
      last4: '8888',
      balance: 500.00,
      limit: 2000,
      status: 'active',
      color: 'from-green-500 to-teal-600',
    },
  ])
  const [selectedCard, setSelectedCard] = useState<Card | null>(cards[0])
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  const toggleCardStatus = (cardId: string) => {
    setCards(cards.map(card =>
      card.id === cardId
        ? { ...card, status: card.status === 'active' ? 'frozen' : 'active' }
        : card
    ))
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Virtual Cards</h1>
          <p className="text-gray-600 mt-2">Manage your Visa cards and spending limits</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Selected Card Display */}
            {selectedCard && (
              <div className="mb-6">
                <div className={`bg-gradient-to-br ${selectedCard.color} rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden`}>
                  {/* Card Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white" />
                    <div className="absolute -right-5 -bottom-5 w-32 h-32 rounded-full bg-white" />
                  </div>

                  {/* Card Content */}
                  <div className="relative">
                    <div className="flex justify-between items-start mb-12">
                      <div>
                        <p className="text-white/80 text-sm mb-1">AilaBank</p>
                        <p className="text-2xl font-bold">{selectedCard.name}</p>
                      </div>
                      <CreditCard className="w-12 h-12 text-white/80" />
                    </div>

                    {/* Card Number */}
                    <div className="mb-8">
                      {showDetails ? (
                        <p className="text-2xl font-mono tracking-wider">4532 1234 5678 {selectedCard.last4}</p>
                      ) : (
                        <p className="text-2xl font-mono tracking-wider">•••• •••• •••• {selectedCard.last4}</p>
                      )}
                    </div>

                    {/* Card Details */}
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-white/80 text-xs mb-1">Card Holder</p>
                        <p className="font-semibold">YOUR NAME</p>
                      </div>
                      <div>
                        <p className="text-white/80 text-xs mb-1">Expires</p>
                        <p className="font-semibold">{showDetails ? '12/27' : '••/••'}</p>
                      </div>
                      <div>
                        <p className="text-white/80 text-xs mb-1">CVV</p>
                        <p className="font-semibold">{showDetails ? '123' : '•••'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex-1 bg-white py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow"
                  >
                    {showDetails ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    {showDetails ? 'Hide' : 'Show'} Details
                  </button>
                  <button
                    onClick={() => toggleCardStatus(selectedCard.id)}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow ${
                      selectedCard.status === 'active'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {selectedCard.status === 'active' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    {selectedCard.status === 'active' ? 'Freeze' : 'Unfreeze'} Card
                  </button>
                  <button
                    onClick={() => handleCopy(`4532 1234 5678 ${selectedCard.last4}`)}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'Copied!' : 'Copy Number'}
                  </button>
                </div>
              </div>
            )}

            {/* Card Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-6 shadow">
                <p className="text-gray-600 text-sm mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedCard?.balance || 0)}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow">
                <p className="text-gray-600 text-sm mb-1">Spending Limit</p>
                <p className="text-2xl font-bold">{formatCurrency(selectedCard?.limit || 0)}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow">
                <p className="text-gray-600 text-sm mb-1">This Month</p>
                <p className="text-2xl font-bold text-blue-600">$750.00</p>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
              <div className="space-y-3">
                {[
                  { merchant: 'Amazon.com', amount: -89.99, date: '2 hours ago', category: 'Shopping' },
                  { merchant: 'Starbucks', amount: -5.50, date: 'Yesterday', category: 'Food & Drink' },
                  { merchant: 'Netflix', amount: -15.99, date: '2 days ago', category: 'Entertainment' },
                  { merchant: 'Shell Gas Station', amount: -45.00, date: '3 days ago', category: 'Transport' },
                ].map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="font-semibold">{tx.merchant}</p>
                      <p className="text-sm text-gray-500">{tx.date} • {tx.category}</p>
                    </div>
                    <p className={`font-bold ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* All Cards */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Your Cards</h3>
                <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {cards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedCard?.id === card.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{card.name}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        card.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {card.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">•••• {card.last4}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Card Settings */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="font-semibold mb-4">Card Settings</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Daily Limit</p>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    defaultValue="1000"
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$0</span>
                    <span>$1,000</span>
                    <span>$5,000</span>
                  </div>
                </div>
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <span className="text-sm font-medium">Online Purchases</span>
                  <input type="checkbox" className="toggle" defaultChecked />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <span className="text-sm font-medium">Contactless</span>
                  <input type="checkbox" className="toggle" defaultChecked />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <span className="text-sm font-medium">ATM Withdrawals</span>
                  <input type="checkbox" className="toggle" />
                </label>
              </div>
            </div>

            {/* Spending Insights */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 shadow-lg">
              <h3 className="font-semibold mb-4">💡 Spending This Month</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Shopping</span>
                    <span className="font-semibold">$420</span>
                  </div>
                  <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full" style={{ width: '42%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Food & Drink</span>
                    <span className="font-semibold">$230</span>
                  </div>
                  <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-600 h-full" style={{ width: '23%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Entertainment</span>
                    <span className="font-semibold">$100</span>
                  </div>
                  <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full" style={{ width: '10%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
