'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react'
import { useVault } from '@/hooks/useVault'
import { useWallet } from '@/hooks/useWallet'

interface VoiceAgentProps {
  className?: string
}

export default function VoiceAgent({ className = '' }: VoiceAgentProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const { deposit, withdraw, userBalance, userYield, apy } = useVault()
  const { account, isConnected } = useWallet()
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Start voice recording
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsListening(true)
      setTranscript('Listening...')
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setAiResponse('Sorry, I need microphone access to hear you.')
    }
  }

  // Stop recording
  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsListening(false)
    }
  }

  // Process audio with Speech-to-Text
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    
    try {
      // Convert audio to text using Cloudflare Workers AI
      const formData = new FormData()
      formData.append('audio', audioBlob)

      const sttResponse = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!sttResponse.ok) throw new Error('Speech-to-text failed')

      const { text, confidence } = await sttResponse.json()
      setTranscript(text)

      // Parse intent and execute
      await parseAndExecute(text)
      
    } catch (error) {
      console.error('Error processing audio:', error)
      setAiResponse('Sorry, I couldn\'t understand that. Please try again.')
      await speak('Sorry, I couldn\'t understand that. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Parse user intent and execute blockchain actions
  const parseAndExecute = async (text: string) => {
    const lowerText = text.toLowerCase()

    try {
      // Check wallet connection
      if (!isConnected) {
        const response = 'Please connect your wallet first to use AilaBank.'
        setAiResponse(response)
        await speak(response)
        return
      }

      // DEPOSIT INTENT
      if (lowerText.includes('deposit')) {
        const amountMatch = text.match(/(\d+\.?\d*)/);
const amount = amountMatch ? amountMatch[1] : null

        if (!amount) {
          const response = 'How much would you like to deposit?'
          setAiResponse(response)
          await speak(response)
          return
        }

        const response = `Depositing ${amount} USDC to your vault... This will earn you yield at ${apy}% APY.`
        setAiResponse(response)
        await speak(response)

        await deposit(amount)

        const successResponse = `Successfully deposited ${amount} USDC! Your money is now earning yield.`
        setAiResponse(successResponse)
        await speak(successResponse)
        return
      }

      // WITHDRAW INTENT
      if (lowerText.includes('withdraw')) {
        const amountMatch = text.match(/(\d+\.?\d*)/)
        const amount = amountMatch ? amountMatch[1] : null

        if (!amount) {
          const response = 'How much would you like to withdraw?'
          setAiResponse(response)
          await speak(response)
          return
        }

        const response = `Withdrawing ${amount} USDC from your vault...`
        setAiResponse(response)
        await speak(response)

        await withdraw(amount)

        const successResponse = `Successfully withdrew ${amount} USDC! Check your wallet.`
        setAiResponse(successResponse)
        await speak(successResponse)
        return
      }

      // BALANCE QUERY
      if (lowerText.includes('balance') || lowerText.includes('how much')) {
        const response = `You have ${userBalance} USDC in principal, plus ${userYield} USDC in earned yield. Your total balance is ${parseFloat(userBalance) + parseFloat(userYield)} USDC, earning ${apy}% annual percentage yield.`
        setAiResponse(response)
        await speak(response)
        return
      }

      // YIELD QUERY
      if (lowerText.includes('yield') || lowerText.includes('earning') || lowerText.includes('interest')) {
        const response = `Your money is currently earning ${apy}% APY. You've earned ${userYield} USDC in yield so far. Keep your money in the vault to continue earning!`
        setAiResponse(response)
        await speak(response)
        return
      }

      // DEFAULT - DIDN'T UNDERSTAND
      const response = 'I can help you deposit, withdraw, check your balance, or view your yield. What would you like to do?'
      setAiResponse(response)
      await speak(response)

    } catch (error: any) {
      console.error('Error executing command:', error)
      const errorResponse = `Sorry, there was an error: ${error.message}. Please try again.`
      setAiResponse(errorResponse)
      await speak(errorResponse)
    }
  }

  // Text-to-Speech with ElevenLabs
  const speak = async (text: string) => {
    if (!text) return

    setIsSpeaking(true)

    try {
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) throw new Error('Text-to-speech failed')

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Play audio
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()

    } catch (error) {
      console.error('Error with text-to-speech:', error)
      setIsSpeaking(false)
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
            Aila Voice Agent
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Talk to manage your money
          </p>
        </div>
        {isSpeaking && (
          <Volume2 className="w-6 h-6 text-purple-600 animate-pulse" />
        )}
      </div>

      {/* Microphone Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing || !isConnected}
          className={`
            relative w-24 h-24 rounded-full flex items-center justify-center
            transition-all duration-300 transform hover:scale-105
            ${isListening 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/50 animate-pulse' 
              : 'bg-gradient-to-r from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/50'
            }
            ${(!isConnected || isProcessing) && 'opacity-50 cursor-not-allowed'}
          `}
        >
          {isProcessing ? (
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          ) : isListening ? (
            <MicOff className="w-10 h-10 text-white" />
          ) : (
            <Mic className="w-10 h-10 text-white" />
          )}
        </button>
      </div>

      {/* Status */}
      <div className="text-center mb-4">
        {!isConnected && (
          <p className="text-sm text-amber-600 font-medium">
            Connect your wallet to start
          </p>
        )}
        {isListening && (
          <p className="text-sm text-cyan-600 font-medium animate-pulse">
            🎤 Listening...
          </p>
        )}
        {isProcessing && (
          <p className="text-sm text-purple-600 font-medium">
            🤔 Processing your request...
          </p>
        )}
        {isSpeaking && (
          <p className="text-sm text-purple-600 font-medium">
            🔊 Aila is speaking...
          </p>
        )}
      </div>

      {/* Transcript */}
      {transcript && transcript !== 'Listening...' && (
        <div className="bg-cyan-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-cyan-900 mb-1">You said:</p>
          <p className="text-gray-700">{transcript}</p>
        </div>
      )}

      {/* AI Response */}
      {aiResponse && (
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-900 mb-1">Aila:</p>
          <p className="text-gray-700">{aiResponse}</p>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gradient-to-r from-cyan-50 to-purple-50 rounded-lg">
        <p className="text-xs font-semibold text-gray-700 mb-2">Try saying:</p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• "Deposit 100 USDC"</li>
          <li>• "What's my balance?"</li>
          <li>• "Withdraw 50 dollars"</li>
          <li>• "How much yield have I earned?"</li>
        </ul>
      </div>
    </div>
  )
}
