import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("\n🚀 Deploying AilaBank Contracts to Arc Testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "tokens\n");

  // Get USDC address from .env
  const usdcAddress = process.env.USDC_ADDRESS;
  if (!usdcAddress || usdcAddress === "0x...") {
    throw new Error("❌ USDC_ADDRESS not configured in .env");
  }

  console.log("📄 USDC Token Address:", usdcAddress);
  console.log("👤 Admin Address:", deployer.address);
  console.log("\n" + "=".repeat(60));

  // 1. Deploy AilaVault
  console.log("\n📦 Deploying AilaVault...");
  const AilaVault = await ethers.getContractFactory("AilaVault");
  const ailaVault = await AilaVault.deploy(usdcAddress, deployer.address);
  await ailaVault.waitForDeployment();
  const vaultAddress = await ailaVault.getAddress();
  console.log("✅ AilaVault deployed to:", vaultAddress);

  // 2. Deploy LiquidityBuffer
  console.log("\n📦 Deploying LiquidityBuffer...");
  const LiquidityBuffer = await ethers.getContractFactory("LiquidityBuffer");
  const liquidityBuffer = await LiquidityBuffer.deploy(usdcAddress, deployer.address);
  await liquidityBuffer.waitForDeployment();
  const bufferAddress = await liquidityBuffer.getAddress();
  console.log("✅ LiquidityBuffer deployed to:", bufferAddress);

  // 3. Deploy YieldAllocator
  console.log("\n📦 Deploying YieldAllocator...");
  const YieldAllocator = await ethers.getContractFactory("YieldAllocator");
  const yieldAllocator = await YieldAllocator.deploy(usdcAddress, deployer.address);
  await yieldAllocator.waitForDeployment();
  const allocatorAddress = await yieldAllocator.getAddress();
  console.log("✅ YieldAllocator deployed to:", allocatorAddress);

  // 4. Connect contracts
  console.log("\n🔗 Connecting contracts...");
  
  console.log("   Setting LiquidityBuffer in AilaVault...");
  const tx1 = await ailaVault.setLiquidityBuffer(bufferAddress);
  await tx1.wait();
  console.log("   ✅ Done");

  console.log("   Setting YieldAllocator in AilaVault...");
  const tx2 = await ailaVault.setYieldAllocator(allocatorAddress);
  await tx2.wait();
  console.log("   ✅ Done");

  console.log("   Setting AilaVault in LiquidityBuffer...");
  const tx3 = await liquidityBuffer.setAilaVault(vaultAddress);
  await tx3.wait();
  console.log("   ✅ Done");

  console.log("   Setting YieldAllocator in LiquidityBuffer...");
  const tx4 = await liquidityBuffer.setYieldAllocator(allocatorAddress);
  await tx4.wait();
  console.log("   ✅ Done");

  console.log("   Setting AilaVault in YieldAllocator...");
  const tx5 = await yieldAllocator.setAilaVault(vaultAddress);
  await tx5.wait();
  console.log("   ✅ Done");

  console.log("   Setting LiquidityBuffer in YieldAllocator...");
  const tx6 = await yieldAllocator.setLiquidityBuffer(bufferAddress);
  await tx6.wait();
  console.log("   ✅ Done");

  // 5. Verify deployment
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   AilaVault:        ", vaultAddress);
  console.log("   LiquidityBuffer:  ", bufferAddress);
  console.log("   YieldAllocator:   ", allocatorAddress);
  console.log("   USDC Token:       ", usdcAddress);
  console.log("   Admin:            ", deployer.address);

  // Save deployment info
  const deploymentInfo = {
    network: "arc-testnet",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ailaVault: vaultAddress,
      liquidityBuffer: bufferAddress,
      yieldAllocator: allocatorAddress,
      usdc: usdcAddress,
    },
    transactionHashes: {
      vault: ailaVault.deploymentTransaction()?.hash,
      buffer: liquidityBuffer.deploymentTransaction()?.hash,
      allocator: yieldAllocator.deploymentTransaction()?.hash,
    }
  };

  console.log("\n💾 Saving deployment info to deployments.json...");
  const fs = require("fs");
  fs.writeFileSync(
    "deployments.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("✅ Saved!");

  console.log("\n📝 Next Steps:");
  console.log("   1. Verify contracts on Arc block explorer");
  console.log("   2. Update frontend with contract addresses");
  console.log("   3. Test deposit/withdraw functions");
  console.log("   4. Set up event indexer\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
