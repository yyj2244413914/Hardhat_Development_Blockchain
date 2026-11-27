// 实验一：区块链基础操作与简易银行合约
const { ethers } = require("hardhat");

function reason(e) {
  const m = (e.message || "").match(/reverted with (?:reason string )?'([^']+)'/);
  return m ? m[1] : (e.shortMessage || e.message || "").slice(0, 80);
}

async function run() {
  console.log("\n========== 实验一：简易银行合约 ==========");
  const [A, B] = await ethers.getSigners();

  const Bank = await ethers.getContractFactory("SimpleBank");
  const bank = await Bank.deploy();
  await bank.waitForDeployment();
  console.log("部署账户:", A.address);
  console.log("合约地址:", await bank.getAddress());

  // 账户 A 存 10 ETH
  let tx = await bank.connect(A).deposit({ value: ethers.parseEther("10") });
  await tx.wait();
  console.log("账户 A 存入 10 ETH，交易哈希:", tx.hash);
  console.log("A 的存款余额(getMyBalance):", (await bank.connect(A).getMyBalance()).toString());

  // 账户 B 存 5 ETH
  await (await bank.connect(B).deposit({ value: ethers.parseEther("5") })).wait();
  console.log("账户 B 存入 5 ETH");
  console.log("B 的存款余额(getMyBalance):", (await bank.connect(B).getMyBalance()).toString());
  console.log("银行总余额(getBankBalance):", (await bank.getBankBalance()).toString());

  // 账户 A 取 3 ETH
  await (await bank.connect(A).withdraw(ethers.parseEther("3"))).wait();
  console.log("账户 A 取出 3 ETH，剩余:", (await bank.connect(A).getMyBalance()).toString());

  // 超额取款被拦截
  try {
    await (await bank.connect(A).withdraw(ethers.parseEther("20"))).wait();
    console.log("超额取款：未按预期报错");
  } catch (e) {
    console.log("超额取款 20 ETH 被拦截:", reason(e));
  }

  console.log("累计交易笔数(totalTransactions):", (await bank.totalTransactions()).toString());
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { run };
