import { expect } from "chai";
import { ethers } from "hardhat";
import { YieldAllocator } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("YieldAllocator", function () {
  let yieldAllocator: YieldAllocator;
  let mockUSDC: any;
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let strategyManager: SignerWithAddress;
  let vault: SignerWithAddress;
  let mockPool: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 6); // 1M USDC
  const ALLOCATION_AMOUNT = ethers.parseUnits("10000", 6); // 10k USDC

  const AAVE_POOL_ID = ethers.keccak256(ethers.toUtf8Bytes("AAVE_USDC"));
  const COMPOUND_POOL_ID = ethers.keccak256(ethers.toUtf8Bytes("COMPOUND_USDC"));

  beforeEach(async function () {
    [owner, admin, strategyManager, vault, mockPool] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Mint USDC to test accounts
    await mockUSDC.mint(admin.address, INITIAL_SUPPLY);
    await mockUSDC.mint(strategyManager.address, INITIAL_SUPPLY);
    await mockUSDC.mint(vault.address, INITIAL_SUPPLY);

    // Deploy YieldAllocator
    const YieldAllocator = await ethers.getContractFactory("YieldAllocator");
    yieldAllocator = await YieldAllocator.deploy(await mockUSDC.getAddress(), admin.address);
    await yieldAllocator.waitForDeployment();

    // Grant roles
    const STRATEGY_MANAGER_ROLE = await yieldAllocator.STRATEGY_MANAGER_ROLE();
    await yieldAllocator.connect(admin).grantRole(STRATEGY_MANAGER_ROLE, strategyManager.address);

    // Set vault
    await yieldAllocator.connect(admin).setAilaVault(vault.address);
  });

  describe("Deployment", function () {
    it("Should set correct USDC address", async function () {
      expect(await yieldAllocator.usdc()).to.equal(await mockUSDC.getAddress());
    });

    it("Should grant ADMIN_ROLE to deployer", async function () {
      const ADMIN_ROLE = await yieldAllocator.ADMIN_ROLE();
      expect(await yieldAllocator.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should have correct initial allocation limits", async function () {
      expect(await yieldAllocator.maxAllocationPercent()).to.equal(80);
      expect(await yieldAllocator.minPoolPercent()).to.equal(5);
      expect(await yieldAllocator.maxPoolPercent()).to.equal(40);
    });
  });

  describe("Pool Management", function () {
    it("Should allow adding new pool", async function () {
      await expect(
        yieldAllocator.connect(strategyManager).addPool(
          AAVE_POOL_ID,
          mockPool.address,
          "aave",
          30
        )
      )
        .to.emit(yieldAllocator, "PoolAdded")
        .withArgs(AAVE_POOL_ID, mockPool.address, "aave", 30);

      const pool = await yieldAllocator.getPool(AAVE_POOL_ID);
      expect(pool.poolAddress).to.equal(mockPool.address);
      expect(pool.poolType).to.equal("aave");
      expect(pool.targetPercent).to.equal(30);
      expect(pool.isActive).to.be.true;
    });

    it("Should reject duplicate pool IDs", async function () {
      await yieldAllocator.connect(strategyManager).addPool(
        AAVE_POOL_ID,
        mockPool.address,
        "aave",
        30
      );

      await expect(
        yieldAllocator.connect(strategyManager).addPool(
          AAVE_POOL_ID,
          mockPool.address,
          "aave",
          30
        )
      ).to.be.revertedWithCustomError(yieldAllocator, "PoolAlreadyExists");
    });

    it("Should reject invalid target percentages", async function () {
      // Below minimum (5%)
      await expect(
        yieldAllocator.connect(strategyManager).addPool(
          AAVE_POOL_ID,
          mockPool.address,
          "aave",
          4
        )
      ).to.be.revertedWithCustomError(yieldAllocator, "InvalidPercent");

      // Above maximum (40%)
      await expect(
        yieldAllocator.connect(strategyManager).addPool(
          AAVE_POOL_ID,
          mockPool.address,
          "aave",
          50
        )
      ).to.be.revertedWithCustomError(yieldAllocator, "InvalidPercent");
    });

    it("Should allow updating pool configuration", async function () {
      await yieldAllocator.connect(strategyManager).addPool(
        AAVE_POOL_ID,
        mockPool.address,
        "aave",
        30
      );

      await expect(
        yieldAllocator.connect(strategyManager).updatePool(AAVE_POOL_ID, 35, false)
      )
        .to.emit(yieldAllocator, "PoolUpdated")
        .withArgs(AAVE_POOL_ID, 35, false);

      const pool = await yieldAllocator.getPool(AAVE_POOL_ID);
      expect(pool.targetPercent).to.equal(35);
      expect(pool.isActive).to.be.false;
    });

    it("Should get active pools", async function () {
      await yieldAllocator.connect(strategyManager).addPool(
        AAVE_POOL_ID,
        mockPool.address,
        "aave",
        30
      );

      await yieldAllocator.connect(strategyManager).addPool(
        COMPOUND_POOL_ID,
        mockPool.address,
        "compound",
        25
      );

      // Deactivate one pool
      await yieldAllocator.connect(strategyManager).updatePool(COMPOUND_POOL_ID, 25, false);

      const activePools = await yieldAllocator.getActivePools();
      expect(activePools.length).to.equal(1);
      expect(activePools[0]).to.equal(AAVE_POOL_ID);
    });
  });

  describe("Fund Allocation", function () {
    beforeEach(async function () {
      await yieldAllocator.connect(strategyManager).addPool(
        AAVE_POOL_ID,
        mockPool.address,
        "aave",
        30
      );
    });

    it("Should allow allocating funds to pool", async function () {
      await mockUSDC.connect(strategyManager).approve(
        await yieldAllocator.getAddress(),
        ALLOCATION_AMOUNT
      );

      await expect(
        yieldAllocator.connect(strategyManager).allocateToPool(AAVE_POOL_ID, ALLOCATION_AMOUNT)
      )
        .to.emit(yieldAllocator, "FundsAllocated")
        .withArgs(AAVE_POOL_ID, ALLOCATION_AMOUNT, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

      const pool = await yieldAllocator.getPool(AAVE_POOL_ID);
      expect(pool.allocatedAmount).to.equal(ALLOCATION_AMOUNT);
      expect(await yieldAllocator.totalAllocated()).to.equal(ALLOCATION_AMOUNT);
    });

    it("Should reject allocation to non-existent pool", async function () {
      await mockUSDC.connect(strategyManager).approve(
        await yieldAllocator.getAddress(),
        ALLOCATION_AMOUNT
      );

      await expect(
        yieldAllocator.connect(strategyManager).allocateToPool(COMPOUND_POOL_ID, ALLOCATION_AMOUNT)
      ).to.be.revertedWithCustomError(yieldAllocator, "PoolNotFound");
    });

    it("Should reject zero amount allocation", async function () {
      await expect(
        yieldAllocator.connect(strategyManager).allocateToPool(AAVE_POOL_ID, 0)
      ).to.be.revertedWithCustomError(yieldAllocator, "InvalidAmount");
    });
  });

  describe("Fund Unwinding", function () {
    beforeEach(async function () {
      await yieldAllocator.connect(strategyManager).addPool(
        AAVE_POOL_ID,
        mockPool.address,
        "aave",
        30
      );

      await mockUSDC.connect(strategyManager).approve(
        await yieldAllocator.getAddress(),
        ALLOCATION_AMOUNT
      );
      await yieldAllocator.connect(strategyManager).allocateToPool(AAVE_POOL_ID, ALLOCATION_AMOUNT);

      // Mint USDC to allocator for unwinding
      await mockUSDC.mint(await yieldAllocator.getAddress(), ALLOCATION_AMOUNT);
    });

    it("Should allow vault to unwind from pool", async function () {
      const unwindAmount = ethers.parseUnits("5000", 6);
      const initialBalance = await mockUSDC.balanceOf(vault.address);

      await expect(
        yieldAllocator.connect(vault).unwindFromPool(AAVE_POOL_ID, unwindAmount)
      )
        .to.emit(yieldAllocator, "FundsUnwound");

      expect(await mockUSDC.balanceOf(vault.address)).to.equal(initialBalance + unwindAmount);
    });

    it("Should reject unwinding more than available", async function () {
      const largeAmount = ALLOCATION_AMOUNT + ethers.parseUnits("1", 6);

      await expect(
        yieldAllocator.connect(vault).unwindFromPool(AAVE_POOL_ID, largeAmount)
      ).to.be.revertedWithCustomError(yieldAllocator, "InsufficientFunds");
    });

    it("Should not allow non-vault to unwind", async function () {
      const unwindAmount = ethers.parseUnits("5000", 6);

      await expect(
        yieldAllocator.connect(strategyManager).unwindFromPool(AAVE_POOL_ID, unwindAmount)
      ).to.be.reverted;
    });
  });

  describe("Yield Harvesting", function () {
    beforeEach(async function () {
      await yieldAllocator.connect(strategyManager).addPool(
        AAVE_POOL_ID,
        mockPool.address,
        "aave",
        30
      );

      await mockUSDC.connect(strategyManager).approve(
        await yieldAllocator.getAddress(),
        ALLOCATION_AMOUNT
      );
      await yieldAllocator.connect(strategyManager).allocateToPool(AAVE_POOL_ID, ALLOCATION_AMOUNT);

      // Set buffer for yield distribution
      await yieldAllocator.connect(admin).setLiquidityBuffer(mockPool.address);

      // Mint USDC to allocator for yield distribution
      await mockUSDC.mint(await yieldAllocator.getAddress(), ALLOCATION_AMOUNT);
    });

    it("Should harvest yield and distribute", async function () {
      // Fast forward time to accumulate yield
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
      await ethers.provider.send("evm_mine", []);

      const vaultInitialBalance = await mockUSDC.balanceOf(vault.address);
      const bufferInitialBalance = await mockUSDC.balanceOf(mockPool.address);

      await expect(yieldAllocator.connect(strategyManager).harvestYield())
        .to.emit(yieldAllocator, "YieldDistributed");

      // Verify yield was distributed
      expect(await mockUSDC.balanceOf(vault.address)).to.be.gt(vaultInitialBalance);
      expect(await mockUSDC.balanceOf(mockPool.address)).to.be.gt(bufferInitialBalance);
    });

    it("Should return correct APY", async function () {
      // Fast forward time before harvesting
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      await yieldAllocator.connect(strategyManager).harvestYield();

      // Fast forward more time after harvesting
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const apy = await yieldAllocator.getOverallAPY();
      expect(apy).to.be.gt(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow updating allocation limits", async function () {
      await expect(yieldAllocator.connect(admin).setAllocationLimits(70, 10, 35))
        .to.emit(yieldAllocator, "AllocationLimitsUpdated")
        .withArgs(70, 10, 35);

      expect(await yieldAllocator.maxAllocationPercent()).to.equal(70);
      expect(await yieldAllocator.minPoolPercent()).to.equal(10);
      expect(await yieldAllocator.maxPoolPercent()).to.equal(35);
    });

    it("Should reject invalid allocation limits", async function () {
      // Max > 90%
      await expect(
        yieldAllocator.connect(admin).setAllocationLimits(95, 10, 35)
      ).to.be.revertedWithCustomError(yieldAllocator, "InvalidPercent");

      // Min >= Max pool
      await expect(
        yieldAllocator.connect(admin).setAllocationLimits(70, 40, 30)
      ).to.be.revertedWithCustomError(yieldAllocator, "InvalidPercent");
    });

    it("Should allow pause and unpause", async function () {
      await yieldAllocator.connect(admin).pause();

      await yieldAllocator.connect(strategyManager).addPool(
        AAVE_POOL_ID,
        mockPool.address,
        "aave",
        30
      );

      await mockUSDC.connect(strategyManager).approve(
        await yieldAllocator.getAddress(),
        ALLOCATION_AMOUNT
      );

      await expect(
        yieldAllocator.connect(strategyManager).allocateToPool(AAVE_POOL_ID, ALLOCATION_AMOUNT)
      ).to.be.revertedWithCustomError(yieldAllocator, "EnforcedPause");

      await yieldAllocator.connect(admin).unpause();
      await expect(
        yieldAllocator.connect(strategyManager).allocateToPool(AAVE_POOL_ID, ALLOCATION_AMOUNT)
      ).to.emit(yieldAllocator, "FundsAllocated");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await yieldAllocator.connect(strategyManager).addPool(
        AAVE_POOL_ID,
        mockPool.address,
        "aave",
        30
      );

      await mockUSDC.connect(strategyManager).approve(
        await yieldAllocator.getAddress(),
        ALLOCATION_AMOUNT
      );
      await yieldAllocator.connect(strategyManager).allocateToPool(AAVE_POOL_ID, ALLOCATION_AMOUNT);
    });

    it("Should return total value", async function () {
      const totalValue = await yieldAllocator.getTotalValue();
      expect(totalValue).to.equal(ALLOCATION_AMOUNT);
    });

    it("Should return correct metrics", async function () {
      const [allocated, currentValue, yieldGenerated] = await yieldAllocator.getMetrics();

      expect(allocated).to.equal(ALLOCATION_AMOUNT);
      expect(currentValue).to.equal(ALLOCATION_AMOUNT);
      expect(yieldGenerated).to.equal(0);
    });
  });
});
