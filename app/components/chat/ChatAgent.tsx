'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User } from 'lucide-react'
import { useVault } from '@/hooks/useVault'
import { useWallet } from '@/hooks/useWallet'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m Aila, your AI banking assistant. I can help you deposit, withdraw, check balances, and manage your yield. What would you like to do?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { deposit, withdraw, userBalance, userYield, totalBalance, apy } = useVault()
  const { account, isConnected } = useWallet()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle message send
  const handleSend = async () => {
    if (!input.trim() || isProcessing) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsProcessing(true)

    try {
      const response = await processCommand(input)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, there was an error: ${error.message}`,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  // Process user command
  const processCommand = async (text: string): Promise<string> => {
    const lowerText = text.toLowerCase()

    // Check wallet connection
    if (!isConnected) {
      return 'Please connect your wallet first to use AilaBank features. Click the "Connect Wallet" button at the top right.'
    }

    // DEPOSIT
    if (lowerText.includes('deposit')) {
      const amountMatch = text.match(/(\d+\.?\d*)/)
      const amount = amountMatch ? amountMatch[1] : null

      if (!amount) {
        return 'Sure! How much would you like to deposit? For example, you can say "deposit 100 USDC".'
      }

      try {
        await deposit(amount)
        return `✅ Successfully deposited ${amount} USDC! Your money is now in the vault earning ${apy}% APY. Your new balance is ${totalBalance} USDC.`
      } catch (error: any) {
        return `❌ Deposit failed: ${error.message}. Please make sure you have enough USDC and have approved the transaction.`
      }
    }

    // WITHDRAW
    if (lowerText.includes('withdraw')) {
      const amountMatch = text.match(/(\d+\.?\d*)/)
      const amount = amountMatch ? amountMatch[1] : null

      if (!amount) {
        return `You currently have ${totalBalance} USDC available. How much would you like to withdraw?`
      }

      try {
        await withdraw(amount)
        return `✅ Successfully withdrew ${amount} USDC! The funds have been sent to your wallet. Your remaining balance is ${totalBalance} USDC.`
      } catch (error: any) {
        return `❌ Withdrawal failed: ${error.message}`
      }
    }

    // BALANCE
    if (lowerText.includes('balance') || lowerText.includes('how much')) {
      return `💰 Your Account Summary:
      
• **Principal**: ${userBalance} USDC (your deposits)
• **Yield Earned**: ${userYield} USDC (interest earned)
• **Total Balance**: ${totalBalance} USDC
• **Current APY**: ${apy}%

Your money is working for you! 🎯`
    }

    // YIELD
    if (lowerText.includes('yield') || lowerText.includes('earning') || lowerText.includes('interest') || lowerText.includes('apy')) {
      return `📈 Yield Information:

• You've earned **${userYield} USDC** in yield so far
• Your money is earning **${apy}% APY**
• This is calculated daily and added to your balance
• The more you keep in the vault, the more you earn!

Keep your funds in the vault to maximize your returns. 🚀`
    }

    // TRANSFER/SEND
    if (lowerText.includes('send') || lowerText.includes('transfer')) {
      return '💸 To send money, you can:\n\n1. Withdraw to your wallet first\n2. Then use your wallet to send to any address\n\nWould you like to withdraw some funds?'
    }

    // HELP
    if (lowerText.includes('help') || lowerText.includes('what can you do')) {
      return `I can help you with:

🏦 **Account Management**
• Check your balance
• View your yield earnings
• See your APY

💰 **Transactions**
• Deposit USDC to earn yield
• Withdraw funds anytime
• Track transaction history

📊 **Information**
• Explain how yield works
• Show allocation details
• Provide financial insights

Just ask me anything! For example:
• "Deposit 100 USDC"
• "What's my balance?"
• "Withdraw 50 dollars"
• "How much have I earned?"`
    }

    // GREETINGS
    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
      return `Hello! 👋 Nice to see you. I'm Aila, your AI banking assistant. 

Your current balance is ${totalBalance} USDC earning ${apy}% APY.

How can I help you today?`
    }

    // DEFAULT
    return `I'm not sure I understood that. I can help you with:

• Depositing USDC
• Withdrawing funds
• Checking your balance
• Viewing your yield

Try asking something like "deposit 100 USDC" or "what's my balance?"`
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-purple-50 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Aila Chat Assistant</h2>
            <p className="text-xs text-gray-600">
              {isConnected ? '🟢 Online • Connected' : '🔴 Connect wallet to start'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div
              className={`
                max-w-[70%] rounded-2xl px-4 py-3 whitespace-pre-line
                ${message.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-900'
                }
              `}
            >
              <p className="text-sm">{message.content}</p>
              <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-cyan-100' : 'text-gray-500'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isConnected ? "Type your message..." : "Connect wallet first..."}
            disabled={!isConnected || isProcessing}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || !input.trim() || isProcessing}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {['Check balance', 'Show yield', 'Help'].map((action) => (
            <button
              key={action}
              onClick={() => setInput(action)}
              disabled={!isConnected}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
