// Contract addresses and configuration
export const CONTRACTS = {
  // Contract Addresses (from environment variables)
  AILA_VAULT: process.env.NEXT_PUBLIC_AILA_VAULT_ADDRESS || '',
  LIQUIDITY_BUFFER: process.env.NEXT_PUBLIC_LIQUIDITY_BUFFER_ADDRESS || '',
  YIELD_ALLOCATOR: process.env.NEXT_PUBLIC_YIELD_ALLOCATOR_ADDRESS || '',
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || '',
}

// Arc Testnet Configuration
export const CHAIN_ID = 5042002
export const RPC_URL = 'https://rpc-sepolia.arcscan.app'

export const ARC_TESTNET_CONFIG = {
  chainId: '0x4CFAA2', // 5042002 in hex
  chainName: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
  },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: ['https://testnet.arcscan.app'],
}

// Token decimals
export const USDC_DECIMALS = 6
