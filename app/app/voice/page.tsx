'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Volume2, Loader } from 'lucide-react'
import { useWeb3 } from '@/lib/web3-context'
import { formatCurrency } from '@/lib/utils'

type Message = {
  id: string
  type: 'user' | 'assistant'
  text: string
  timestamp: Date
}

export default function VoicePage() {
  const { balance, vaultBalance } = useWeb3()
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      text: 'Hi! I\'m your AilaBank AI assistant. You can ask me to check your balance, make a deposit, withdraw funds, or anything else banking related. Try saying "What\'s my balance?"',
      timestamp: new Date(),
    },
  ])

  const handleStartListening = () => {
    setIsListening(true)
    setTranscript('')
    
    // Simulate voice recognition
    setTimeout(() => {
      const mockCommands = [
        'What is my balance?',
        'Deposit 100 dollars',
        'Withdraw 50 dollars',
        'Show my recent transactions',
        'How much yield have I earned?',
      ]
      const randomCommand = mockCommands[Math.floor(Math.random() * mockCommands.length)]
      setTranscript(randomCommand)
      
      // Add user message
      const userMsg: Message = {
        id: Date.now().toString(),
        type: 'user',
        text: randomCommand,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMsg])
      
      setIsListening(false)
      
      // Generate AI response
      setTimeout(() => {
        handleAIResponse(randomCommand)
      }, 1000)
    }, 3000)
  }

  const handleStopListening = () => {
    setIsListening(false)
  }

  const handleAIResponse = (userText: string) => {
    setIsSpeaking(true)
    
    let response = ''
    const lowerText = userText.toLowerCase()
    
    if (lowerText.includes('balance')) {
      const total = parseFloat(balance || '0') + parseFloat(vaultBalance || '0')
      response = `Your total balance is ${formatCurrency(total)}. You have ${formatCurrency(parseFloat(balance || '0'))} in your wallet and ${formatCurrency(parseFloat(vaultBalance || '0'))} in your vault earning yield.`
    } else if (lowerText.includes('deposit')) {
      response = 'Sure, I can help you deposit funds. How much would you like to deposit? Just say the amount, like "deposit 100 dollars".'
    } else if (lowerText.includes('withdraw')) {
      response = 'I can help you withdraw funds instantly. How much would you like to withdraw? Your vault has instant liquidity.'
    } else if (lowerText.includes('yield') || lowerText.includes('earned')) {
      const yieldEarned = parseFloat(vaultBalance || '0') * 0.05
      response = `You've earned ${formatCurrency(yieldEarned)} in yield this month. Your current APY is 5.2%, which is automatically reinvested.`
    } else if (lowerText.includes('transaction')) {
      response = 'Let me pull up your recent transactions. You had a deposit of $100 two hours ago, earned $2.50 in yield yesterday, and made a withdrawal of $50 three days ago.'
    } else {
      response = 'I can help you with deposits, withdrawals, balance checks, and transaction history. What would you like to do?'
    }
    
    const assistantMsg: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      text: response,
      timestamp: new Date(),
    }
    
    setTimeout(() => {
      setMessages(prev => [...prev, assistantMsg])
      setIsSpeaking(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Voice Banking</h1>
          <p className="text-gray-600 text-lg font-medium">Talk to your AI assistant for instant banking</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Voice Interface */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-12 mb-8 shadow-xl text-white">
            <div className="text-center">
              {/* Animated Avatar */}
              <div className="mb-10 flex justify-center">
                <div className={`relative w-40 h-40 ${isSpeaking ? 'animate-pulse' : ''}`}>
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="relative w-40 h-40 bg-white/30 backdrop-blur-lg rounded-full flex items-center justify-center border-4 border-white/50 shadow-2xl">
                    {isSpeaking ? (
                      <Volume2 className="w-20 h-20 text-white drop-shadow-lg" strokeWidth={2} />
                    ) : isListening ? (
                      <div className="flex gap-2">
                        <div className="w-3 h-10 bg-white rounded-full animate-pulse shadow-lg" style={{ animationDelay: '0ms' }} />
                        <div className="w-3 h-16 bg-white rounded-full animate-pulse shadow-lg" style={{ animationDelay: '150ms' }} />
                        <div className="w-3 h-10 bg-white rounded-full animate-pulse shadow-lg" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <Mic className="w-20 h-20 text-white drop-shadow-lg" strokeWidth={2} />
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="mb-8">
                {isListening && (
                  <div>
                    <p className="text-3xl font-bold mb-3 text-white drop-shadow-lg">Listening...</p>
                    <p className="text-white/95 font-semibold text-lg">{transcript || 'Speak now'}</p>
                  </div>
                )}
                {isSpeaking && (
                  <div>
                    <p className="text-3xl font-bold mb-3 text-white drop-shadow-lg">AI Assistant Speaking</p>
                    <p className="text-white/95 font-semibold text-lg">Processing your request...</p>
                  </div>
                )}
                {!isListening && !isSpeaking && (
                  <div>
                    <p className="text-3xl font-bold mb-3 text-white drop-shadow-lg">Ready to Help</p>
                    <p className="text-white/95 font-semibold text-lg">Tap the button to start talking</p>
                  </div>
                )}
              </div>

              {/* Microphone Button */}
              <button
                onClick={isListening ? handleStopListening : handleStartListening}
                disabled={isSpeaking}
                className={`w-28 h-28 rounded-full transition-all ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-2xl shadow-red-500/50'
                    : isSpeaking
                    ? 'bg-gray-400 cursor-not-allowed shadow-xl'
                    : 'bg-white text-indigo-600 hover:bg-blue-50 hover:scale-110 shadow-2xl hover:shadow-white/50'
                } flex items-center justify-center mx-auto`}
              >
                {isSpeaking ? (
                  <Loader className="w-12 h-12 animate-spin" strokeWidth={2.5} />
                ) : isListening ? (
                  <MicOff className="w-12 h-12 text-white" strokeWidth={2.5} />
                ) : (
                  <Mic className="w-12 h-12" strokeWidth={2.5} />
                )}
              </button>

              {/* Quick Commands */}
              <div className="mt-10 flex flex-wrap gap-3 justify-center">
                {['Check balance', 'Deposit', 'Withdraw', 'Show yield'].map((cmd) => (
                  <button
                    key={cmd}
                    className="px-5 py-3 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-bold text-white hover:bg-white/30 transition-all shadow-md border border-white/30"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conversation History */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conversation History</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-6 py-4 shadow-sm ${
                      msg.type === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                    <p
                      className={`text-xs mt-2 font-medium ${
                        msg.type === 'user' ? 'text-indigo-200' : 'text-gray-500'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features Info */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <h3 className="font-bold mb-3 text-gray-900 text-lg">🎤 Natural Language</h3>
              <p className="text-sm text-gray-600 font-medium leading-relaxed">Talk naturally, the AI understands context and intent</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <h3 className="font-bold mb-3 text-gray-900 text-lg">⚡ Instant Actions</h3>
              <p className="text-sm text-gray-600 font-medium leading-relaxed">Execute transactions with voice commands instantly</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <h3 className="font-bold mb-3 text-gray-900 text-lg">🔒 Secure</h3>
              <p className="text-sm text-gray-600 font-medium leading-relaxed">Voice biometrics for additional security layer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
