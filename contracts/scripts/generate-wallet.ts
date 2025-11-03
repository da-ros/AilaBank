import { ethers } from "ethers";

async function main() {
  console.log("\n🔑 Generating New Wallet for Deployment\n");
  
  const wallet = ethers.Wallet.createRandom();
  
  console.log("=".repeat(60));
  console.log("Address:     ", wallet.address);
  console.log("Private Key: ", wallet.privateKey);
  console.log("Mnemonic:    ", wallet.mnemonic?.phrase);
  console.log("=".repeat(60));
  
  console.log("\n⚠️  IMPORTANT:");
  console.log("   1. Save the private key in .env file");
  console.log("   2. NEVER commit the .env file to git");
  console.log("   3. Get testnet tokens from Arc faucet for this address");
  console.log("   4. Keep the mnemonic phrase in a SECURE location\n");
  
  console.log("📝 Add to .env:");
  console.log(`PRIVATE_KEY="${wallet.privateKey}"\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
