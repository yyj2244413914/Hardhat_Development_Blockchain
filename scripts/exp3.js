// 实验三：去中心化借贷协议
const { ethers, network } = require("hardhat");

function reason(e) {
  const m = (e.message || "").match(/reverted with (?:reason string )?'([^']+)'/);
  return m ? m[1] : (e.shortMessage || e.message || "").slice(0, 80);
}

async function run() {
  console.log("\n========== 实验三：去中心化借贷协议 ==========");
  const [A, B, C, D] = await ethers.getSigners();

  const Lending = await ethers.getContractFactory("SimpleLending");
  const lending = await Lending.deploy();
  await lending.waitForDeployment();
  console.log("合约地址:", await lending.getAddress());

  // 注资：A 50 ETH，B 30 ETH
  await (await lending.connect(A).depositToPool({ value: ethers.parseEther("50") })).wait();
  await (await lending.connect(B).depositToPool({ value: ethers.parseEther("30") })).wait();
  let stats = await lending.getProtocolStats();
  console.log("注资后 poolBalance:", stats.poolBalance.toString(), " totalLoans:", stats.totalLoans.toString());

  // 账户 C 抵押 15 ETH 借款
  await (await lending.connect(C).borrow({ value: ethers.parseEther("15") })).wait();
  const loan = await lending.getLoanDetails(C.address);
  console.log("C 抵押:", loan.collateral.toString());
  console.log("C 借得:", loan.borrowed.toString());
  console.log("抵押率 currentRatio:", loan.currentRatio.toString());
  stats = await lending.getProtocolStats();
  console.log("借款后 poolBalance:", stats.poolBalance.toString(), " totalLoans:", stats.totalLoans.toString());

  // 利息随时间累积
  const i1 = await lending.calculateInterest(C.address);
  await network.provider.send("evm_increaseTime", [60]);
  await network.provider.send("evm_mine");
  const i2 = await lending.calculateInterest(C.address);
  console.log("60 秒前利息:", i1.toString(), " 现在利息:", i2.toString(), " 差额:", (i2 - i1).toString());

  // 还款
  await (await lending.connect(C).repay({ value: ethers.parseEther("11") })).wait();
  const closed = await lending.getLoanDetails(C.address);
  console.log("还款后 isActive:", closed.isActive, " collateral:", closed.collateral.toString());

  // 清算拦截：账户 D 抵押 6 ETH 借 4 ETH，账户 A 尝试清算
  await (await lending.connect(D).borrow({ value: ethers.parseEther("6") })).wait();
  try {
    await (await lending.connect(A).liquidate(D.address)).wait();
    console.log("清算：未按预期报错");
  } catch (e) {
    console.log("清算被拦截:", reason(e));
  }
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { run };
