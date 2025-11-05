# 🔍 Circle Account Verification Checklist

Your API key format is correct, but Circle is rejecting it. This usually means an account setup issue.

## Critical Checklist

### ✅ Account Type & Product Access

1. **Go to Circle Console**: https://console.circle.com

2. **Check Product Access**:
   - Do you see **"Programmable Wallets"** in the sidebar?
   - Or only **"Developer Tools"** / **"API Keys"**?
   - Circle has different products: CCTP, Programmable Wallets, etc.
   - **Wallet creation requires Programmable Wallets access**

3. **Verify Account Tier**:
   - Some features require verified/business accounts
   - Check if you see "Upgrade Account" or "Verify Account" prompts
   - Sandbox access might be limited to certain account types

### ✅ Programmable Wallets Setup

If you have Programmable Wallets access:

1. **Entity Setup**:
   - Go to **Settings** → **Entities** (or **Organization**)
   - Check if an Entity is created and verified
   - Entity Secret might be required (different from API key)

2. **Wallet Set Setup**:
   - Programmable Wallets use "Wallet Sets"
   - Check if a Wallet Set is configured
   - You might need to create one first

3. **API Configuration**:
   - Go to **Programmable Wallets** → **Configuration**
   - Check if API access is enabled
   - Verify authentication method (API Key vs Entity Secret)

### ✅ API Key Scope

1. **Check API Key Type**:
   - Is it a **Test API Key** for Sandbox?
   - Does it have **Programmable Wallets** scope?
   - Some keys only work for CCTP or other products

2. **Verify Permissions**:
   - API Key → Click on your key
   - Check permissions/scopes
   - Look for: "Wallets: Create", "Wallets: Read", etc.

3. **Try Creating New Key**:
   - Sometimes keys get corrupted during creation
   - Delete old key (if safe)
   - Create brand new Test API Key
   - Make sure to select all wallet permissions

## Common Setup Issues

### Issue 1: Wrong Product/Feature

**Problem**: You have Circle account but not Programmable Wallets access.

**Solution**:
- Programmable Wallets might require signup/waitlist
- Check Circle Console for product access
- Contact Circle support to enable Programmable Wallets

### Issue 2: Entity Not Set Up

**Problem**: Programmable Wallets require an Entity to be configured.

**Solution**:
1. Go to Circle Console → **Settings** → **Entities**
2. Create an Entity if none exists
3. You'll get an Entity ID and Entity Secret
4. Add to `.env`:
   ```bash
   CIRCLE_ENTITY_SECRET=your_entity_secret_here
   ```

### Issue 3: Sandbox Not Fully Activated

**Problem**: Sandbox account pending verification.

**Solution**:
- Check email for verification link
- Complete any required KYC
- Sandbox sometimes requires business verification

### Issue 4: API Key vs Entity Secret Confusion

**Problem**: Circle has multiple authentication methods.

**Solution**:
- **API Key**: For general API access
- **Entity Secret**: For Programmable Wallets (might be required)
- Check Circle docs for which authentication method createWallet needs

## What to Check Right Now

### Step 1: Verify Programmable Wallets Access

```
1. Login to https://console.circle.com
2. Look at left sidebar
3. Do you see "Programmable Wallets"?
   - YES → Continue to Step 2
   - NO → You need to request access or use a different Circle product
```

### Step 2: Check Entity Setup

```
1. Go to Settings → Entities (or Organization)
2. Is there an Entity configured?
   - YES → Copy Entity Secret to .env as CIRCLE_ENTITY_SECRET
   - NO → Create an Entity
```

### Step 3: Verify API Key Product Scope

```
1. Go to API Keys
2. Click on your TEST_API_KEY
3. Check "Product" or "Scope"
4. Does it include "Programmable Wallets"?
   - YES → Continue
   - NO → Create new key with correct scope
```

### Step 4: Check Account Status

```
1. Go to Dashboard or Account Settings
2. Look for verification status
3. Are there any pending actions?
4. Is the account "Active" or "Pending Verification"?
```

## Alternative: Use Circle REST API Directly

If SDK continues to fail, we can use the REST API directly:

```typescript
// Test with axios/fetch
const axios = require('axios');

const apiKey = 'TEST_API_KEY:499c3c7b...:931ec97f...';
const baseUrl = 'https://api-sandbox.circle.com';

axios.get(`${baseUrl}/v1/w3s/wallets`, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('✅ API works!', response.data);
})
.catch(error => {
  console.log('❌ API failed:', error.response?.data);
});
```

## Most Likely Cause

Based on the 401 error with a valid-looking API key:

**You likely need to**:
1. ✅ Set up an Entity in Circle Console
2. ✅ Get Entity Secret and add to `.env`
3. ✅ Or verify Programmable Wallets is enabled for your account

**The 401 suggests**:
- API Key alone isn't enough
- Need Entity Secret for wallet operations
- Or account doesn't have Programmable Wallets enabled

## Next Steps

1. **Check Circle Console** for "Programmable Wallets" in sidebar
2. **Go to Settings → Entities** and verify Entity is set up
3. **Copy Entity Secret** to `.env` if available
4. **Contact Circle Support** if you don't have Programmable Wallets access

---

**Note**: Circle's documentation and setup process can be unclear. If you're stuck, their support team is usually helpful at clarifying account setup requirements.

