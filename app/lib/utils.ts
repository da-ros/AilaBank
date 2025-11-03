import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatUSDC(amount: bigint): number {
  // USDC has 6 decimals
  return Number(amount) / 1_000_000
}

export function parseUSDC(amount: string): bigint {
  // USDC has 6 decimals
  const num = parseFloat(amount)
  return BigInt(Math.floor(num * 1_000_000))
}
