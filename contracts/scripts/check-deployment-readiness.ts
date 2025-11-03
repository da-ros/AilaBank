import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("\n🔍 Checking Deployment Readiness for Arc Testnet...\n");

  const issues: string[] = [];
  const warnings: string[] = [];

  // Check 1: Private Key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "your_private_key_here") {
    issues.push("❌ PRIVATE_KEY not set in .env");
  } else if (privateKey.length !== 66 || !privateKey.startsWith("0x")) {
    issues.push("❌ PRIVATE_KEY format invalid (should be 0x + 64 hex chars)");
  } else {
    console.log("✅ Private key configured");
    
    // Get wallet address
    const wallet = new ethers.Wallet(privateKey);
    console.log(`   Address: ${wallet.address}`);
  }

  // Check 2: RPC URL
  const rpcUrl = process.env.ARC_TESTNET_RPC_URL;
  if (!rpcUrl) {
    warnings.push("⚠️  ARC_TESTNET_RPC_URL not set - will use default");
  } else {
    console.log("✅ RPC URL configured");
    console.log(`   URL: ${rpcUrl}`);
  }

  // Check 3: USDC Address
  const usdcAddress = process.env.USDC_ADDRESS;
  if (!usdcAddress || usdcAddress === "0x...") {
    issues.push("❌ USDC_ADDRESS not set - get from Arc testnet docs");
  } else if (!ethers.isAddress(usdcAddress)) {
    issues.push("❌ USDC_ADDRESS is not a valid Ethereum address");
  } else {
    console.log("✅ USDC address configured");
    console.log(`   Address: ${usdcAddress}`);
  }

  // Check 4: Try to connect to network
  console.log("\n🌐 Testing Arc Testnet connection...");
  try {
    const rpcToUse = rpcUrl || "https://rpc.testnet.arc.network";
    const provider = new ethers.JsonRpcProvider(rpcToUse);
    const network = await provider.getNetwork();
    console.log(`✅ Connected to Arc Testnet`);
    console.log(`   Chain ID: ${network.chainId}`);
    console.log(`   Name: ${network.name}`);

    // Check 5: Check wallet balance (USDC is native gas token on Arc!)
    if (privateKey && privateKey.length === 66) {
      const wallet = new ethers.Wallet(privateKey, provider);
      const balance = await provider.getBalance(wallet.address);
      const balanceInUsdc = ethers.formatUnits(balance, 6); // USDC has 6 decimals
      
      console.log(`\n💰 Wallet Balance (USDC - Arc's native gas token):`);
      console.log(`   ${balanceInUsdc} USDC`);
      
      if (balance === 0n) {
        issues.push("❌ Wallet has ZERO USDC - get testnet USDC from https://faucet.circle.com");
      } else if (balance < ethers.parseUnits("1", 6)) { // Less than 1 USDC
        warnings.push("⚠️  Low USDC balance - deployment costs ~0.5-2 USDC on Arc");
      } else {
        console.log("✅ Sufficient USDC balance for deployment");
      }
    }
  } catch (error: any) {
    issues.push(`❌ Cannot connect to Arc Testnet: ${error.message}`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 DEPLOYMENT READINESS SUMMARY");
  console.log("=".repeat(60));

  if (issues.length === 0 && warnings.length === 0) {
    console.log("\n🎉 ALL CHECKS PASSED! Ready to deploy!\n");
    console.log("Run: npx hardhat run scripts/deploy.ts --network arc\n");
  } else {
    if (issues.length > 0) {
      console.log("\n🚫 CRITICAL ISSUES (must fix):");
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    if (warnings.length > 0) {
      console.log("\n⚠️  WARNINGS (review):");
      warnings.forEach(warning => console.log(`   ${warning}`));
    }

    console.log("\n📖 Next Steps:");
    console.log("   1. Generate wallet: npx ts-node scripts/generate-wallet.ts");
    console.log("   2. Add PRIVATE_KEY to .env file");
    console.log("   3. Get testnet USDC from https://faucet.circle.com (select Arc Testnet)");
    console.log("   4. Get USDC token address from Arc docs");
    console.log("   5. Run this script again to verify\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
