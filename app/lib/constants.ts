export const ARC_TESTNET = {
  chainId: 5042002,
  name: 'Arc Testnet',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.testnet.arc.network',
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://testnet.arcscan.app',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
  },
}

export const CONTRACTS = {
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS as string,
  AILA_VAULT: process.env.NEXT_PUBLIC_AILA_VAULT_ADDRESS as string,
  LIQUIDITY_BUFFER: process.env.NEXT_PUBLIC_LIQUIDITY_BUFFER_ADDRESS as string,
  YIELD_ALLOCATOR: process.env.NEXT_PUBLIC_YIELD_ALLOCATOR_ADDRESS as string,
}

export const INCOME_SOURCES = [
  {
    id: 'payroll',
    name: 'Employer Payroll',
    description: 'Connect your salary account',
    icon: '💼',
    category: 'employment',
  },
  {
    id: 'uber',
    name: 'Uber/Lyft',
    description: 'Rideshare earnings',
    icon: '🚗',
    category: 'gig',
  },
  {
    id: 'upwork',
    name: 'Upwork',
    description: 'Freelance projects',
    icon: '💻',
    category: 'freelance',
  },
  {
    id: 'fiverr',
    name: 'Fiverr',
    description: 'Freelance gigs',
    icon: '🎨',
    category: 'freelance',
  },
  {
    id: 'rental',
    name: 'Rental Income',
    description: 'Property rentals',
    icon: '🏠',
    category: 'passive',
  },
  {
    id: 'other',
    name: 'Other Sources',
    description: 'Custom income stream',
    icon: '📊',
    category: 'other',
  },
]
