'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useWeb3 } from '@/lib/web3-context'
import { Wallet, Sparkles, Shield, Zap, Mail, Lock } from 'lucide-react'

export default function Home() {
  const { signUp, signIn, isConnecting, account } = useWeb3()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      alert('Please enter email and password')
      return
    }

    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
      router.push('/dashboard')
    } catch (error: any) {
      alert(error.message || 'Failed to sign in. Please try again.')
    }
  }

  useEffect(() => {
    if (account) {
      router.push('/dashboard')
    }
  }, [account, router])

  if (account) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fafafa] via-white to-[#f3f4f6]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-indigo-100 animate-pulse-glow">
              <Image 
                src="/logo.png" 
                alt="AilaBank Logo" 
                width={96} 
                height={96}
                className="object-cover"
              />
            </div>
            <Image 
              src="/logowordart.png" 
              alt="AilaBank" 
              width={200} 
              height={54}
              className="object-contain"
            />
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gradient-aila animate-in fade-in slide-in-from-bottom-6 duration-700">
            AI-Powered Banking Platform
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 font-medium animate-in fade-in slide-in-from-bottom-8 duration-700">
            Voice-First Banking • Auto-Yield • Always Liquid
          </p>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="card-aila hover:shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100 animate-in fade-in slide-in-from-left duration-700">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-500 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Auto-Yield</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Your deposits automatically earn yield through smart allocation strategies
              </p>
            </div>

            <div className="card-aila hover:shadow-xl bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100 animate-in fade-in slide-in-from-bottom duration-700 delay-100">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Always Liquid</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Withdraw instantly anytime. No lock-up periods or waiting
              </p>
            </div>

            <div className="card-aila hover:shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 animate-in fade-in slide-in-from-right duration-700 delay-200">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-500 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Voice Banking</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Talk to your AI assistant for deposits, withdrawals, and insights
              </p>
            </div>
          </div>

          {/* Sign Up / Sign In Form */}
          <div className="max-w-md mx-auto mb-8 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
            <div className="card-aila bg-white/90 backdrop-blur-sm border-2 border-gray-200 shadow-2xl">
              <h2 className="text-2xl font-bold text-center mb-6 text-gradient-aila">
                {isSignUp ? '✨ Create Your Account' : '👋 Welcome Back'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:shadow-lg transition-all bg-white text-gray-900 placeholder-gray-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:shadow-lg transition-all bg-white text-gray-900"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="btn-primary w-full py-4 rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed animate-gradient"
                >
                  {isConnecting ? '⏳ Processing...' : isSignUp ? '🚀 Sign Up & Get $1000 Bonus' : '🔑 Sign In'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-gradient-aila font-semibold hover:opacity-80 transition-opacity"
                >
                  {isSignUp ? 'Already have an account? Sign In →' : "Don't have an account? Sign Up →"}
                </button>
              </div>

              {isSignUp && (
                <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
                  <p className="text-sm text-emerald-800 text-center font-medium">
                    🎁 <strong>Welcome Bonus:</strong> Get $1000 USDC free to start banking!
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500 max-w-md mx-auto text-center leading-relaxed">
            We handle all the blockchain complexity. You just enjoy seamless banking with AI-powered features.
          </p>
        </div>
      </div>

      {/* Bottom Features */}
      <div className="container mx-auto px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="card-aila bg-gradient-aila text-white shadow-2xl border-0 animate-gradient">
            <h2 className="text-3xl font-bold mb-6 text-center">Powered by Arc Testnet</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="text-4xl font-bold mb-2">$0.01</div>
                <div className="text-white/90 font-medium">Gas Fees in USDC</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="text-4xl font-bold mb-2">⚡ Instant</div>
                <div className="text-white/90 font-medium">Withdrawals</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="text-4xl font-bold mb-2">24/7</div>
                <div className="text-white/90 font-medium">AI Assistant</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
