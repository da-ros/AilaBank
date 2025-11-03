'use client'

import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWallet } from './useWallet'

// Import ABIs and config from centralized location
import { AilaVaultABI, CONTRACTS, USDC_DECIMALS } from '@/lib/contracts'

export interface VaultData {
  userBalance: string
  userYield: string
  totalBalance: string
  apy: string
  tvl: string
  loading: boolean
  error: string | null
}

export function useVault() {
  const { account, provider, signer } = useWallet()
  const [vaultData, setVaultData] = useState<VaultData>({
    userBalance: '0',
    userYield: '0',
    totalBalance: '0',
    apy: '0',
    tvl: '0',
    loading: false,
    error: null,
  })

  // Initialize vault contract
  const getVaultContract = useCallback(() => {
    if (!provider) return null
    return new ethers.Contract(CONTRACTS.AILA_VAULT, AilaVaultABI, provider)
  }, [provider])

  const getVaultWithSigner = useCallback(() => {
    if (!signer) return null
    return new ethers.Contract(CONTRACTS.AILA_VAULT, AilaVaultABI, signer)
  }, [signer])

  // Fetch user balance data
  const fetchBalances = useCallback(async () => {
    if (!account || !provider) return

    setVaultData(prev => ({ ...prev, loading: true, error: null }))

    try {
      const vault = getVaultContract()
      if (!vault) throw new Error('Vault contract not initialized')

      // Get balance details (principal, yield, total)
      const [principal, yieldAmount, total] = await vault.getBalanceDetails(account)
      
      // Get APY
      const apyBps = await vault.getUserAPY(account)
      
      // Get TVL
      const tvl = await vault.getTVL()

      setVaultData({
        userBalance: ethers.formatUnits(principal, USDC_DECIMALS),
        userYield: ethers.formatUnits(yieldAmount, USDC_DECIMALS),
        totalBalance: ethers.formatUnits(total, USDC_DECIMALS),
        apy: (Number(apyBps) / 100).toFixed(2), // Convert basis points to percentage
        tvl: ethers.formatUnits(tvl, USDC_DECIMALS),
        loading: false,
        error: null,
      })
    } catch (err: any) {
      console.error('Error fetching vault data:', err)
      setVaultData(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch vault data',
      }))
    }
  }, [account, provider, getVaultContract])

  // Deposit USDC to vault
  const deposit = useCallback(async (amount: string): Promise<ethers.ContractTransactionResponse> => {
    if (!signer || !account) throw new Error('Wallet not connected')

    const vault = getVaultWithSigner()
    if (!vault) throw new Error('Vault contract not initialized')

    // Convert amount to USDC units (6 decimals)
    const amountInUnits = ethers.parseUnits(amount, USDC_DECIMALS)

    // First approve USDC spending
    const usdcContract = new ethers.Contract(
      CONTRACTS.USDC,
      ['function approve(address spender, uint256 amount) returns (bool)'],
      signer
    )
    
    const approveTx = await usdcContract.approve(CONTRACTS.AILA_VAULT, amountInUnits)
    await approveTx.wait()

    // Then deposit
    const tx = await vault.deposit(amountInUnits)
    await tx.wait()

    // Refresh balances
    await fetchBalances()

    return tx
  }, [signer, account, getVaultWithSigner, fetchBalances])

  // Withdraw USDC from vault
  const withdraw = useCallback(async (amount: string): Promise<ethers.ContractTransactionResponse> => {
    if (!signer || !account) throw new Error('Wallet not connected')

    const vault = getVaultWithSigner()
    if (!vault) throw new Error('Vault contract not initialized')

    const amountInUnits = ethers.parseUnits(amount, USDC_DECIMALS)
    
    const tx = await vault.withdraw(amountInUnits)
    await tx.wait()

    // Refresh balances
    await fetchBalances()

    return tx
  }, [signer, account, getVaultWithSigner, fetchBalances])

  // Listen to vault events
  useEffect(() => {
    if (!account || !provider) return

    const vault = getVaultContract()
    if (!vault) return

    // Listen for Deposit events
    const depositFilter = vault.filters.Deposit(account)
    const withdrawFilter = vault.filters.Withdraw(account)
    const yieldFilter = vault.filters.YieldAccrued(account)

    const handleEvent = () => {
      console.log('Vault event detected, refreshing balances...')
      fetchBalances()
    }

    vault.on(depositFilter, handleEvent)
    vault.on(withdrawFilter, handleEvent)
    vault.on(yieldFilter, handleEvent)

    return () => {
      vault.off(depositFilter, handleEvent)
      vault.off(withdrawFilter, handleEvent)
      vault.off(yieldFilter, handleEvent)
    }
  }, [account, provider, getVaultContract, fetchBalances])

  // Auto-fetch balances on mount and account change
  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  return {
    ...vaultData,
    deposit,
    withdraw,
    refreshBalances: fetchBalances,
  }
}
