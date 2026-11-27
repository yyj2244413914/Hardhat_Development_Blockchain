// SPDX-License-Identifier: MIT
const { ethers } = require("hardhat");
const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("区块链金融管理实验 - 自动化测试", function () {
  // ---------------- 实验一 ----------------
  it("实验一：SimpleBank 存款、取款与超额取款拦截", async function () {
    const [A, B] = await ethers.getSigners();
    const Bank = await ethers.getContractFactory("SimpleBank");
    const bank = await Bank.deploy();
    await bank.waitForDeployment();

    await bank.connect(A).deposit({ value: ethers.parseEther("10") });
    await bank.connect(B).deposit({ value: ethers.parseEther("5") });

    expect(await bank.connect(A).getMyBalance()).to.equal(ethers.parseEther("10"));
    expect(await bank.getBankBalance()).to.equal(ethers.parseEther("15"));

    await bank.connect(A).withdraw(ethers.parseEther("3"));
    expect(await bank.connect(A).getMyBalance()).to.equal(ethers.parseEther("7"));

    await expect(bank.connect(A).withdraw(ethers.parseEther("20")))
      .to.be.revertedWith("Insufficient balance");

    expect(await bank.totalTransactions()).to.equal(3);
  });

  // ---------------- 实验二 ----------------
  it("实验二：FinanceToken 发行、转账、授权代扣与增发权限", async function () {
    const [A, B, C] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("FinanceToken");
    const token = await Token.deploy();
    await token.waitForDeployment();

    expect(await token.name()).to.equal("FinanceToken");
    expect(await token.symbol()).to.equal("FTK");
    expect(await token.decimals()).to.equal(18);
    expect(await token.totalSupplyInTokens()).to.equal(1000000n);

    const fiftyK = ethers.parseUnits("50000", 18);
    await token.transfer(B.address, fiftyK);
    expect(await token.balanceOf(B.address)).to.equal(fiftyK);

    const tenK = ethers.parseUnits("10000", 18);
    await token.connect(B).approve(C.address, tenK);
    expect(await token.allowance(B.address, C.address)).to.equal(tenK);

    await token.connect(C).transferFrom(B.address, A.address, ethers.parseUnits("5000", 18));
    expect(await token.allowance(B.address, C.address)).to.equal(ethers.parseUnits("5000", 18));

    await token.mint(A.address, ethers.parseUnits("500000", 18));
    expect(await token.totalSupplyInTokens()).to.equal(1500000n);
    await token.burn(ethers.parseUnits("100000", 18));
    expect(await token.totalSupplyInTokens()).to.equal(1400000n);

    await expect(token.connect(B).mint(B.address, 1n))
      .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  // ---------------- 实验三 ----------------
  it("实验三：SimpleLending 注资、抵押借款、计息与清算拦截", async function () {
    const [A, B, C, D] = await ethers.getSigners();
    const Lending = await ethers.getContractFactory("SimpleLending");
    const lending = await Lending.deploy();
    await lending.waitForDeployment();

    await lending.connect(A).depositToPool({ value: ethers.parseEther("50") });
    await lending.connect(B).depositToPool({ value: ethers.parseEther("30") });

    let stats = await lending.getProtocolStats();
    expect(stats.poolBalance).to.equal(ethers.parseEther("80"));

    await lending.connect(C).borrow({ value: ethers.parseEther("15") });
    const loan = await lending.getLoanDetails(C.address);
    expect(loan.collateral).to.equal(ethers.parseEther("15"));
    expect(loan.borrowed).to.equal(ethers.parseEther("10"));
    expect(loan.currentRatio).to.equal(150n);

    stats = await lending.getProtocolStats();
    expect(stats.poolBalance).to.equal(ethers.parseEther("85"));
    expect(stats.totalLoans).to.equal(ethers.parseEther("10"));

    await time.increase(3600);
    const interest = await lending.calculateInterest(C.address);
    expect(interest > 0n).to.equal(true);

    await lending.connect(C).repay({ value: ethers.parseEther("11") });
    const closed = await lending.getLoanDetails(C.address);
    expect(closed.isActive).to.equal(false);
    expect(closed.collateral).to.equal(0n);

    await lending.connect(D).borrow({ value: ethers.parseEther("6") });
    await expect(lending.connect(A).liquidate(D.address))
      .to.be.revertedWith("Loan is still healthy, cannot liquidate");
  });

  // ---------------- 实验四 ----------------
  it("实验四：ReceivableToken 贴现定价、到期赎回与按比例分配", async function () {
    const [A, B, C, D] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ReceivableToken");
    const token = await Token.deploy(
      "China Mobile",
      "5G base station equipment payment",
      1000000,
      90,
      3
    );
    await token.waitForDeployment();

    const info = await token.getReceivableInfo();
    expect(info.debtor).to.equal("China Mobile");
    expect(info.faceValue).to.equal(1000000n);
    const discounted = await token.getCurrentDiscountedValue();
    expect(discounted > 992000n && discounted <= 1000000n).to.equal(true);

    await token.transfer(B.address, ethers.parseUnits("600000", 18));
    await token.transfer(C.address, ethers.parseUnits("300000", 18));

    await expect(token.connect(B).redeem(ethers.parseUnits("600000", 18)))
      .to.be.revertedWith("Not yet due and redemption not started");

    await time.increase(90 * 24 * 3600 + 1);
    await token.connect(D).fundRedemption({ value: ethers.parseEther("10") });
    expect(await token.redemptionPool()).to.equal(ethers.parseEther("10"));

    await token.connect(B).redeem(ethers.parseUnits("600000", 18));
    expect(await token.redemptionPool()).to.equal(ethers.parseEther("4"));

    await token.connect(C).redeem(ethers.parseUnits("300000", 18));
    await token.connect(A).redeem(ethers.parseUnits("100000", 18));

    expect(await token.totalSupply()).to.equal(0n);
    const finalInfo = await token.getReceivableInfo();
    expect(finalInfo.isRedeemed).to.equal(true);
    expect(finalInfo.poolBalance).to.equal(0n);
  });

  // ---------------- 实验五 ----------------
  it("实验五：四个合约可一键部署到本地节点", async function () {
    const Bank = await ethers.getContractFactory("SimpleBank");
    const bank = await Bank.deploy();
    await bank.waitForDeployment();

    const Token = await ethers.getContractFactory("FinanceToken");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Lending = await ethers.getContractFactory("SimpleLending");
    const lending = await Lending.deploy();
    await lending.waitForDeployment();

    const Receivable = await ethers.getContractFactory("ReceivableToken");
    const receivable = await Receivable.deploy("China Mobile", "5G equipment", 1000000, 90, 3);
    await receivable.waitForDeployment();

    expect((await bank.getAddress()).length).to.equal(42);
    expect((await token.getAddress()).length).to.equal(42);
    expect((await lending.getAddress()).length).to.equal(42);
    expect((await receivable.getAddress()).length).to.equal(42);
  });
});
