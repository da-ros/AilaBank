import { expect } from "chai";
import { ethers } from "hardhat";
import { AilaVault, LiquidityBuffer, YieldAllocator } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AilaVault", function () {
  let ailaVault: AilaVault;
  let liquidityBuffer: LiquidityBuffer;
  let yieldAllocator: YieldAllocator;
  let mockUSDC: any;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let admin: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 6); // 1M USDC
  const DEPOSIT_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC

  beforeEach(async function () {
    [owner, user1, user2, admin] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Mint USDC to test users
    await mockUSDC.mint(user1.address, INITIAL_SUPPLY);
    await mockUSDC.mint(user2.address, INITIAL_SUPPLY);

    // Deploy AilaVault
    const AilaVault = await ethers.getContractFactory("AilaVault");
    ailaVault = await AilaVault.deploy(await mockUSDC.getAddress(), admin.address);
    await ailaVault.waitForDeployment();

    // Deploy LiquidityBuffer
    const LiquidityBuffer = await ethers.getContractFactory("LiquidityBuffer");
    liquidityBuffer = await LiquidityBuffer.deploy(await mockUSDC.getAddress(), admin.address);
    await liquidityBuffer.waitForDeployment();

    // Deploy YieldAllocator
    const YieldAllocator = await ethers.getContractFactory("YieldAllocator");
    yieldAllocator = await YieldAllocator.deploy(await mockUSDC.getAddress(), admin.address);
    await yieldAllocator.waitForDeployment();

    // Connect contracts
    await ailaVault.connect(admin).setLiquidityBuffer(await liquidityBuffer.getAddress());
    await ailaVault.connect(admin).setYieldAllocator(await yieldAllocator.getAddress());
    await liquidityBuffer.connect(admin).setAilaVault(await ailaVault.getAddress());
    await yieldAllocator.connect(admin).setAilaVault(await ailaVault.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct USDC address", async function () {
      expect(await ailaVault.usdc()).to.equal(await mockUSDC.getAddress());
    });

    it("Should grant ADMIN_ROLE to deployer", async function () {
      const ADMIN_ROLE = await ailaVault.ADMIN_ROLE();
      expect(await ailaVault.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should have zero initial deposits", async function () {
      expect(await ailaVault.totalUSDCDeposited()).to.equal(0);
    });
  });

  describe("Deposits", function () {
    it("Should allow user to deposit USDC", async function () {
      // Approve vault to spend USDC
      await mockUSDC.connect(user1).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);

      // Deposit
      await expect(ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT))
        .to.emit(ailaVault, "Deposit")
        .withArgs(user1.address, DEPOSIT_AMOUNT, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

      // Check balances
      expect(await ailaVault.userBalances(user1.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await ailaVault.totalUSDCDeposited()).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should fail deposit with zero amount", async function () {
      await expect(ailaVault.connect(user1).deposit(0))
        .to.be.revertedWithCustomError(ailaVault, "InvalidAmount");
    });

    it("Should fail deposit without approval", async function () {
      await expect(ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT))
        .to.be.reverted;
    });

    it("Should handle multiple deposits from same user", async function () {
      await mockUSDC.connect(user1).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT * 2n);

      await ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT);
      await ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT);

      expect(await ailaVault.userBalances(user1.address)).to.equal(DEPOSIT_AMOUNT * 2n);
    });

    it("Should track deposits from multiple users", async function () {
      await mockUSDC.connect(user1).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);
      await mockUSDC.connect(user2).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);

      await ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT);
      await ailaVault.connect(user2).deposit(DEPOSIT_AMOUNT);

      expect(await ailaVault.userBalances(user1.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await ailaVault.userBalances(user2.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await ailaVault.totalUSDCDeposited()).to.equal(DEPOSIT_AMOUNT * 2n);
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      // Setup: user1 deposits
      await mockUSDC.connect(user1).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);
      await ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT);
    });

    it("Should allow user to withdraw their balance", async function () {
      const withdrawAmount = ethers.parseUnits("50", 6); // 5% withdrawal (within 10% limit)

      await expect(ailaVault.connect(user1).withdraw(withdrawAmount))
        .to.emit(ailaVault, "Withdrawal");

      expect(await ailaVault.userBalances(user1.address)).to.equal(DEPOSIT_AMOUNT - withdrawAmount);
    });

    it("Should fail withdrawal if insufficient balance", async function () {
      const withdrawAmount = DEPOSIT_AMOUNT + ethers.parseUnits("1", 6);

      await expect(ailaVault.connect(user1).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(ailaVault, "InsufficientBalance");
    });

    it("Should fail withdrawal with zero amount", async function () {
      await expect(ailaVault.connect(user1).withdraw(0))
        .to.be.revertedWithCustomError(ailaVault, "InvalidAmount");
    });

    it("Should enforce circuit breaker on large withdrawals", async function () {
      // Deposit more to increase TVL
      await mockUSDC.connect(user2).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT * 10n);
      await ailaVault.connect(user2).deposit(DEPOSIT_AMOUNT * 10n);

      // Try to withdraw more than 10% of TVL
      const tvl = await ailaVault.totalUSDCDeposited();
      const largeWithdraw = (tvl * 11n) / 100n; // 11% of TVL

      await expect(ailaVault.connect(user2).withdraw(largeWithdraw))
        .to.be.revertedWithCustomError(ailaVault, "WithdrawalExceedsLimit");
    });
  });

  describe("Yield Tracking", function () {
    beforeEach(async function () {
      await mockUSDC.connect(user1).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);
      await ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT);
    });

    it("Should allow YIELD_MANAGER to accumulate yield", async function () {
      const yieldAmount = ethers.parseUnits("50", 6); // 50 USDC yield

      // YieldAllocator has YIELD_MANAGER_ROLE
      const yieldAllocatorAddress = await yieldAllocator.getAddress();
      
      await expect(ailaVault.connect(admin).accumulateYield(user1.address, yieldAmount))
        .to.emit(ailaVault, "YieldAccrued")
        .withArgs(user1.address, yieldAmount, yieldAmount);

      expect(await ailaVault.userYield(user1.address)).to.equal(yieldAmount);
      expect(await ailaVault.totalYieldDistributed()).to.equal(yieldAmount);
    });

    it("Should calculate APY correctly", async function () {
      const yieldAmount = ethers.parseUnits("50", 6);
      
      await ailaVault.connect(admin).accumulateYield(user1.address, yieldAmount);

      // Fast forward 30 days to have meaningful time elapsed
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const apy = await ailaVault.getUserAPY(user1.address);
      
      // APY should be > 0 if yield was accumulated
      expect(apy).to.be.gt(0);
    });

    it("Should handle batch yield accumulation", async function () {
      await mockUSDC.connect(user2).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);
      await ailaVault.connect(user2).deposit(DEPOSIT_AMOUNT);

      const users = [user1.address, user2.address];
      const yields = [ethers.parseUnits("50", 6), ethers.parseUnits("30", 6)];

      await ailaVault.connect(admin).batchAccumulateYield(users, yields);

      expect(await ailaVault.userYield(user1.address)).to.equal(yields[0]);
      expect(await ailaVault.userYield(user2.address)).to.equal(yields[1]);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to pause and unpause", async function () {
      await ailaVault.connect(admin).pause();
      
      await mockUSDC.connect(user1).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);
      await expect(ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT))
        .to.be.revertedWithCustomError(ailaVault, "EnforcedPause");

      await ailaVault.connect(admin).unpause();
      await expect(ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT))
        .to.emit(ailaVault, "Deposit");
    });

    it("Should allow admin to update circuit breaker", async function () {
      await ailaVault.connect(admin).setMaxWithdrawalPercent(15);
      expect(await ailaVault.maxWithdrawalPercent()).to.equal(15);
    });

    it("Should return correct TVL", async function () {
      await mockUSDC.connect(user1).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);
      await ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT);

      const yieldAmount = ethers.parseUnits("50", 6);
      await ailaVault.connect(admin).accumulateYield(user1.address, yieldAmount);

      const tvl = await ailaVault.getTVL();
      expect(tvl).to.equal(DEPOSIT_AMOUNT + yieldAmount);
    });

    it("Should return health metrics", async function () {
      await mockUSDC.connect(user1).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);
      await ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT);

      const [deposited, yieldDistributed, vaultBalance] = await ailaVault.getHealthMetrics();
      
      expect(deposited).to.equal(DEPOSIT_AMOUNT);
      expect(yieldDistributed).to.equal(0);
      expect(vaultBalance).to.equal(DEPOSIT_AMOUNT);
    });
  });

  describe("Emergency Functions", function () {
    beforeEach(async function () {
      await mockUSDC.connect(user1).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);
      await ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT);
    });

    it("Should allow admin emergency withdrawal", async function () {
      await expect(ailaVault.connect(admin).emergencyWithdraw(user1.address, DEPOSIT_AMOUNT))
        .to.emit(ailaVault, "EmergencyWithdrawal")
        .withArgs(admin.address, user1.address, DEPOSIT_AMOUNT);

      expect(await ailaVault.userBalances(user1.address)).to.equal(0);
    });

    it("Should not allow non-admin emergency withdrawal", async function () {
      await expect(ailaVault.connect(user2).emergencyWithdraw(user1.address, DEPOSIT_AMOUNT))
        .to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return correct user balance", async function () {
      await mockUSDC.connect(user1).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);
      await ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT);

      expect(await ailaVault.getBalance(user1.address)).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should return total balance with yield", async function () {
      await mockUSDC.connect(user1).approve(await ailaVault.getAddress(), DEPOSIT_AMOUNT);
      await ailaVault.connect(user1).deposit(DEPOSIT_AMOUNT);

      const yieldAmount = ethers.parseUnits("50", 6);
      await ailaVault.connect(admin).accumulateYield(user1.address, yieldAmount);

      expect(await ailaVault.getTotalBalance(user1.address)).to.equal(DEPOSIT_AMOUNT + yieldAmount);
    });
  });
});
