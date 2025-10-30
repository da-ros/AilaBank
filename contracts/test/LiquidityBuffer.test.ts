import { expect } from "chai";
import { ethers } from "hardhat";
import { LiquidityBuffer } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("LiquidityBuffer", function () {
  let liquidityBuffer: LiquidityBuffer;
  let mockUSDC: any;
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let vault: SignerWithAddress;
  let user: SignerWithAddress;

  const BUFFER_AMOUNT = ethers.parseUnits("10000", 6); // 10k USDC

  beforeEach(async function () {
    [owner, admin, vault, user] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Mint USDC to test accounts
    await mockUSDC.mint(vault.address, BUFFER_AMOUNT * 10n);
    await mockUSDC.mint(admin.address, BUFFER_AMOUNT * 10n);

    // Deploy LiquidityBuffer
    const LiquidityBuffer = await ethers.getContractFactory("LiquidityBuffer");
    liquidityBuffer = await LiquidityBuffer.deploy(await mockUSDC.getAddress(), admin.address);
    await liquidityBuffer.waitForDeployment();

    // Set vault
    await liquidityBuffer.connect(admin).setAilaVault(vault.address);
  });

  describe("Deployment", function () {
    it("Should set correct USDC address", async function () {
      expect(await liquidityBuffer.usdc()).to.equal(await mockUSDC.getAddress());
    });

    it("Should grant ADMIN_ROLE to deployer", async function () {
      const ADMIN_ROLE = await liquidityBuffer.ADMIN_ROLE();
      expect(await liquidityBuffer.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should have correct initial buffer thresholds", async function () {
      expect(await liquidityBuffer.minBufferPercent()).to.equal(10);
      expect(await liquidityBuffer.maxBufferPercent()).to.equal(20);
    });
  });

  describe("Buffer Management", function () {
    it("Should allow rebalancing buffer", async function () {
      const rebalanceAmount = ethers.parseUnits("5000", 6);
      
      await mockUSDC.connect(admin).approve(await liquidityBuffer.getAddress(), rebalanceAmount);

      await expect(liquidityBuffer.connect(admin).rebalanceBuffer(rebalanceAmount))
        .to.emit(liquidityBuffer, "BufferRebalanced")
        .withArgs(rebalanceAmount, rebalanceAmount, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

      expect(await liquidityBuffer.bufferBalance()).to.equal(rebalanceAmount);
    });

    it("Should allow vault to add to buffer", async function () {
      const addAmount = ethers.parseUnits("1000", 6);
      
      // Transfer USDC to buffer first (simulating vault deposit)
      await mockUSDC.connect(vault).transfer(await liquidityBuffer.getAddress(), addAmount);

      await expect(liquidityBuffer.connect(vault).addToBuffer(addAmount))
        .to.emit(liquidityBuffer, "BufferRebalanced");

      expect(await liquidityBuffer.bufferBalance()).to.equal(addAmount);
    });

    it("Should check rebalance needed correctly", async function () {
      const vaultTVL = ethers.parseUnits("100000", 6); // 100k USDC
      const minBuffer = (vaultTVL * 10n) / 100n; // 10k USDC (10%)

      // Buffer is empty, should need rebalance
      let [needsRebalance, targetAmount] = await liquidityBuffer.checkRebalanceNeeded(vaultTVL);
      expect(needsRebalance).to.be.true;
      expect(targetAmount).to.equal((vaultTVL * 20n) / 100n); // Should target 20%

      // Add sufficient buffer
      await mockUSDC.connect(admin).approve(await liquidityBuffer.getAddress(), minBuffer + 1n);
      await liquidityBuffer.connect(admin).rebalanceBuffer(minBuffer + 1n);

      // Should not need rebalance anymore
      [needsRebalance] = await liquidityBuffer.checkRebalanceNeeded(vaultTVL);
      expect(needsRebalance).to.be.false;
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      // Setup buffer with funds
      await mockUSDC.connect(admin).approve(await liquidityBuffer.getAddress(), BUFFER_AMOUNT);
      await liquidityBuffer.connect(admin).rebalanceBuffer(BUFFER_AMOUNT);
    });

    it("Should allow vault to withdraw from buffer", async function () {
      const withdrawAmount = ethers.parseUnits("1000", 6);
      const initialBalance = await mockUSDC.balanceOf(user.address);

      const success = await liquidityBuffer.connect(vault).withdrawFromBuffer.staticCall(user.address, withdrawAmount);
      expect(success).to.be.true;

      await expect(liquidityBuffer.connect(vault).withdrawFromBuffer(user.address, withdrawAmount))
        .to.emit(liquidityBuffer, "BufferWithdrawal")
        .withArgs(user.address, withdrawAmount, BUFFER_AMOUNT - withdrawAmount);

      expect(await mockUSDC.balanceOf(user.address)).to.equal(initialBalance + withdrawAmount);
      expect(await liquidityBuffer.bufferBalance()).to.equal(BUFFER_AMOUNT - withdrawAmount);
    });

    it("Should return false if insufficient buffer", async function () {
      const largeWithdraw = BUFFER_AMOUNT + ethers.parseUnits("1", 6);

      const success = await liquidityBuffer.connect(vault).withdrawFromBuffer.staticCall(user.address, largeWithdraw);
      expect(success).to.be.false;
    });

    it("Should not allow non-vault to withdraw", async function () {
      const withdrawAmount = ethers.parseUnits("1000", 6);

      await expect(liquidityBuffer.connect(user).withdrawFromBuffer(user.address, withdrawAmount))
        .to.be.reverted;
    });

    it("Should track total withdrawn", async function () {
      const withdrawAmount = ethers.parseUnits("1000", 6);

      await liquidityBuffer.connect(vault).withdrawFromBuffer(user.address, withdrawAmount);
      await liquidityBuffer.connect(vault).withdrawFromBuffer(user.address, withdrawAmount);

      expect(await liquidityBuffer.totalWithdrawn()).to.equal(withdrawAmount * 2n);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update buffer thresholds", async function () {
      await expect(liquidityBuffer.connect(admin).setBufferThresholds(15, 25))
        .to.emit(liquidityBuffer, "BufferThresholdsUpdated")
        .withArgs(15, 25);

      expect(await liquidityBuffer.minBufferPercent()).to.equal(15);
      expect(await liquidityBuffer.maxBufferPercent()).to.equal(25);
    });

    it("Should reject invalid threshold updates", async function () {
      // Min >= Max
      await expect(liquidityBuffer.connect(admin).setBufferThresholds(25, 15))
        .to.be.revertedWithCustomError(liquidityBuffer, "InvalidThresholds");

      // Max > 50%
      await expect(liquidityBuffer.connect(admin).setBufferThresholds(10, 60))
        .to.be.revertedWithCustomError(liquidityBuffer, "InvalidThresholds");

      // Zero values
      await expect(liquidityBuffer.connect(admin).setBufferThresholds(0, 20))
        .to.be.revertedWithCustomError(liquidityBuffer, "InvalidThresholds");
    });

    it("Should allow emergency drain", async function () {
      await mockUSDC.connect(admin).approve(await liquidityBuffer.getAddress(), BUFFER_AMOUNT);
      await liquidityBuffer.connect(admin).rebalanceBuffer(BUFFER_AMOUNT);

      const drainAmount = ethers.parseUnits("5000", 6);
      const initialBalance = await mockUSDC.balanceOf(admin.address);

      await expect(liquidityBuffer.connect(admin).emergencyDrain(drainAmount, admin.address))
        .to.emit(liquidityBuffer, "EmergencyDrain")
        .withArgs(admin.address, drainAmount, admin.address);

      expect(await mockUSDC.balanceOf(admin.address)).to.equal(initialBalance + drainAmount);
      expect(await liquidityBuffer.bufferBalance()).to.equal(BUFFER_AMOUNT - drainAmount);
    });

    it("Should allow pause and unpause", async function () {
      await liquidityBuffer.connect(admin).pause();

      await mockUSDC.connect(admin).approve(await liquidityBuffer.getAddress(), BUFFER_AMOUNT);
      await expect(liquidityBuffer.connect(admin).rebalanceBuffer(BUFFER_AMOUNT))
        .to.be.revertedWithCustomError(liquidityBuffer, "EnforcedPause");

      await liquidityBuffer.connect(admin).unpause();
      await expect(liquidityBuffer.connect(admin).rebalanceBuffer(BUFFER_AMOUNT))
        .to.emit(liquidityBuffer, "BufferRebalanced");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await mockUSDC.connect(admin).approve(await liquidityBuffer.getAddress(), BUFFER_AMOUNT);
      await liquidityBuffer.connect(admin).rebalanceBuffer(BUFFER_AMOUNT);
    });

    it("Should return buffer metrics", async function () {
      const [balance, withdrawn, rebalanced] = await liquidityBuffer.getBufferMetrics();

      expect(balance).to.equal(BUFFER_AMOUNT);
      expect(withdrawn).to.equal(0);
      expect(rebalanced).to.equal(BUFFER_AMOUNT);
    });

    it("Should calculate buffer utilization", async function () {
      const vaultTVL = ethers.parseUnits("100000", 6); // 100k USDC
      const utilization = await liquidityBuffer.getBufferUtilization(vaultTVL);

      // 10k / 100k = 10%
      expect(utilization).to.equal(10);
    });

    it("Should return 0 utilization for zero TVL", async function () {
      const utilization = await liquidityBuffer.getBufferUtilization(0);
      expect(utilization).to.equal(0);
    });
  });
});
