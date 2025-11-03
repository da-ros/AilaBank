'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Web3ContextType {
  account: string | null
  balance: string | null
  vaultBalance: string | null
  isConnecting: boolean
  error: string | null
  disconnect: () => void
  deposit: (amount: string) => Promise<void>
  withdraw: (amount: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [vaultBalance, setVaultBalance] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user is already logged in on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('aila_user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setAccount(userData.account)
        setBalance(userData.balance || '1000.00')
        setVaultBalance(userData.vaultBalance || '0.00')
      } catch (err) {
        console.error('Error loading saved user:', err)
        localStorage.removeItem('aila_user')
      }
    }
  }, [])

  const disconnect = () => {
    setAccount(null)
    setBalance(null)
    setVaultBalance(null)
    setError(null)
    localStorage.removeItem('aila_user')
  }

  const signUp = async (email: string, password: string) => {
    setIsConnecting(true)
    setError(null)

    try {
      // Generate a unique wallet address for this user (backend would do this securely)
      const userAccount = '0x' + Math.random().toString(16).substring(2, 42).padEnd(40, '0')
      
      // Set initial balances - $1000 welcome bonus
      const initialBalance = '1000.00'
      const initialVaultBalance = '0.00'
      
      setAccount(userAccount)
      setBalance(initialBalance)
      setVaultBalance(initialVaultBalance)
      
      // Save to localStorage (in production, this would be in a database)
      const userData = {
        email,
        account: userAccount,
        balance: initialBalance,
        vaultBalance: initialVaultBalance,
        createdAt: new Date().toISOString()
      }
      localStorage.setItem('aila_user', JSON.stringify(userData))
      
      console.log('Sign up successful! Welcome bonus: $1000')
    } catch (err: any) {
      console.error('Sign up error:', err)
      setError(err.message)
      throw err
    } finally {
      setIsConnecting(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setIsConnecting(true)
    setError(null)

    try {
      // In production, this would verify credentials with backend
      const savedUser = localStorage.getItem('aila_user')
      if (savedUser) {
        const userData = JSON.parse(savedUser)
        
        // Simple email check (in production, backend would verify password)
        if (userData.email !== email) {
          throw new Error('Invalid credentials')
        }
        
        setAccount(userData.account)
        setBalance(userData.balance || '1000.00')
        setVaultBalance(userData.vaultBalance || '0.00')
        
        console.log('Sign in successful!')
      } else {
        throw new Error('User not found. Please sign up first.')
      }
    } catch (err: any) {
      console.error('Sign in error:', err)
      setError(err.message)
      throw err
    } finally {
      setIsConnecting(false)
    }
  }

  const deposit = async (amount: string) => {
    if (!account) return
    
    try {
      // Update local state
      const currentBalance = parseFloat(balance || '0')
      const depositAmt = parseFloat(amount)
      
      if (depositAmt > currentBalance) {
        throw new Error('Insufficient balance')
      }
      
      const newBalance = currentBalance - depositAmt
      const newVaultBalance = parseFloat(vaultBalance || '0') + depositAmt
      
      setBalance(newBalance.toFixed(2))
      setVaultBalance(newVaultBalance.toFixed(2))
      
      // Save to localStorage
      const savedUser = localStorage.getItem('aila_user')
      if (savedUser) {
        const userData = JSON.parse(savedUser)
        userData.balance = newBalance.toFixed(2)
        userData.vaultBalance = newVaultBalance.toFixed(2)
        localStorage.setItem('aila_user', JSON.stringify(userData))
      }
      
      // In production: Send transaction to backend which handles blockchain
      console.log('Deposit processed:', depositAmt, 'USDC')
    } catch (err: any) {
      console.error('Deposit error:', err)
      setError(err.message)
      throw err
    }
  }

  const withdraw = async (amount: string) => {
    if (!account) return
    
    try {
      // Update local state
      const currentVault = parseFloat(vaultBalance || '0')
      const withdrawAmt = parseFloat(amount)
      
      if (withdrawAmt > currentVault) {
        throw new Error('Insufficient vault balance')
      }
      
      const newVaultBalance = currentVault - withdrawAmt
      const newBalance = parseFloat(balance || '0') + withdrawAmt
      
      setVaultBalance(newVaultBalance.toFixed(2))
      setBalance(newBalance.toFixed(2))
      
      // Save to localStorage
      const savedUser = localStorage.getItem('aila_user')
      if (savedUser) {
        const userData = JSON.parse(savedUser)
        userData.balance = newBalance.toFixed(2)
        userData.vaultBalance = newVaultBalance.toFixed(2)
        localStorage.setItem('aila_user', JSON.stringify(userData))
      }
      
      // In production: Send transaction to backend which handles blockchain
      console.log('Withdrawal processed:', withdrawAmt, 'USDC')
    } catch (err: any) {
      console.error('Withdraw error:', err)
      setError(err.message)
      throw err
    }
  }

  return (
    <Web3Context.Provider
      value={{
        account,
        balance,
        vaultBalance,
        isConnecting,
        error,
        disconnect,
        deposit,
        withdraw,
        signUp,
        signIn,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  const context = useContext(Web3Context)
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider')
  }
  return context
}
