# AilaBank Frontend Deployment Guide

## ✅ Completed Updates

### 1. **Logo Integration**
- Created logo SVG files (`logo.svg` and `logo-wordart.svg`)
- Logo colors: Blue (#3B82F6) to Purple (#8B5CF6) gradient
- Integrated logo in Header and landing page

### 2. **Header Component** (`/components/ui/Header.tsx`)
- Sticky navigation with logo
- User account dropdown
- Notifications and settings icons
- Disconnect wallet functionality
- Uses AilaBank brand colors

### 3. **Sidebar Component** (`/components/ui/Sidebar.tsx`)
- Fixed left sidebar for desktop (hidden on mobile)
- Navigation items with icons and colors:
  - Dashboard (Blue)
  - Income Hub (Green)
  - Voice Banking (Purple)
  - Virtual Cards (Pink)
  - AI Assistant (Orange)
  - Yield Analytics (Indigo)
- Pro tip card at bottom
- Active state highlighting

### 4. **Mobile Sidebar** (`/components/ui/MobileSidebar.tsx`)
- Floating action button (bottom-right)
- Slide-out sidebar on mobile
- Overlay background
- Smooth transitions

### 5. **Layout Component** (`/components/ui/Layout.tsx`)
- Wraps all authenticated pages
- Automatically shows/hides based on wallet connection
- Combines Header + Sidebar + MobileSidebar

### 6. **Contract Integration**
All pages now connected to deployed contracts:
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **AilaVault**: `0x77348b340c5A7431D191f85603f738E21691Df3a`
- **LiquidityBuffer**: `0x912682Ed882FA6A35ADc8Fd467AB481886e7074b`
- **YieldAllocator**: `0x1a578559469419C59Ae0cFdE434C2AB2c2688eB3`

### 7. **Deposit/Withdraw Functionality**
- Working deposit modal with amount input
- Working withdraw modal with max button
- Transaction status feedback
- Approval flow for USDC
- Real-time balance updates

### 8. **Updated Pages**
All pages now use the new layout system:
- ✅ Dashboard (`/dashboard`)
- ✅ Chat (`/chat`)
- ✅ Voice (`/voice`)
- ✅ Cards (`/cards`)
- ✅ Income (`/income`)

## 🚀 How to Run

1. **Install Dependencies**
```bash
cd app
npm install
```

2. **Environment Setup**
The `.env.local` file is already configured with deployed contract addresses.

3. **Run Development Server**
```bash
npm run dev
```

4. **Open Browser**
Navigate to `http://localhost:3000`

## 🎨 Design System

### Colors
- **Primary Blue**: `#3B82F6` (blue-600)
- **Primary Purple**: `#8B5CF6` (purple-600)
- **Success Green**: `#10B981` (green-600)
- **Warning Orange**: `#F59E0B` (orange-600)
- **Danger Red**: `#EF4444` (red-600)

### Gradients
- **Primary**: `from-blue-600 to-purple-600`
- **Success**: `from-green-500 to-teal-600`
- **Warning**: `from-orange-500 to-red-600`

### Typography
- **Font Family**: Geist Sans (primary), Geist Mono (code)
- **Headings**: Bold, gradient text-fill for emphasis
- **Body**: Regular weight, gray-700

## 📱 Responsive Design

### Desktop (lg: 1024px+)
- Fixed sidebar (64px / 16rem wide)
- Full header with all features
- Main content with left margin

### Mobile (< 1024px)
- Hidden sidebar
- Floating menu button (bottom-right)
- Slide-out sidebar with overlay
- Stacked layouts

## 🔗 Navigation Structure

```
Landing Page (/)
└── Dashboard (/dashboard)
    ├── Income Hub (/income)
    ├── Voice Banking (/voice)
    ├── Virtual Cards (/cards)
    ├── AI Assistant (/chat)
    ├── Yield Analytics (/analytics)
    ├── Settings (/settings)
    └── Support (/support)
```

## 🔐 Wallet Integration

### Supported Networks
- **Arc Testnet** (Chain ID: 5042002)
- Automatic network switching
- Add network if not exists

### Features
- MetaMask connection
- Account switching detection
- Network switching detection
- Auto-refresh balances (10s interval)

## 💡 Key Features

### Dashboard
- Total balance overview
- Vault balance with yield
- Quick actions (Deposit, Withdraw, Send)
- Feature cards navigation
- Wallet balance sidebar
- Recent activity feed
- Yield performance stats

### Deposit Flow
1. Click "Deposit" button
2. Enter amount (or use quick amounts)
3. Click "Deposit to Vault"
4. Approve USDC (MetaMask popup)
5. Confirm deposit (MetaMask popup)
6. Success message + balance refresh

### Withdraw Flow
1. Click "Withdraw" button
2. Enter amount (or use quick amounts/Max)
3. Click "Withdraw from Vault"
4. Confirm transaction (MetaMask popup)
5. Success message + balance refresh

## 🎯 Interactive Elements

### Buttons
- **Primary**: Blue-to-purple gradient
- **Secondary**: White with border
- **Danger**: Red background
- **Ghost**: Transparent with hover

### Cards
- Shadow on hover
- Rounded corners (xl, 2xl, 3xl)
- Gradient backgrounds for emphasis
- Icon badges

### Modals
- Backdrop blur
- Centered with overlay
- Smooth transitions
- Close on backdrop click

## 📊 Data Flow

```
Web3Provider (Context)
└── Connects to MetaMask
    └── Reads contract state
        ├── USDC balance
        ├── Vault balance
        └── Transaction history
    └── Writes contract state
        ├── approve() → USDC
        ├── deposit() → AilaVault
        └── withdraw() → AilaVault
```

## 🐛 Troubleshooting

### "Please install MetaMask"
- Install MetaMask browser extension
- Refresh page

### "Wrong Network"
- App will prompt to switch to Arc Testnet
- Click "Switch Network" in MetaMask

### "Transaction Failed"
- Check USDC balance
- Check gas balance (need native USDC for gas on Arc)
- Try again with lower amount

### "Insufficient Balance"
- For deposits: Need USDC in wallet
- For withdrawals: Need funds in vault

## 🎨 UI Components

### Custom Components
- `Header` - Top navigation bar
- `Sidebar` - Left navigation (desktop)
- `MobileSidebar` - Floating menu (mobile)
- `Layout` - Wrapper for authenticated pages

### Third-Party
- `lucide-react` - Icon library
- `next/image` - Optimized images
- `tailwindcss` - Styling

## 📝 Next Steps

1. **Analytics Page**: Create `/analytics` route
2. **Settings Page**: Create `/settings` route
3. **Support Page**: Create `/support` route
4. **Transfer Feature**: Implement peer-to-peer USDC transfer
5. **Transaction History**: Fetch and display real transaction history
6. **Notifications**: Real-time notification system
7. **Dark Mode**: Toggle between light/dark themes

## 🚨 Important Notes

- All contract addresses are from the deployed contracts on Arc Testnet
- The app is configured for Arc Testnet only
- Users need Arc Testnet USDC for gas fees
- Yield percentages are currently mocked (5.2% APY)
- Transaction history is currently mocked data

## 📞 Support

For issues or questions:
- Check browser console for errors
- Verify MetaMask connection
- Ensure correct network (Arc Testnet)
- Check contract addresses in `.env.local`
