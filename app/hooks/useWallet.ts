'use client'

import { useState, useEffect, useCallback } from 'react'
import { ethers, BrowserProvider } from 'ethers'
import { CHAIN_ID, RPC_URL, ARC_TESTNET_CONFIG } from '@/lib/contracts'

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)

  // Initialize provider
  const initializeProvider = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask not installed')
      return null
    }

    const browserProvider = new BrowserProvider(window.ethereum)
    setProvider(browserProvider)
    return browserProvider
  }, [])

  // Connect wallet
  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)

    try {
      const browserProvider = await initializeProvider()
      if (!browserProvider) {
        throw new Error('Failed to initialize provider')
      }

      // Request account access
      const accounts = await browserProvider.send('eth_requestAccounts', [])
      setAccount(accounts[0])

      // Get signer
      const signer = await browserProvider.getSigner()
      setSigner(signer)

      // Check network
      const network = await browserProvider.getNetwork()
      const currentChainId = Number(network.chainId)
      setChainId(currentChainId)

      // Switch to Arc testnet if needed
      if (currentChainId !== CHAIN_ID) {
        await switchNetwork()
      }

      console.log('Wallet connected:', accounts[0])
    } catch (err: any) {
      console.error('Connection error:', err)
      setError(err.message || 'Failed to connect wallet')
      setAccount(null)
    } finally {
      setIsConnecting(false)
    }
  }, [initializeProvider])

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setChainId(null)
    setError(null)
  }, [])

  // Switch to Arc network
  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_TESTNET_CONFIG.chainId }],
      })
    } catch (switchError: any) {
      // Network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [ARC_TESTNET_CONFIG],
          })
        } catch (addError) {
          console.error('Error adding network:', addError)
          throw addError
        }
      } else {
        throw switchError
      }
    }
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        setAccount(accounts[0])
      }
    }

    const handleChainChanged = (chainId: string) => {
      setChainId(parseInt(chainId, 16))
      window.location.reload() // Recommended by MetaMask
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [disconnect])

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return

      try {
        const browserProvider = new BrowserProvider(window.ethereum)
        const accounts = await browserProvider.listAccounts()
        
        if (accounts.length > 0) {
          setAccount(accounts[0].address)
          setProvider(browserProvider)
          const signer = await browserProvider.getSigner()
          setSigner(signer)
          
          const network = await browserProvider.getNetwork()
          setChainId(Number(network.chainId))
        }
      } catch (err) {
        console.error('Error checking connection:', err)
      }
    }

    checkConnection()
  }, [])

  return {
    account,
    provider,
    signer,
    chainId,
    isConnecting,
    error,
    isConnected: !!account,
    isCorrectNetwork: chainId === CHAIN_ID,
    connect,
    disconnect,
    switchNetwork,
  }
}

// Extend Window interface
declare global {
  interface Window {
    ethereum?: any
  }
}
