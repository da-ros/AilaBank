'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWeb3 } from '@/lib/web3-context'
import { formatCurrency } from '@/lib/utils'
import {
  CreditCard,
  Mic,
  TrendingUp,
  Send,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  MessageSquare,
  DollarSign,
  X,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const { account, balance, vaultBalance, deposit, withdraw } = useWeb3()
  const router = useRouter()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isDepositing, setIsDepositing] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!account) {
      router.push('/')
    }
  }, [account, router])

  if (!account) {
    return null
  }

  const totalBalance = parseFloat(balance || '0') + parseFloat(vaultBalance || '0')
  const yieldEarned = parseFloat(vaultBalance || '0') * 0.05 // Mock 5% yield

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setIsDepositing(true)
    setTransactionStatus('Approving USDC...')
    
    try {
      await deposit(depositAmount)
      setTransactionStatus('Deposit successful!')
      setDepositAmount('')
      setTimeout(() => {
        setShowDepositModal(false)
        setTransactionStatus(null)
      }, 2000)
    } catch (error: any) {
      console.error('Deposit failed:', error)
      setTransactionStatus(`Error: ${error.message || 'Transaction failed'}`)
    } finally {
      setIsDepositing(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (parseFloat(withdrawAmount) > parseFloat(vaultBalance || '0')) {
      alert('Insufficient vault balance')
      return
    }

    setIsWithdrawing(true)
    setTransactionStatus('Processing withdrawal...')
    
    try {
      await withdraw(withdrawAmount)
      setTransactionStatus('Withdrawal successful!')
      setWithdrawAmount('')
      setTimeout(() => {
        setShowWithdrawModal(false)
        setTransactionStatus(null)
      }, 2000)
    } catch (error: any) {
      console.error('Withdraw failed:', error)
      setTransactionStatus(`Error: ${error.message || 'Transaction failed'}`)
    } finally {
      setIsWithdrawing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fafafa] via-white to-[#f3f4f6]">

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Balance Overview */}
            <div className="bg-gradient-aila rounded-3xl p-8 text-white shadow-2xl shadow-purple-500/20 animate-gradient">
              <div className="mb-4">
                <p className="text-white/80 mb-1 font-medium">Total Balance</p>
                <h1 className="text-5xl font-bold drop-shadow-lg">{formatCurrency(totalBalance)}</h1>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-effect rounded-xl p-4">
                  <p className="text-white/80 text-sm mb-1 font-medium">In Vault</p>
                  <p className="text-2xl font-semibold">{formatCurrency(parseFloat(vaultBalance || '0'))}</p>
                </div>
                <div className="glass-effect rounded-xl p-4">
                  <p className="text-white/80 text-sm mb-1 font-medium">Yield Earned</p>
                  <p className="text-2xl font-semibold text-emerald-300">+{formatCurrency(yieldEarned)}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDepositModal(true)}
                  className="flex-1 bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-gray-50 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  Deposit
                </button>
                <button 
                  onClick={() => setShowWithdrawModal(true)}
                  className="flex-1 glass-effect text-white py-3 rounded-xl font-bold hover:bg-white/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowUpRight className="w-5 h-5" />
                  Withdraw
                </button>
                <Link
                  href="/transfer"
                  className="flex-1 glass-effect text-white py-3 rounded-xl font-bold hover:bg-white/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send
                </Link>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Income Hub */}
              <Link href="/income" className="card-aila hover:shadow-xl bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Income Hub</h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">Connect your salary, gig work, and other income sources</p>
                <div className="flex items-center text-emerald-600 font-semibold">
                  Connect Sources
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </div>
              </Link>

              {/* Voice Banking */}
              <Link href="/voice" className="card-aila hover:shadow-xl bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Voice Banking</h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">Talk to your AI assistant for instant banking</p>
                <div className="flex items-center text-purple-600 font-semibold">
                  Start Voice Session
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </div>
              </Link>

              {/* Cards */}
              <Link href="/cards" className="card-aila hover:shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Virtual Cards</h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">Manage your Visa cards and spending limits</p>
                <div className="flex items-center text-blue-600 font-semibold">
                  View Cards
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </div>
              </Link>

              {/* AI Chat */}
              <Link href="/chat" className="card-aila hover:shadow-xl bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Chat with Aila</h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">Chat with your personal banking AI agent</p>
                <div className="flex items-center text-orange-600 font-semibold">
                  Start Chat
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </div>
              </Link>
            </div>
          </div>

          {/* Sidebar - Right 1/3 */}
          <div className="space-y-6">
            {/* Wallet Balance */}
            <div className="card-aila bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-900">
                <Wallet className="w-5 h-5 text-indigo-600" />
                Wallet Balance
              </h3>
              <p className="text-3xl font-bold mb-1 text-gray-900">{formatCurrency(parseFloat(balance || '0'))}</p>
              <p className="text-sm text-gray-600 font-medium">Available to deposit</p>
            </div>

            {/* Recent Activity */}
            <div className="card-aila">
              <h3 className="font-bold mb-4 text-gray-900">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-full shadow-md">
                      <ArrowDownLeft className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">Deposit</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <p className="font-bold text-green-600">+$100.00</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-500 p-2 rounded-full shadow-md">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">Yield Earned</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  <p className="font-bold text-blue-600">+$2.50</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-full">
                      <ArrowUpRight className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Withdrawal</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                  <p className="font-semibold text-purple-600">-$50.00</p>
                </div>
              </div>
            </div>

            {/* Yield Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                Yield Performance
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Current APY</span>
                    <span className="font-semibold text-green-600">5.2%</span>
                  </div>
                  <div className="bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 h-full" style={{ width: '52%' }} />
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600 mb-1">This Month</p>
                  <p className="text-2xl font-bold text-green-600">+{formatCurrency(yieldEarned)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Deposit USDC</h2>
              <button 
                onClick={() => setShowDepositModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-lg"
              />
              <p className="text-sm text-gray-500 mt-2">
                Available: {formatCurrency(parseFloat(balance || '0'))}
              </p>
            </div>

            <div className="flex gap-2 mb-6">
              {['10', '50', '100', '500'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount(amount)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  ${amount}
                </button>
              ))}
            </div>

            {transactionStatus && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                transactionStatus.includes('successful') 
                  ? 'bg-green-100 text-green-700' 
                  : transactionStatus.includes('Error')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {transactionStatus}
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={isDepositing || !depositAmount}
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDepositing ? 'Processing...' : 'Deposit to Vault'}
            </button>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Withdraw USDC</h2>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 text-lg"
              />
              <p className="text-sm text-gray-500 mt-2">
                Available in Vault: {formatCurrency(parseFloat(vaultBalance || '0'))}
              </p>
            </div>

            <div className="flex gap-2 mb-6">
              {['10', '50', '100', 'Max'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setWithdrawAmount(amount === 'Max' ? vaultBalance || '0' : amount)}
                  className="flex-1 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg text-sm font-medium transition-colors"
                >
                  {amount === 'Max' ? 'Max' : `$${amount}`}
                </button>
              ))}
            </div>

            {transactionStatus && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                transactionStatus.includes('successful') 
                  ? 'bg-green-100 text-green-700' 
                  : transactionStatus.includes('Error')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {transactionStatus}
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !withdrawAmount}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isWithdrawing ? 'Processing...' : 'Withdraw from Vault'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
