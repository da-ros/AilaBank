'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, TrendingUp, CreditCard, DollarSign, PieChart } from 'lucide-react'
import { useWeb3 } from '@/lib/web3-context'
import { formatCurrency } from '@/lib/utils'

type Message = {
  id: string
  type: 'user' | 'assistant'
  text: string
  timestamp: Date
  actions?: { label: string; action: string }[]
}

export default function ChatPage() {
  const { balance, vaultBalance } = useWeb3()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      text: '👋 Hi! I\'m your AilaBank AI assistant. I can help you with:\n\n• Checking balances and transactions\n• Making deposits and withdrawals\n• Financial insights and forecasts\n• Managing your cards and limits\n• Answering banking questions\n\nWhat can I help you with today?',
      timestamp: new Date(),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const generateResponse = (userText: string): Message => {
    const lowerText = userText.toLowerCase()
    let response = ''
    let actions: { label: string; action: string }[] = []

    if (lowerText.includes('balance') || lowerText.includes('how much')) {
      const total = parseFloat(balance || '0') + parseFloat(vaultBalance || '0')
      response = `💰 Your current balance:\n\n• **Total**: ${formatCurrency(total)}\n• **Wallet**: ${formatCurrency(parseFloat(balance || '0'))}\n• **Vault** (earning yield): ${formatCurrency(parseFloat(vaultBalance || '0'))}\n\nYour vault balance is earning 5.2% APY automatically!`
      actions = [
        { label: '➕ Deposit', action: 'deposit' },
        { label: '➖ Withdraw', action: 'withdraw' },
      ]
    } else if (lowerText.includes('deposit')) {
      response = `📥 I can help you deposit funds into your vault!\n\nDepositing to your vault automatically starts earning yield. Your funds remain liquid and can be withdrawn anytime.\n\nHow much would you like to deposit?`
      actions = [
        { label: '$100', action: 'deposit_100' },
        { label: '$500', action: 'deposit_500' },
        { label: '$1000', action: 'deposit_1000' },
      ]
    } else if (lowerText.includes('withdraw')) {
      response = `📤 I can help you withdraw funds!\n\nYour vault has instant liquidity. You can withdraw any amount up to your vault balance at any time.\n\nHow much would you like to withdraw?`
      actions = [
        { label: '$50', action: 'withdraw_50' },
        { label: '$100', action: 'withdraw_100' },
        { label: 'All', action: 'withdraw_all' },
      ]
    } else if (lowerText.includes('yield') || lowerText.includes('earn')) {
      const yieldEarned = parseFloat(vaultBalance || '0') * 0.05
      response = `📈 **Yield Performance**\n\n• **Current APY**: 5.2%\n• **Earned this month**: ${formatCurrency(yieldEarned)}\n• **Strategy**: Auto-optimized allocation\n\nYour deposits automatically earn yield through smart DeFi strategies. The yield is compounded and added to your balance daily!`
      actions = [
        { label: '📊 View Details', action: 'yield_details' },
      ]
    } else if (lowerText.includes('card') || lowerText.includes('visa')) {
      response = `💳 **Virtual Cards**\n\nYou have 2 active cards:\n• Primary Card (••••4242) - $1,250 available\n• Shopping Card (••••8888) - $500 available\n\nYou can create new virtual cards, set spending limits, and freeze/unfreeze cards instantly!`
      actions = [
        { label: '➕ New Card', action: 'new_card' },
        { label: '⚙️ Manage Cards', action: 'manage_cards' },
      ]
    } else if (lowerText.includes('income') || lowerText.includes('payroll') || lowerText.includes('salary')) {
      response = `💼 **Income Hub**\n\nConnect your income sources for automatic deposits:\n\n• Employer payroll\n• Gig platforms (Uber, Upwork, Fiverr)\n• Freelance payments\n• Rental income\n\nAuto-deposited funds start earning yield immediately!`
      actions = [
        { label: '🔗 Connect Source', action: 'connect_income' },
      ]
    } else if (lowerText.includes('transaction') || lowerText.includes('history')) {
      response = `📋 **Recent Transactions**\n\n1. ✅ Deposit: +$100.00 (2 hours ago)\n2. 📈 Yield Earned: +$2.50 (1 day ago)\n3. 🏪 Amazon.com: -$89.99 (2 days ago)\n4. ↩️ Withdrawal: -$50.00 (3 days ago)\n\nWould you like more details on any transaction?`
    } else if (lowerText.includes('forecast') || lowerText.includes('predict')) {
      response = `🔮 **Financial Forecast**\n\nBased on your current balance and activity:\n\n• **Next month's yield**: ~${formatCurrency(parseFloat(vaultBalance || '0') * 0.05)}\n• **3-month projection**: ~${formatCurrency(parseFloat(vaultBalance || '0') * 0.15)}\n• **Annual projection**: ~${formatCurrency(parseFloat(vaultBalance || '0') * 0.60)}\n\nThis assumes constant APY and no withdrawals.`
      actions = [
        { label: '📊 Detailed Analysis', action: 'analysis' },
      ]
    } else if (lowerText.includes('help') || lowerText.includes('what can you')) {
      response = `🤖 I'm your AI banking assistant! Here's what I can do:\n\n**💰 Balance & Transactions**\n• Check your balance\n• View transaction history\n• Track spending\n\n**📥📤 Deposits & Withdrawals**\n• Make deposits\n• Process withdrawals\n• Set up auto-deposits\n\n**📈 Yield & Insights**\n• Show yield earnings\n• Financial forecasts\n• Spending analysis\n\n**💳 Cards & Settings**\n• Manage virtual cards\n• Set spending limits\n• Freeze/unfreeze cards\n\nJust ask me anything!`
    } else {
      response = `I understand you want to know about "${userText}".\n\nI can help you with balance checks, deposits, withdrawals, yield information, card management, and transaction history.\n\nCould you rephrase your question or ask about one of these topics?`
      actions = [
        { label: '💰 Check Balance', action: 'balance' },
        { label: '📈 View Yield', action: 'yield' },
        { label: '💳 Manage Cards', action: 'cards' },
      ]
    }

    return {
      id: Date.now().toString(),
      type: 'assistant',
      text: response,
      timestamp: new Date(),
      actions: actions.length > 0 ? actions : undefined,
    }
  }

  const handleSend = () => {
    if (!inputText.trim()) return

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsTyping(true)

    // Simulate AI thinking
    setTimeout(() => {
      const assistantMsg = generateResponse(inputText)
      setMessages(prev => [...prev, assistantMsg])
      setIsTyping(false)
    }, 1000)
  }

  const handleQuickAction = (action: string) => {
    const actionMap: { [key: string]: string } = {
      'balance': 'What is my balance?',
      'deposit': 'I want to deposit',
      'withdraw': 'I want to withdraw',
      'yield': 'Show me my yield',
      'cards': 'Show my cards',
      'income': 'Tell me about income sources',
    }
    const text = actionMap[action] || action
    setInputText(text)
    setTimeout(() => handleSend(), 100)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-3 rounded-2xl shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-1">Chat with Aila</h1>
              <p className="text-gray-600 text-lg font-medium">Your personal AI banking assistant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 container mx-auto px-6 py-8 overflow-hidden flex flex-col">
        <div className="flex-1 bg-white rounded-2xl overflow-hidden flex flex-col shadow-sm border border-gray-200">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${msg.type === 'user' ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`rounded-2xl px-6 py-4 shadow-sm ${
                      msg.type === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</p>
                  </div>
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {msg.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickAction(action.action)}
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 transition-all shadow-sm"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className={`text-xs mt-2 px-1 font-medium ${msg.type === 'user' ? 'text-right text-indigo-200' : 'text-gray-500'}`}>
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="border-t border-gray-200 px-6 py-4 bg-white">
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => handleQuickAction('balance')}
                className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 transition-all flex items-center gap-2 text-gray-700"
              >
                <DollarSign className="w-4 h-4" />
                Balance
              </button>
              <button
                onClick={() => handleQuickAction('yield')}
                className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 transition-all flex items-center gap-2 text-gray-700"
              >
                <TrendingUp className="w-4 h-4" />
                Yield
              </button>
              <button
                onClick={() => handleQuickAction('cards')}
                className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 transition-all flex items-center gap-2 text-gray-700"
              >
                <CreditCard className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => handleQuickAction('income')}
                className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 transition-all flex items-center gap-2 text-gray-700"
              >
                <PieChart className="w-4 h-4" />
                Income
              </button>
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-6 bg-white">
            <div className="flex gap-4">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything about your finances..."
                className="flex-1 px-6 py-4 border border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all bg-white text-gray-900 placeholder-gray-400 font-medium text-base"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
