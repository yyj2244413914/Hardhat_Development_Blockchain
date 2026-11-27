// 实验四：应收账款通证化
const { ethers, network } = require("hardhat");

function reason(e) {
  const m = (e.message || "").match(/reverted with (?:reason string )?'([^']+)'/);
  return m ? m[1] : (e.shortMessage || e.message || "").slice(0, 80);
}

async function run() {
  console.log("\n========== 实验四：应收账款通证化 ==========");
  const [A, B, C, D] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("ReceivableToken");
  const token = await Token.deploy(
    "China Mobile",
    "5G base station equipment payment",
    1000000, // 票面价值 100 万元
    90,      // 距到期 90 天
    3        // 年贴现率 3%
  );
  await token.waitForDeployment();
  console.log("合约地址:", await token.getAddress());

  // 推进 1 秒，使剩余天数按 89 天计（与 Remix 中显示的 992685 一致）
  await network.provider.send("evm_increaseTime", [1]);
  await network.provider.send("evm_mine");

  const info = await token.getReceivableInfo();
  console.log("付款方:", info.debtor);
  console.log("票面价值:", info.faceValue.toString());
  console.log("年贴现率:", info.annualDiscountRate.toString());
  console.log("当前贴现价值:", info.currentDiscountedValue.toString());

  // 转让：A -> B 60 万枚，A -> C 30 万枚
  await (await token.transfer(B.address, ethers.parseUnits("600000", 18))).wait();
  await (await token.transfer(C.address, ethers.parseUnits("300000", 18))).wait();
  console.log("转让后 A / B / C 持有:", (await token.balanceOf(A.address)).toString(),
    "/", (await token.balanceOf(B.address)).toString(),
    "/", (await token.balanceOf(C.address)).toString());

  // 未到期赎回被拦截
  try {
    await (await token.connect(B).redeem(ethers.parseUnits("600000", 18))).wait();
    console.log("未到期赎回：未按预期报错");
  } catch (e) {
    console.log("未到期赎回被拦截:", reason(e));
  }

  // 时间快进 90 天（模拟到期）
  await network.provider.send("evm_increaseTime", [90 * 24 * 3600 + 1]);
  await network.provider.send("evm_mine");
  console.log("到期后贴现价值:", (await token.getCurrentDiscountedValue()).toString());

  // 付款方注资 10 ETH（相当于只支付票面 10%）
  await (await token.connect(D).fundRedemption({ value: ethers.parseEther("10") })).wait();
  console.log("注资后 redemptionPool:", (await token.redemptionPool()).toString());

  // 按份额赎回
  let before = await token.redemptionPool();
  await (await token.connect(B).redeem(ethers.parseUnits("600000", 18))).wait();
  let after = await token.redemptionPool();
  console.log("B 赎回 60 万枚，获得:", (before - after).toString(), " 池子剩余:", after.toString());

  before = after;
  await (await token.connect(C).redeem(ethers.parseUnits("300000", 18))).wait();
  after = await token.redemptionPool();
  console.log("C 赎回 30 万枚，获得:", (before - after).toString(), " 池子剩余:", after.toString());

  before = after;
  await (await token.connect(A).redeem(ethers.parseUnits("100000", 18))).wait();
  after = await token.redemptionPool();
  console.log("A 赎回 10 万枚，获得:", (before - after).toString(), " 池子剩余:", after.toString());

  const finalInfo = await token.getReceivableInfo();
  console.log("赎回完成后 totalSupply:", (await token.totalSupply()).toString());
  console.log("isRedeemed:", finalInfo.isRedeemed, " 池子余额:", finalInfo.poolBalance.toString());
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { run };
