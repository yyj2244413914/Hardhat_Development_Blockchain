// 实验二：ERC20 代币发行
const { ethers } = require("hardhat");

async function run() {
  console.log("\n========== 实验二：ERC20 代币发行 ==========");
  const [A, B, C] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("FinanceToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  console.log("部署账户(发行方):", A.address);
  console.log("合约地址:", await token.getAddress());

  // 代币基本信息
  console.log("name:", await token.name());
  console.log("symbol:", await token.symbol());
  console.log("decimals:", (await token.decimals()).toString());
  console.log("totalSupply:", (await token.totalSupply()).toString());
  console.log("totalSupplyInTokens:", (await token.totalSupplyInTokens()).toString());

  // 转账：A -> B 5 万枚，A -> C 3 万枚
  await (await token.transfer(B.address, ethers.parseUnits("50000", 18))).wait();
  await (await token.transfer(C.address, ethers.parseUnits("30000", 18))).wait();
  console.log("转账后 A 的余额:", (await token.balanceOf(A.address)).toString());
  console.log("转账后 B 的余额:", (await token.balanceOf(B.address)).toString());
  console.log("转账后 C 的余额:", (await token.balanceOf(C.address)).toString());

  // 授权与代扣：B 授权 C 1 万枚，C 代扣 5000 枚
  await (await token.connect(B).approve(C.address, ethers.parseUnits("10000", 18))).wait();
  console.log("approve 后 allowance(B -> C):", (await token.allowance(B.address, C.address)).toString());
  await (await token.connect(C).transferFrom(B.address, A.address, ethers.parseUnits("5000", 18))).wait();
  console.log("代扣 5000 枚后 allowance(B -> C):", (await token.allowance(B.address, C.address)).toString());

  // 增发与销毁
  await (await token.mint(A.address, ethers.parseUnits("500000", 18))).wait();
  console.log("增发 50 万枚后 totalSupplyInTokens:", (await token.totalSupplyInTokens()).toString());
  await (await token.burn(ethers.parseUnits("100000", 18))).wait();
  console.log("销毁 10 万枚后 totalSupplyInTokens:", (await token.totalSupplyInTokens()).toString());

  // 非 owner 增发被拦截
  try {
    await (await token.connect(B).mint(B.address, 1n)).wait();
    console.log("非 owner 增发：未按预期报错");
  } catch (e) {
    console.log("账户 B 调用 mint 被拦截（OwnableUnauthorizedAccount）");
  }
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { run };
